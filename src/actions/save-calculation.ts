'use server'

import { calculateROI, calculateVisibilitySavingsSimple } from '@/lib/calculations'
import { CalculationInputs, VisibilitySimpleInputs } from '@/lib/types'
import { sanitizeError, safeLogError } from '@/lib/security'
import { formatMoney, formatInt } from '@/lib/format'
import OpenAI from 'openai'
import sgMail from '@sendgrid/mail'

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

export async function saveCalculation(payload: {
  email: string
  company: string
  simpleInputs?: VisibilitySimpleInputs
  inputs?: CalculationInputs
}) {
  try {
    const { email, company, simpleInputs, inputs } = payload

    // Validate required environment variables
    if (!process.env.SENDGRID_API_KEY) {
      console.error('SENDGRID_API_KEY is not configured')
      return { success: false, error: 'Email service is not configured. Please contact support.' }
    }

    if (!process.env.FROM_EMAIL) {
      console.error('FROM_EMAIL is not configured')
      return { success: false, error: 'Email sender is not configured. Please contact support.' }
    }

    // Use simple calculator if provided, otherwise fall back to advanced
    if (simpleInputs) {
      const results = calculateVisibilitySavingsSimple(simpleInputs)
      
      // Save to HubSpot (non-blocking)
      try {
        await saveToHubSpotSimple(email, company, simpleInputs, results)
      } catch (hubspotError: any) {
        safeLogError('saveCalculation-HubSpot', hubspotError)
      }

      // Generate business case
      const businessCase = await generateBusinessCaseSimple(company, simpleInputs, results)

      // Send email
      await sendReportEmailSimple(email, company, results, businessCase)

      return { success: true }
    } else if (inputs) {
      // Legacy advanced model
      const results = calculateROI(inputs)

      // Save to HubSpot (non-blocking)
      try {
        await saveToHubSpot(email, company, inputs, results)
      } catch (hubspotError: any) {
        safeLogError('saveCalculation-HubSpot', hubspotError)
      }

      // Generate business case
      const businessCase = await generateBusinessCase(results)

      // Send email
      await sendReportEmail(email, company, results, businessCase)

      return { success: true }
    } else {
      return { success: false, error: 'No calculation inputs provided' }
    }
  } catch (error: any) {
    safeLogError('saveCalculation', error)
    
    let errorMessage = 'Failed to send report. Please try again.'
    
    if (error?.response?.body?.errors) {
      const sendGridError = error.response.body.errors[0]
      errorMessage = `Email error: ${sanitizeError(sendGridError.message || sendGridError)}`
    } else if (error?.message) {
      errorMessage = `Error: ${sanitizeError(error.message)}`
    }
    
    return { success: false, error: errorMessage }
  }
}

async function generateBusinessCaseSimple(
  company: string,
  inputs: VisibilitySimpleInputs,
  results: any
): Promise<string> {
  if (!openai) return 'Business case generation is not available at this time.'

  const prompt = `Write a concise executive summary about returnable asset visibility savings for ${company}.
Use these inputs:
- Containers lost per month: ${inputs.lostContainersPerMonth}
- Replacement cost: $${inputs.replacementCost}
- Assets not moving 10+ days: ${inputs.nonMovingAssets10Plus}
- Cycle counts per month: ${inputs.cycleCountsPerMonth}
- Hours per cycle count: ${inputs.hoursPerCycleCount}
- Associates doing cycle counts: ${inputs.cycleCountAssociates}
- Hours spent searching per month: ${inputs.hoursSearchingPerMonth}
- Material handling associates: ${inputs.materialHandlingAssociates}
- Hourly rate: $${inputs.hourlyRate}

Computed savings:
- Lost container savings: ${formatMoney(results.lostContainerSavingsYearly)} per year
- Time savings value: ${formatMoney(results.timeSavingsYearly)} per year
- Non-moving container cost: ${formatMoney(results.nonMovingCostYearly)} per year
- Manpower efficiency gains: ${formatMoney(results.manpowerEfficiencyYearly)} per year
- Overall savings: ${formatMoney(results.overallYearlySavings)} per year

Explain what these represent and why improved visibility reduces loss, idle assets, and manual work. Keep it under 250 words. When referring to the company providing this analysis, use "Antares Vision Group" (not "Nytro Marketing" or any other company name).`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
    })

    return completion.choices?.[0]?.message?.content ?? 'Business case generated successfully.'
  } catch (error) {
    safeLogError('generateBusinessCaseSimple', error)
    return 'Unable to generate business case at this time.'
  }
}

async function generateBusinessCase(results: any): Promise<string> {
  try {
    if (!openai) {
      console.warn('OpenAI API key not configured, skipping business case generation')
      return 'Business case generation is not available at this time.'
    }

    // Handle Infinity payback period safely
    const paybackText = results.paybackPeriodYears === Infinity 
      ? 'No payback (investment never recovers)' 
      : `${results.paybackPeriodYears.toFixed(1)} years`
    
    const prompt = `Generate a compelling executive summary for a returnable asset visibility ROI analysis comparing baseline (today) vs. with visibility (future state). Key metrics:

Baseline (Today) Annual Loss: $${results.baselineTotalLoss.toLocaleString()}
- Shrink Cost: $${results.annualShrinkCost.toLocaleString()}
- Dwell Time Cost (working capital): $${results.dwellCostToday.toLocaleString()}
- Excess Fleet Cost: $${results.excessInventoryCost.toLocaleString()}
- Manual Process Cost: $${results.annualManualProcessCost.toLocaleString()}

With Visibility (Future) Annual Loss: $${results.futureTotalLoss.toLocaleString()}
- Shrink Cost: $${results.annualShrinkCostAfter.toLocaleString()}
- Dwell Time Cost (working capital): $${results.dwellCostAfter.toLocaleString()}
- Excess Fleet Cost: $${results.excessInventoryCostAfter.toLocaleString()}
- Manual Process Cost: $${results.annualManualProcessCostAfter.toLocaleString()}

Savings:
- Annual Savings: $${results.annualSavings.toLocaleString()}
- Net Annual Savings: $${results.netAnnualSavings.toLocaleString()}
- Payback Period: ${paybackText}
- 3-Year ROI: ${results.threeYearROI.toFixed(0)}%

Focus on the financial impact of improved visibility and tracking, emphasizing how visibility reduces shrink, improves cycle time (reducing dwell time working capital), optimizes fleet size, and automates manual processes. Make it persuasive and highlight the business benefits. Keep it under 300 words. When referring to the company providing this analysis, use "Antares Vision Group" (not "Nytro Marketing" or any other company name).`

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
    })

    return completion.choices[0].message.content || 'Business case generated successfully.'
  } catch (error) {
    safeLogError('generateBusinessCase', error)
    return 'Unable to generate business case at this time.'
  }
}

async function sendReportEmail(
  email: string,
  company: string,
  results: any,
  businessCase: string
) {
  const fromEmail = process.env.FROM_EMAIL || 'reports@acsis.com'
  
  if (!process.env.SENDGRID_API_KEY) {
    throw new Error('SENDGRID_API_KEY is not configured')
  }

  // Format business case with proper line breaks
  const formattedBusinessCase = businessCase
    .split('\n')
    .filter(line => line.trim().length > 0)
    .map(line => line.trim())
    .join('<br><br>')

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ACSIS ROI Calculator Report</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; line-height: 1.6;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; text-align: center;">ACSIS ROI Calculator Report</h1>
            </td>
          </tr>
          
          <!-- Company Header -->
          <tr>
            <td style="padding: 30px 40px 20px 40px; background-color: #ffffff;">
              <h2 style="margin: 0; color: #333333; font-size: 22px; font-weight: 600; text-align: center; border-bottom: 2px solid #667eea; padding-bottom: 15px;">
                ${company}
              </h2>
              <p style="margin: 15px 0 0 0; color: #666666; font-size: 14px; text-align: center;">Returnable Asset Visibility Analysis</p>
            </td>
          </tr>
          
          <!-- Key Metrics Section -->
          <tr>
            <td style="padding: 30px 40px;">
              <h3 style="margin: 0 0 20px 0; color: #333333; font-size: 18px; font-weight: 600; border-left: 4px solid #667eea; padding-left: 15px;">Key Metrics</h3>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5;">
                    <strong style="color: #333333; font-size: 14px;">Baseline Annual Loss:</strong>
                    <span style="color: #ef4444; font-size: 14px; font-weight: 600; float: right;">$${results.baselineTotalLoss.toLocaleString()}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5;">
                    <strong style="color: #333333; font-size: 14px;">With Visibility Annual Loss:</strong>
                    <span style="color: #666666; font-size: 14px; font-weight: 600; float: right;">$${results.futureTotalLoss.toLocaleString()}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5;">
                    <strong style="color: #333333; font-size: 14px;">Annual Savings:</strong>
                    <span style="color: #22c55e; font-size: 14px; font-weight: 600; float: right;">$${results.annualSavings.toLocaleString()}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5;">
                    <strong style="color: #333333; font-size: 14px;">Net Annual Savings:</strong>
                    <span style="color: #22c55e; font-size: 14px; font-weight: 600; float: right;">$${results.netAnnualSavings.toLocaleString()}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5;">
                    <strong style="color: #333333; font-size: 14px;">Payback Period:</strong>
                    <span style="color: #666666; font-size: 14px; float: right;">${results.paybackPeriodYears === Infinity ? 'No payback (investment never recovers)' : `${results.paybackPeriodYears.toFixed(1)} years`}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5;">
                    <strong style="color: #333333; font-size: 14px;">3-Year ROI:</strong>
                    <span style="color: #666666; font-size: 14px; float: right;">${results.threeYearROI.toFixed(0)}%</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0;">
                    <strong style="color: #333333; font-size: 14px;">Baseline Loss Breakdown:</strong>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0 8px 20px; border-bottom: 1px solid #e5e5e5;">
                    <span style="color: #666666; font-size: 13px;">Shrink Cost: $${results.annualShrinkCost.toLocaleString()}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0 8px 20px; border-bottom: 1px solid #e5e5e5;">
                    <span style="color: #666666; font-size: 13px;">Dwell Time Cost: $${results.dwellCostToday.toLocaleString()}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0 8px 20px; border-bottom: 1px solid #e5e5e5;">
                    <span style="color: #666666; font-size: 13px;">Excess Fleet Cost: $${results.excessInventoryCost.toLocaleString()}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <span style="color: #666666; font-size: 13px;">Manual Process Cost: $${results.annualManualProcessCost.toLocaleString()}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Business Case Section -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb;">
              <h3 style="margin: 0 0 20px 0; color: #333333; font-size: 18px; font-weight: 600; border-left: 4px solid #667eea; padding-left: 15px;">Business Case</h3>
              <div style="color: #444444; font-size: 15px; line-height: 1.8; text-align: justify;">
                ${formattedBusinessCase}
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #ffffff; border-top: 1px solid #e5e5e5; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; color: #666666; font-size: 14px; text-align: center;">
                Thank you for using the <strong style="color: #667eea;">ACSIS ROI Calculator</strong>!
              </p>
            </td>
          </tr>
        </table>
        
        <!-- Footer Note -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; margin-top: 20px;">
          <tr>
            <td style="padding: 20px; text-align: center;">
              <p style="margin: 0; color: #999999; font-size: 12px;">
                This report was generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  const msg = {
    to: email,
    from: fromEmail,
    subject: `ACSIS ROI Report - ${company}`,
    html: htmlContent,
  }

  await sgMail.send(msg)
}

async function sendReportEmailSimple(
  email: string,
  company: string,
  results: any,
  businessCase: string
) {
  const fromEmail = process.env.FROM_EMAIL || 'reports@acsis.com'
  
  if (!process.env.SENDGRID_API_KEY) {
    throw new Error('SENDGRID_API_KEY is not configured')
  }

  // Format business case with proper line breaks
  const formattedBusinessCase = businessCase
    .split('\n')
    .filter(line => line.trim().length > 0)
    .map(line => line.trim())
    .join('<br><br>')

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Antares ROI Calculator Report</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; line-height: 1.6;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; text-align: center;">Antares ROI Calculator Report</h1>
            </td>
          </tr>
          
          <!-- Company Header -->
          <tr>
            <td style="padding: 30px 40px 20px 40px; background-color: #ffffff;">
              <h2 style="margin: 0; color: #333333; font-size: 22px; font-weight: 600; text-align: center; border-bottom: 2px solid #667eea; padding-bottom: 15px;">
                ${company}
              </h2>
              <p style="margin: 15px 0 0 0; color: #666666; font-size: 14px; text-align: center;">Returnable Asset Visibility Analysis</p>
            </td>
          </tr>
          
          <!-- Key Metrics Section -->
          <tr>
            <td style="padding: 30px 40px;">
              <h3 style="margin: 0 0 20px 0; color: #333333; font-size: 18px; font-weight: 600; border-left: 4px solid #667eea; padding-left: 15px;">Your Potential Savings</h3>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5;">
                    <strong style="color: #333333; font-size: 14px;">Lost Container Savings:</strong>
                    <span style="color: #22c55e; font-size: 14px; font-weight: 600; float: right;">${formatMoney(results.lostContainerSavingsYearly)} / year</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5;">
                    <strong style="color: #333333; font-size: 14px;">Time Savings Value:</strong>
                    <span style="color: #22c55e; font-size: 14px; font-weight: 600; float: right;">${formatMoney(results.timeSavingsYearly)} / year</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5;">
                    <strong style="color: #333333; font-size: 14px;">Non-Moving Container Cost:</strong>
                    <span style="color: #22c55e; font-size: 14px; font-weight: 600; float: right;">${formatMoney(results.nonMovingCostYearly)} / year</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e5e5;">
                    <strong style="color: #333333; font-size: 14px;">Manpower Efficiency Gains:</strong>
                    <span style="color: #22c55e; font-size: 14px; font-weight: 600; float: right;">${formatMoney(results.manpowerEfficiencyYearly)} / year</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0;">
                    <strong style="color: #333333; font-size: 16px;">Overall Savings:</strong>
                    <span style="color: #22c55e; font-size: 18px; font-weight: 700; float: right;">${formatMoney(results.overallYearlySavings)} / year</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Business Case Section -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb;">
              <h3 style="margin: 0 0 20px 0; color: #333333; font-size: 18px; font-weight: 600; border-left: 4px solid #667eea; padding-left: 15px;">Business Case</h3>
              <div style="color: #444444; font-size: 15px; line-height: 1.8; text-align: justify;">
                ${formattedBusinessCase}
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #ffffff; border-top: 1px solid #e5e5e5; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; color: #666666; font-size: 14px; text-align: center;">
                Thank you for using the <strong style="color: #667eea;">Antares ROI Calculator</strong>!
              </p>
            </td>
          </tr>
        </table>
        
        <!-- Footer Note -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width: 600px; margin-top: 20px;">
          <tr>
            <td style="padding: 20px; text-align: center;">
              <p style="margin: 0; color: #999999; font-size: 12px;">
                This report was generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  const msg = {
    to: email,
    from: fromEmail,
    subject: `Antares ROI Report - ${company}`,
    html: htmlContent,
  }

  await sgMail.send(msg)
}

const HUBSPOT_API_BASE = 'https://api.hubapi.com'

/**
 * Search for an existing contact by email in HubSpot
 */
async function findContactByEmail(apiKey: string, email: string): Promise<string | null> {
  try {
    const response = await fetch(
      `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/search`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filterGroups: [{
            filters: [{
              propertyName: 'email',
              operator: 'EQ',
              value: email,
            }]
          }],
          limit: 1,
        })
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      safeLogError('findContactByEmail', {
        message: 'Search failed',
        status: response.status,
        statusText: response.statusText,
      })
      return null
    }

    const data = await response.json()
    if (data.results && data.results.length > 0) {
      return data.results[0].id
    }
    return null
  } catch (error: any) {
    safeLogError('findContactByEmail', error)
    return null
  }
}

/**
 * Create a new contact in HubSpot
 */
async function createContact(apiKey: string, email: string, company?: string): Promise<string | null> {
  try {
    const properties: any = {
      email: email,
    }
    
    // Add company if provided
    if (company) {
      properties.company = company
    }

    const response = await fetch(
      `${HUBSPOT_API_BASE}/crm/v3/objects/contacts`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: properties
        })
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      safeLogError('createContact', {
        message: 'Create failed',
        status: response.status,
        statusText: response.statusText,
      })
      return null
    }

    const data = await response.json()
    return data.id || null
  } catch (error: any) {
    safeLogError('createContact', error)
    return null
  }
}

/**
 * Create or get a contact ID for the given email
 */
async function getOrCreateContact(apiKey: string, email: string, company?: string): Promise<string | null> {
  // First, try to find existing contact
  const existingContactId = await findContactByEmail(apiKey, email)
  if (existingContactId) {
    return existingContactId
  }

  // If not found, create a new contact
  return await createContact(apiKey, email, company)
}

/**
 * Create a note and associate it with a contact in HubSpot
 */
async function createNoteForContact(
  apiKey: string,
  contactId: string,
  noteContent: string
): Promise<boolean> {
  try {
    // First, create the note
    const noteResponse = await fetch(
      `${HUBSPOT_API_BASE}/crm/v3/objects/notes`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: {
            hs_note_body: noteContent,
            hs_timestamp: Date.now().toString(),
          },
        })
      }
    )

    if (!noteResponse.ok) {
      safeLogError('createNoteForContact', {
        message: 'Note creation failed',
        status: noteResponse.status,
        statusText: noteResponse.statusText,
      })
      return false
    }

    const noteData = await noteResponse.json()
    const noteId = noteData.id
    if (!noteId) {
      safeLogError('createNoteForContact', new Error('Note created but no ID returned'))
      return false
    }

    // Then, associate the note with the contact using the Notes association API
    // Use the HUBSPOT_DEFINED association label "note_to_contact" between a note and a contact
    try {
      const assocResponse = await fetch(
        `${HUBSPOT_API_BASE}/crm/v3/objects/notes/${noteId}/associations/contact/${contactId}/note_to_contact`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({})
        }
      )

      if (!assocResponse.ok) {
        // If association fails, log but don't fail completely - the note was created
        safeLogError('createNoteForContact-association', {
          message: 'Association failed',
          status: assocResponse.status,
        })
        // Note: The note was still created, so we return true
      }
    } catch (assocError: any) {
      // If association fails, log but don't fail completely - the note was created
      safeLogError('createNoteForContact-association', assocError)
      // Note: The note was still created, so we return true
    }

    return noteResponse.status === 201 || noteResponse.status === 200
  } catch (error: any) {
    safeLogError('createNoteForContact', error)
    return false
  }
}

async function saveToHubSpot(
  email: string,
  company: string,
  inputs: CalculationInputs,
  results: any
) {
  const apiKey = process.env.HUBSPOT_ACCESS_TOKEN

  if (!apiKey) {
    // No API key - silently skip (this is expected if not configured)
    return
  }

  try {
    // Get or create contact
    const contactId = await getOrCreateContact(apiKey, email, company)
    if (!contactId) {
      throw new Error('Failed to create or find contact in HubSpot')
    }

    // Format note content
    const noteContent = `Antares ROI Calculator - Visibility Analysis

Company: ${company}
Email: ${email}
Date: ${new Date().toLocaleString()}

Fleet and Flow:
- Monthly Volume: ${inputs.monthlyVolume}
- Returnable Unit Cost: $${inputs.returnableUnitCost.toLocaleString()}
- Current Fleet Size: ${inputs.currentFleetSize}

Baseline (Today) Loss Parameters:
- Shrink Rate: ${inputs.shrinkRate}%
- Cycle Time: ${inputs.averageCycleTime} days
- Excess Inventory: ${inputs.excessInventoryPercent}%
- Manual Process Cost: $${inputs.annualManualProcessCost.toLocaleString()}

With Visibility (Future) Parameters:
- Shrink Rate After: ${inputs.shrinkRateAfter}%
- Cycle Time After: ${inputs.cycleTimeAfter} days
- Manual Process Cost After: $${inputs.annualManualProcessCostAfter.toLocaleString()}

Program Costs:
- Implementation Cost: $${inputs.implementationCost.toLocaleString()}
- Annual Program Cost: $${inputs.annualProgramCost.toLocaleString()}
- Cost of Capital: ${(inputs.capitalCostRate * 100).toFixed(1)}%

Results:
- Baseline Annual Loss: $${results.baselineTotalLoss.toLocaleString()}
- Future Annual Loss: $${results.futureTotalLoss.toLocaleString()}
- Annual Savings: $${results.annualSavings.toLocaleString()}
- Net Annual Savings: $${results.netAnnualSavings.toLocaleString()}
- Payback Period: ${results.paybackPeriodYears === Infinity ? 'No payback' : `${results.paybackPeriodYears.toFixed(1)} years`}
- 3-Year ROI: ${results.threeYearROI.toFixed(0)}%

Loss Breakdown (Baseline):
- Shrink Cost: $${results.annualShrinkCost.toLocaleString()}
- Dwell Time Cost: $${results.dwellCostToday.toLocaleString()}
- Excess Fleet Cost: $${results.excessInventoryCost.toLocaleString()}
- Manual Process Cost: $${results.annualManualProcessCost.toLocaleString()}

Loss Breakdown (With Visibility):
- Shrink Cost: $${results.annualShrinkCostAfter.toLocaleString()}
- Dwell Time Cost: $${results.dwellCostAfter.toLocaleString()}
- Excess Fleet Cost: $${results.excessInventoryCostAfter.toLocaleString()}
- Manual Process Cost: $${results.annualManualProcessCostAfter.toLocaleString()}`

    // Create note and associate with contact
    const noteCreated = await createNoteForContact(apiKey, contactId, noteContent)
    if (!noteCreated) {
      throw new Error('Failed to create note in HubSpot')
    }

    // Success - no sensitive data logged
  } catch (error: any) {
    safeLogError('saveToHubSpot', error)
    // Re-throw to allow caller to handle, but don't block email sending
    throw error
  }
}

async function saveToHubSpotSimple(
  email: string,
  company: string,
  inputs: VisibilitySimpleInputs,
  results: any
) {
  const apiKey = process.env.HUBSPOT_ACCESS_TOKEN

  if (!apiKey) {
    return
  }

  try {
    const contactId = await getOrCreateContact(apiKey, email, company)
    if (!contactId) {
      throw new Error('Failed to create or find contact in HubSpot')
    }

    const noteContent = `Antares ROI Calculator - Simple Visibility Analysis

Company: ${company}
Email: ${email}
Date: ${new Date().toLocaleString()}

Input Parameters:
- Containers lost per month: ${inputs.lostContainersPerMonth}
- Replacement cost: $${inputs.replacementCost}
- Cycle counts per month: ${inputs.cycleCountsPerMonth}
- Hours per cycle count: ${inputs.hoursPerCycleCount}
- Cycle count associates: ${inputs.cycleCountAssociates}
- Assets not moving 10+ days: ${inputs.nonMovingAssets10Plus}
- Hours searching per month: ${inputs.hoursSearchingPerMonth}
- Material handling associates: ${inputs.materialHandlingAssociates}
- Hourly rate: $${inputs.hourlyRate}
- Capture rate: ${inputs.captureRatePercent ?? 100}%

Results:
- Lost container savings: ${formatMoney(results.lostContainerSavingsYearly)} / year
- Time savings value: ${formatMoney(results.timeSavingsYearly)} / year
- Non-moving container cost: ${formatMoney(results.nonMovingCostYearly)} / year
- Manpower efficiency gains: ${formatMoney(results.manpowerEfficiencyYearly)} / year
- Overall savings: ${formatMoney(results.overallYearlySavings)} / year`

    const noteCreated = await createNoteForContact(apiKey, contactId, noteContent)
    if (!noteCreated) {
      throw new Error('Failed to create note in HubSpot')
    }
  } catch (error: any) {
    safeLogError('saveToHubSpotSimple', error)
    throw error
  }
}
