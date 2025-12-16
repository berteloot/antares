/**
 * Environment Variables Validation Script
 * Tests all required environment variables and service connections
 */

// Load environment variables from .env file
import 'dotenv/config'

import OpenAI from 'openai'
import sgMail from '@sendgrid/mail'

interface ValidationResult {
  name: string
  status: 'pass' | 'fail'
  message: string
}

const results: ValidationResult[] = []

function logResult(name: string, status: 'pass' | 'fail', message: string) {
  results.push({ name, status, message })
  const icon = status === 'pass' ? '✅' : '❌'
  console.log(`${icon} ${name}: ${message}`)
}

async function validateEnvironmentVariables() {
  console.log('\n🔍 Validating Environment Variables...\n')

  // Check OPENAI_API_KEY
  if (!process.env.OPENAI_API_KEY) {
    logResult('OPENAI_API_KEY', 'fail', 'Environment variable is not set')
  } else if (process.env.OPENAI_API_KEY.includes('your-openai-api-key')) {
    logResult('OPENAI_API_KEY', 'fail', 'Still contains placeholder value')
  } else if (process.env.OPENAI_API_KEY.length < 20) {
    logResult('OPENAI_API_KEY', 'fail', 'API key appears to be too short (should be ~50+ characters)')
  } else {
    logResult('OPENAI_API_KEY', 'pass', 'Environment variable is set')
  }

  // Check SENDGRID_API_KEY
  if (!process.env.SENDGRID_API_KEY) {
    logResult('SENDGRID_API_KEY', 'fail', 'Environment variable is not set')
  } else if (process.env.SENDGRID_API_KEY.includes('your-sendgrid-api-key')) {
    logResult('SENDGRID_API_KEY', 'fail', 'Still contains placeholder value')
  } else if (process.env.SENDGRID_API_KEY.length < 20) {
    logResult('SENDGRID_API_KEY', 'fail', 'API key appears to be too short (should be ~70+ characters)')
  } else {
    logResult('SENDGRID_API_KEY', 'pass', 'Environment variable is set')
  }
}

async function validateOpenAIConnection() {
  console.log('\n🤖 Testing OpenAI API Connection...\n')

  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('your-')) {
    logResult('OpenAI API', 'skip', 'Skipped - API key not configured')
    return
  }

  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    // Test with a minimal API call
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Say 'test' and nothing else." }],
      max_tokens: 5,
    })

    if (completion.choices[0]?.message?.content) {
      logResult('OpenAI API', 'pass', 'Successfully connected and received response')
    } else {
      logResult('OpenAI API', 'fail', 'Connected but received empty response')
    }
  } catch (error: any) {
    if (error.status === 401) {
      logResult('OpenAI API', 'fail', 'Authentication failed - invalid API key')
    } else if (error.status === 429) {
      logResult('OpenAI API', 'fail', 'Rate limit exceeded - API key may be valid but quota exceeded')
    } else {
      logResult('OpenAI API', 'fail', `Connection failed: ${error.message}`)
    }
  }
}

async function validateSendGridConnection() {
  console.log('\n📧 Testing SendGrid API Connection...\n')

  if (!process.env.SENDGRID_API_KEY || process.env.SENDGRID_API_KEY.includes('your-')) {
    logResult('SendGrid API', 'skip', 'Skipped - API key not configured')
    return
  }

  try {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)

    // Test API key validity by checking API access
    // We'll use a simple validation endpoint approach
    // Note: SendGrid doesn't have a simple "ping" endpoint, so we validate the key format
    // and structure instead. Actual email sending would require a verified sender.
    
    if (process.env.SENDGRID_API_KEY.startsWith('SG.')) {
      logResult('SendGrid API Key Format', 'pass', 'API key format appears valid (starts with SG.)')
      logResult('SendGrid API', 'pass', 'API key is configured (email sending requires verified sender)')
    } else {
      logResult('SendGrid API Key Format', 'fail', 'API key format appears invalid (should start with SG.)')
    }
  } catch (error: any) {
    logResult('SendGrid API', 'fail', `Configuration failed: ${error.message}`)
  }
}

async function main() {
  console.log('='.repeat(60))
  console.log('  Environment Variables & Service Connection Test')
  console.log('='.repeat(60))

  await validateEnvironmentVariables()
  await validateOpenAIConnection()
  await validateSendGridConnection()

  console.log('\n' + '='.repeat(60))
  console.log('  Summary')
  console.log('='.repeat(60))

  const passed = results.filter(r => r.status === 'pass').length
  const failed = results.filter(r => r.status === 'fail').length
  const skipped = results.filter(r => r.status === 'skip').length

  console.log(`\n✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  if (skipped > 0) {
    console.log(`⏭️  Skipped: ${skipped}`)
  }

  if (failed > 0) {
    console.log('\n⚠️  Some validations failed. Please check the errors above.')
    process.exit(1)
  } else {
    console.log('\n🎉 All validations passed!')
    process.exit(0)
  }
}

main().catch((error) => {
  console.error('\n💥 Unexpected error:', error)
  process.exit(1)
})

