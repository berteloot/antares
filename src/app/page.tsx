"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, TooltipProps } from 'recharts'
import { calculateROI, generateChartData } from '@/lib/calculations'
import { CalculationInputs, CalculationResults } from '@/lib/types'
import { saveCalculation } from '@/actions/save-calculation'
import { Calculator, TrendingUp, DollarSign, Clock, Package, FileText } from 'lucide-react'

// Custom Tooltip component for currency formatting
const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-3 shadow-md">
        <div className="font-semibold text-sm mb-2 text-foreground">{label}</div>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 mb-1">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm font-medium text-foreground">{entry.name}:</span>
            <span className="text-sm font-semibold text-foreground">
              ${entry.value?.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

const defaultInputs: CalculationInputs = {
  monthlyVolume: 240,                 // Excel B3
  disposableUnitCost: 251.19,         // Excel G18 (disposable pallet cost each)
  returnableUnitCost: 835.00,         // Excel (returnable cost each)
  annualMaintCleaningBudget: 12000,   // Excel annual cleaning & shipping

  // Cycle-time mapping to match spreadsheet structure:
  // warehouse = onboard + fayetteville + US11 SS + US11 demand + production time
  warehouse: 62,                      // 2+14+18+14+14
  transit: 30,                        // transit
  customer: 20,                       // customer hold
  return: 0,
  cleaning: 0,
  buffer: 0,

  useTheoreticalFleet: false,         // Excel is effectively manual fleet
  manualFleetSize: 500,               // Excel D25
}

const CYCLE_MAX_DAYS = 180

export default function Home() {
  const [inputs, setInputs] = useState<CalculationInputs>(defaultInputs)
  const [results, setResults] = useState<CalculationResults | null>(null)
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')
  const [emailWarning, setEmailWarning] = useState('')

  const handleCalculate = () => {
    try {
      // Validate: manual fleet size is required when Assumed mode is selected
      if (!inputs.useTheoreticalFleet && (!inputs.manualFleetSize || inputs.manualFleetSize <= 0)) {
        alert('Please enter an Assumed Fleet Size when using Assumed mode.')
        return
      }
      
      console.log('Calculate button clicked, inputs:', inputs)
      const calcResults = calculateROI(inputs)
      console.log('Calculation results:', calcResults)
      setResults(calcResults)
      
      // Scroll to top to show the results/chart
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      console.error('Error calculating ROI:', error)
      alert('An error occurred while calculating ROI. Please check the console for details.')
    }
  }

  const handleInputChange = (field: keyof CalculationInputs, value: number | boolean) => {
    // Validate: prevent negative numbers for numeric fields
    if (typeof value === 'number' && value < 0) {
      return // Ignore negative values
    }
    setInputs(prev => ({ ...prev, [field]: value }))
  }

  const checkEmailType = (emailValue: string) => {
    if (!emailValue || !emailValue.includes('@')) {
      setEmailWarning('')
      return
    }

    const emailDomain = emailValue.split('@')[1]?.toLowerCase()
    if (!emailDomain) {
      setEmailWarning('')
      return
    }

    // List of personal email domains to check
    const personalEmailDomains = [
      'gmail.com',
      'yahoo.com',
      'hotmail.com',
      'outlook.com',
      'aol.com',
      'icloud.com',
      'mail.com',
      'protonmail.com',
      'berteloot.org', // Specific domain to block
    ]

    // Check if it's a personal email domain
    if (personalEmailDomains.includes(emailDomain)) {
      setEmailWarning('We recommend using your business email address to ensure you receive your ROI report.')
    } else {
      setEmailWarning('')
    }
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value
    setEmail(newEmail)
    checkEmailType(newEmail)
  }

  const handleSubmitReport = async () => {
    if (!email || !company || !results) return

    setIsSubmitting(true)
    setSubmitMessage('')

    try {
      const response = await saveCalculation(inputs, email, company)
      if (response.success) {
        setSubmitMessage('Report sent successfully!')
        setEmail('')
        setCompany('')
        setEmailWarning('')
      } else {
        // Show the actual error message from the server
        setSubmitMessage(response.error || 'Failed to send report. Please try again.')
        console.error('Report submission failed:', response.error)
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'An error occurred. Please try again.'
      setSubmitMessage(errorMessage)
      console.error('Error submitting report:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const chartData = results ? generateChartData(results) : []

  return (
    <main className="bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4 sm:top-6 shadow-lg border-primary/10 hover:shadow-xl transition-shadow">
              <CardHeader className="border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
                <CardTitle className="text-lg sm:text-xl font-semibold font-heading">Calculation Parameters</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <Tabs defaultValue="current" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-muted/50 h-10 sm:h-11">
                    <TabsTrigger value="current" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">
                      Current Spend
                    </TabsTrigger>
                    <TabsTrigger value="returnable" className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-medium">
                      Returnable
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="current" className="space-y-4 sm:space-y-5 mt-4 sm:mt-6">
                    <div className="space-y-2">
                      <label htmlFor="monthly-volume" className="text-xs sm:text-sm font-semibold text-foreground">
                        Monthly Pallets
                      </label>
                      <Input
                        id="monthly-volume"
                        type="number"
                        min={0}
                        value={inputs.monthlyVolume}
                        onChange={(e) => handleInputChange('monthlyVolume', Math.max(0, Number(e.target.value) || 0))}
                        placeholder="Enter monthly volume"
                        className="h-10 sm:h-11 border-border focus-visible:ring-2 focus-visible:ring-primary/30 text-sm sm:text-base"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="disposable-cost" className="text-xs sm:text-sm font-semibold text-foreground">
                        Disposable cost per pallet ($)
                      </label>
                      <Input
                        id="disposable-cost"
                        type="number"
                        min={0}
                        step="0.01"
                        value={inputs.disposableUnitCost}
                        onChange={(e) => handleInputChange('disposableUnitCost', Math.max(0, Number(e.target.value) || 0))}
                        placeholder="0.00"
                        className="h-10 sm:h-11 border-border focus-visible:ring-2 focus-visible:ring-primary/30 text-sm sm:text-base"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="returnable" className="space-y-4 sm:space-y-5 mt-4 sm:mt-6">
                    <div className="space-y-2">
                      <label htmlFor="returnable-cost" className="text-xs sm:text-sm font-semibold text-foreground">
                        Returnable cost per pallet ($)
                      </label>
                      <Input
                        id="returnable-cost"
                        type="number"
                        min={0}
                        step="0.01"
                        value={inputs.returnableUnitCost}
                        onChange={(e) => handleInputChange('returnableUnitCost', Math.max(0, Number(e.target.value) || 0))}
                        placeholder="0.00"
                        className="h-10 sm:h-11 border-border focus-visible:ring-2 focus-visible:ring-primary/30 text-sm sm:text-base"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="annual-maintenance" className="text-xs sm:text-sm font-semibold text-foreground">
                        Annual cleaning and shipping ($)
                      </label>
                      <Input
                        id="annual-maintenance"
                        type="number"
                        min={0}
                        value={inputs.annualMaintCleaningBudget}
                        onChange={(e) => handleInputChange('annualMaintCleaningBudget', Math.max(0, Number(e.target.value) || 0))}
                        placeholder="0"
                        className="h-10 sm:h-11 border-border focus-visible:ring-2 focus-visible:ring-primary/30 text-sm sm:text-base"
                      />
                    </div>

                    <div className="space-y-3 pt-2 border-t border-border">
                      <div className="space-y-2">
                        <label className="text-xs sm:text-sm font-semibold text-foreground block font-heading">Fleet Size</label>
                        <div className="flex items-center gap-2 sm:gap-3">
                          <button
                            type="button"
                            onClick={() => handleInputChange('useTheoreticalFleet', true)}
                            className={`flex-1 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-md transition-all ${
                              inputs.useTheoreticalFleet
                                ? 'text-white shadow-md'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                            style={inputs.useTheoreticalFleet ? {
                              background: 'linear-gradient(135deg, #2D69A7 0%, #009A93 100%)'
                            } : undefined}
                          >
                            Calculated
                          </button>
                          <button
                            type="button"
                            onClick={() => handleInputChange('useTheoreticalFleet', false)}
                            className={`flex-1 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-md transition-all ${
                              !inputs.useTheoreticalFleet
                                ? 'text-white shadow-md'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                            style={!inputs.useTheoreticalFleet ? {
                              background: 'linear-gradient(135deg, #2D69A7 0%, #009A93 100%)'
                            } : undefined}
                          >
                            Assumed
                          </button>
                        </div>
                      </div>
                      {inputs.useTheoreticalFleet ? (
                        <div className="space-y-2 p-3 rounded-md bg-muted/50 border border-border">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                            <span className="text-xs sm:text-sm font-semibold text-foreground">Calculated Fleet Size</span>
                            <span className="text-sm sm:text-base font-bold text-primary">
                              {results ? Math.ceil(results.theoreticalFleetNeeded) : 'Calculate to see'}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Based on cycle time and monthly volume
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <label htmlFor="manual-fleet-size" className="text-xs sm:text-sm font-semibold text-foreground">
                            Assumed Fleet Size (override)
                          </label>
                          <Input
                            id="manual-fleet-size"
                            type="number"
                            min={0}
                            value={inputs.manualFleetSize || ''}
                            onChange={(e) => handleInputChange('manualFleetSize', Math.max(0, Number(e.target.value) || 0))}
                            placeholder="Enter fleet size"
                            className="h-10 sm:h-11 border-border focus-visible:ring-2 focus-visible:ring-primary/30 text-sm sm:text-base"
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-4 sm:space-y-5 pt-2">
                      <div>
                        <label className="text-xs sm:text-sm font-semibold text-foreground mb-1 block font-heading">Cycle Time (Days)</label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Adjust each stage duration using the slider or input field
                        </p>
                      </div>
                      <div className="space-y-3 sm:space-y-4">
                        {[
                          { key: 'warehouse', label: 'Internal pipeline (on-hand + production)' },
                          { key: 'transit', label: 'Transit (outbound)' },
                          { key: 'customer', label: 'Customer hold' },
                          { key: 'return', label: 'Return transit' },
                          { key: 'cleaning', label: 'Cleaning / refurbishment' },
                          { key: 'buffer', label: 'Safety buffer' },
                        ].map(({ key, label }) => {
                          const value = inputs[key as keyof CalculationInputs] as number
                          return (
                            <div key={key} className="space-y-2 sm:space-y-3 p-3 sm:p-4 rounded-lg border border-border bg-card hover:bg-accent/30 transition-all hover:border-primary/30 hover:shadow-sm">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                                <label htmlFor={`${key}-input`} className="text-xs sm:text-sm font-semibold text-foreground">
                                  {label}
                                </label>
                                <div className="flex items-center gap-2 self-end sm:self-auto">
                                  <Input
                                    id={`${key}-input`}
                                    type="number"
                                    min={0}
                                    max={CYCLE_MAX_DAYS}
                                    step={1}
                                    value={value}
                                    onChange={(e) => {
                                      const newValue = Math.max(0, Math.min(CYCLE_MAX_DAYS, Number(e.target.value) || 0))
                                      handleInputChange(key as keyof CalculationInputs, newValue)
                                    }}
                                    className="w-18 sm:w-20 h-8 sm:h-9 text-center text-xs sm:text-sm font-semibold border-border focus-visible:ring-2 focus-visible:ring-primary/30"
                                  />
                                  <span className="text-xs text-muted-foreground w-10 sm:w-12">days</span>
                                </div>
                              </div>
                              <div className="space-y-1.5 sm:space-y-2">
                                <div className="relative py-1.5 sm:py-2">
                                  <Slider
                                    value={[value]}
                                    onValueChange={(vals) => handleInputChange(key as keyof CalculationInputs, vals[0])}
                                    max={CYCLE_MAX_DAYS}
                                    min={0}
                                    step={1}
                                    className="w-full"
                                  />
                                </div>
                                <div className="flex justify-between text-xs text-muted-foreground px-1">
                                  <span className="font-medium">0</span>
                                  <span className="font-medium">{CYCLE_MAX_DAYS}</span>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                <Button 
                  type="button"
                  onClick={handleCalculate}
                  disabled={!inputs.useTheoreticalFleet && (!inputs.manualFleetSize || inputs.manualFleetSize <= 0)}
                  className="w-full mt-4 sm:mt-6 h-11 sm:h-12 text-sm sm:text-base font-semibold shadow-md hover:shadow-lg transition-all text-white disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02]"
                  style={{
                    background: !inputs.useTheoreticalFleet && (!inputs.manualFleetSize || inputs.manualFleetSize <= 0)
                      ? undefined
                      : 'linear-gradient(135deg, #2D69A7 0%, #009A93 100%)'
                  }}
                >
                  Calculate ROI
                </Button>
                {!inputs.useTheoreticalFleet && (!inputs.manualFleetSize || inputs.manualFleetSize <= 0) && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-2 text-center">
                    Please enter an Assumed Fleet Size
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-4 sm:space-y-6">
            {/* Pre-calculation content - only show when results is null */}
            {!results && (
              <>
                {/* Value Proposition Section */}
                <Card className="bg-gradient-to-br from-primary/5 via-primary/3 to-background border-primary/20 shadow-lg hover:shadow-xl transition-shadow brand-pattern">
                  <CardContent className="pt-6 sm:pt-8 pb-6 sm:pb-8 px-4 sm:px-6">
                    <div className="text-center space-y-3 sm:space-y-4">
                      <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary/10 mb-3 sm:mb-4">
                        <Calculator className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-bold text-foreground font-heading">
                        Discover Your Packaging ROI Potential
                      </h2>
                      <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                        Make data-driven decisions about your supply chain investments. Our calculator compares disposable vs. returnable packaging to show you exactly how much you could save.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Preview Metrics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <Card className="border-l-4 border-l-primary/50 hover:border-l-primary transition-all hover:shadow-md">
                    <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className="p-2 sm:p-3 rounded-lg bg-primary/10 flex-shrink-0">
                          <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground mb-1 text-sm sm:text-base font-heading">Payback Period</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                            See how quickly your returnable packaging investment pays for itself
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-primary/50 hover:border-l-primary transition-all hover:shadow-md">
                    <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className="p-2 sm:p-3 rounded-lg bg-primary/10 flex-shrink-0">
                          <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground mb-1 text-sm sm:text-base font-heading">Annual Savings</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                            Calculate your potential annual cost savings with returnable packaging
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-primary/50 hover:border-l-primary transition-all hover:shadow-md">
                    <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className="p-2 sm:p-3 rounded-lg bg-primary/10 flex-shrink-0">
                          <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground mb-1 text-sm sm:text-base font-heading">Break-Even Analysis</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                            Understand when your investment reaches profitability
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-l-4 border-l-primary/50 hover:border-l-primary transition-all hover:shadow-md">
                    <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className="p-2 sm:p-3 rounded-lg bg-primary/10 flex-shrink-0">
                          <Package className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground mb-1 text-sm sm:text-base font-heading">Fleet Size Optimization</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                            Determine the optimal fleet size based on your cycle times
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* How It Works Section */}
                <Card className="shadow-md">
                  <CardHeader className="border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
                    <CardTitle className="text-lg sm:text-xl font-semibold font-heading">How It Works</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                      <div className="text-center space-y-2 sm:space-y-3">
                        <div className="inline-flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-primary text-primary-foreground font-bold text-base sm:text-lg antares-gradient">
                          1
                        </div>
                        <h4 className="font-semibold text-foreground text-sm sm:text-base font-heading">Enter Your Data</h4>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed px-2">
                          Input your current spend, returnable costs, and cycle times
                        </p>
                      </div>
                      <div className="text-center space-y-2 sm:space-y-3">
                        <div className="inline-flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-primary text-primary-foreground font-bold text-base sm:text-lg antares-gradient">
                          2
                        </div>
                        <h4 className="font-semibold text-foreground text-sm sm:text-base font-heading">Calculate ROI</h4>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed px-2">
                          Click the button to see your personalized ROI analysis
                        </p>
                      </div>
                      <div className="text-center space-y-2 sm:space-y-3">
                        <div className="inline-flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-primary text-primary-foreground font-bold text-base sm:text-lg antares-gradient">
                          3
                        </div>
                        <h4 className="font-semibold text-foreground text-sm sm:text-base font-heading">Get Insights</h4>
                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed px-2">
                          Review detailed metrics, charts, and generate a business case report
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Warning for negative savings */}
            {results && results.grossAnnualSavings <= 0 && (
              <Card className="border-l-4 border-l-red-500 bg-red-50 dark:bg-red-950/20 shadow-md">
                <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6 pb-4 sm:pb-6">
                  <div className="flex items-start gap-3">
                    <div className="text-red-600 dark:text-red-400 text-lg sm:text-xl flex-shrink-0">⚠️</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-red-900 dark:text-red-100 mb-1">
                        This investment never pays back under these inputs.
                      </p>
                      <p className="text-xs text-red-700 dark:text-red-200 leading-relaxed">
                        Annual operating costs exceed or equal disposable costs. Consider adjusting your inputs.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            {/* KPIs */}
            {results && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                <Card className="border-l-4 border-l-[#2D69A7] shadow-md hover:shadow-lg transition-shadow hover:border-l-[#F39313]">
                  <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
                    <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Payback Period
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                    <div className="text-2xl sm:text-3xl font-bold text-foreground font-heading break-words">
                      {results.paybackPeriodYears === Infinity
                        ? <span className="text-lg sm:text-2xl">No Payback</span>
                        : results.paybackPeriodYears === 0
                        ? 'Immediate'
                        : `${results.paybackPeriodYears.toFixed(1)} years`}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-[#009A93] shadow-md hover:shadow-lg transition-shadow hover:border-l-[#F39313]">
                  <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
                    <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Break-Even Year
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                    <div className="text-2xl sm:text-3xl font-bold text-foreground font-heading">
                      {results.breakEvenYear === null
                        ? <span className="text-lg sm:text-2xl">Beyond 10 Years</span>
                        : results.breakEvenYear === 0
                        ? 'Year 0'
                        : `Year ${results.breakEvenYear}`}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-[#F39313] shadow-md hover:shadow-lg transition-shadow hover:border-l-[#E30613]">
                  <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
                    <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Annual Savings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                    <div className="text-2xl sm:text-3xl font-bold text-foreground font-heading">
                      ${results.grossAnnualSavings.toLocaleString()}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-[#E30613] shadow-md hover:shadow-lg transition-shadow hover:border-l-[#F39313]">
                  <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
                    <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      Fleet Size
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                    <div className="text-2xl sm:text-3xl font-bold text-foreground font-heading">
                      {Math.ceil(results.requiredFleetSize)} <span className="text-base sm:text-lg font-normal text-muted-foreground">units</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Generate Business Report CTA - Prominent placement after KPIs */}
            {results && (
              <Card className="bg-gradient-to-br from-[#2D69A7]/10 via-[#009A93]/5 to-[#F39313]/5 border-2 border-[#2D69A7]/30 shadow-lg hover:shadow-xl transition-all relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#F39313]/20 to-transparent rounded-full blur-3xl -mr-16 -mt-16"></div>
                <CardContent className="pt-6 sm:pt-8 pb-6 sm:pb-8 px-4 sm:px-6 relative z-10">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
                    <div className="flex-1 text-center sm:text-left">
                      <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-[#2D69A7] to-[#009A93] mb-3 sm:mb-4 shadow-md">
                        <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                      </div>
                      <h3 className="text-lg sm:text-xl font-bold text-foreground mb-2 font-heading">
                        Ready to Share Your ROI Analysis?
                      </h3>
                      <p className="text-sm sm:text-base text-muted-foreground">
                        Generate a comprehensive business case report with your calculations to share with your team or stakeholders.
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            size="lg" 
                            className="h-12 sm:h-14 px-6 sm:px-10 text-sm sm:text-base font-bold shadow-lg hover:shadow-xl transition-all text-white hover:opacity-90 w-full sm:w-auto hover:scale-105"
                            style={{
                              background: '#009A93'
                            }}
                          >
                            <FileText className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                            Generate Business Report
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md mx-4">
                          <DialogHeader>
                            <DialogTitle className="text-lg sm:text-xl font-semibold font-heading">Generate Business Case Report</DialogTitle>
                            <DialogDescription className="text-sm">
                              Enter your professional business email and company name to receive a detailed business case report with your ROI calculations.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 sm:space-y-5">
                            <div className="space-y-2">
                              <label className="text-xs sm:text-sm font-semibold text-foreground">
                                Business Email <span className="text-muted-foreground font-normal">(required)</span>
                              </label>
                              <Input
                                type="email"
                                value={email}
                                onChange={handleEmailChange}
                                placeholder="your.name@company.com"
                                className="h-10 sm:h-11 border-border focus-visible:ring-2 focus-visible:ring-primary/30 text-sm sm:text-base"
                              />
                              {emailWarning && (
                                <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                                  <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
                                    {emailWarning}
                                  </p>
                                </div>
                              )}
                              <p className="text-xs text-muted-foreground">
                                Please use your professional business email address to receive your ROI report.
                              </p>
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs sm:text-sm font-semibold text-foreground">Company</label>
                              <Input
                                value={company}
                                onChange={(e) => setCompany(e.target.value)}
                                placeholder="Company Name"
                                className="h-10 sm:h-11 border-border focus-visible:ring-2 focus-visible:ring-primary/30 text-sm sm:text-base"
                              />
                            </div>
                            {submitMessage && (
                              <p className={`text-xs sm:text-sm ${submitMessage.includes('success') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                {submitMessage}
                              </p>
                            )}
                            <Button
                              className="w-full h-10 sm:h-11 text-sm sm:text-base font-semibold shadow-md hover:shadow-lg transition-all text-white hover:scale-[1.02]"
                              style={{
                                background: 'linear-gradient(135deg, #2D69A7 0%, #009A93 100%)'
                              }}
                              onClick={handleSubmitReport}
                              disabled={isSubmitting || !email || !company}
                            >
                              {isSubmitting ? 'Sending...' : 'Send Report'}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Chart */}
            {results && (
              <Card className="shadow-md">
                <CardHeader className="border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
                  <CardTitle className="text-lg sm:text-xl font-semibold font-heading px-4 sm:px-6">
                    Cumulative Cost Comparison: Disposable vs Returnable (3 Years)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 sm:pt-6 px-2 sm:px-6">
                  <div className="w-full" style={{ height: 'min(350px, 50vh)' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis 
                        dataKey="year" 
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Line 
                        type="monotone" 
                        dataKey="disposable" 
                        stroke="hsl(0 84.2% 60.2%)" 
                        strokeWidth={2.5}
                        name="Disposable" 
                        dot={{ fill: 'hsl(0 84.2% 60.2%)', r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="returnable" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2.5}
                        name="Returnable" 
                        dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
