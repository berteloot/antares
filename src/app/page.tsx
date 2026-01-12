"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { calculateVisibilitySavingsSimple, calculateROI } from "@/lib/calculations"
import { VisibilitySimpleInputs, CalculationInputs } from "@/lib/types"
import { saveCalculation } from "@/actions/save-calculation"
import { formatMoney, formatInt } from "@/lib/format"

// Preset configurations
const presets = {
  typical: {
    lostContainersPerMonth: 25,
    replacementCost: 350,
    cycleCountsPerMonth: 4,
    hoursPerCycleCount: 8,
    cycleCountAssociates: 2,
    nonMovingAssets10Plus: 15,
    hoursSearchingPerMonth: 20,
    materialHandlingAssociates: 2,
    hourlyRate: 28,
    captureRatePercent: 75,
    effectiveWriteOffRate: 30,
    timeReductionPercent: 50,
  },
  conservative: {
    lostContainersPerMonth: 10,
    replacementCost: 250,
    cycleCountsPerMonth: 2,
    hoursPerCycleCount: 6,
    cycleCountAssociates: 1,
    nonMovingAssets10Plus: 5,
    hoursSearchingPerMonth: 10,
    materialHandlingAssociates: 1,
    hourlyRate: 25,
    captureRatePercent: 50,
    effectiveWriteOffRate: 20,
    timeReductionPercent: 30,
  },
  aggressive: {
    lostContainersPerMonth: 50,
    replacementCost: 500,
    cycleCountsPerMonth: 8,
    hoursPerCycleCount: 12,
    cycleCountAssociates: 3,
    nonMovingAssets10Plus: 30,
    hoursSearchingPerMonth: 40,
    materialHandlingAssociates: 3,
    hourlyRate: 35,
    captureRatePercent: 90,
    effectiveWriteOffRate: 50,
    timeReductionPercent: 70,
  },
}

const defaultSimple: VisibilitySimpleInputs = presets.typical

// Optional: keep your old model as Advanced (pre-filled)
const defaultAdvanced: CalculationInputs = {
  monthlyVolume: 240,
  returnableUnitCost: 835,
  currentFleetSize: 500,
  shrinkRate: 5,
  averageCycleTime: 112,
  excessInventoryPercent: 15,
  annualManualProcessCost: 45000,
  shrinkRateAfter: 0.5,
  cycleTimeAfter: 84,
  annualManualProcessCostAfter: 9000,
  implementationCost: 25000,
  annualProgramCost: 50000,
  capitalCostRate: 0.08,
}

export default function Home() {
  const [simple, setSimple] = useState<VisibilitySimpleInputs>(defaultSimple)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showOverallSavings, setShowOverallSavings] = useState(false)

  // Advanced report dialog inputs
  const [email, setEmail] = useState("")
  const [company, setCompany] = useState("")
  const [sending, setSending] = useState(false)
  const [reportSent, setReportSent] = useState(false)

  const results = useMemo(() => calculateVisibilitySavingsSimple(simple), [simple])

  const advancedResults = useMemo(() => {
    if (!showAdvanced) return null
    return calculateROI(defaultAdvanced)
  }, [showAdvanced])

  const update = (key: keyof VisibilitySimpleInputs, value: number) => {
    setSimple((prev) => ({ ...prev, [key]: value }))
  }

  const applyPreset = (preset: keyof typeof presets) => {
    setSimple(presets[preset])
    setShowOverallSavings(false) // Reset when changing presets
  }

  const onSendReport = async () => {
    setSending(true)
    setReportSent(false)
    try {
      const result = await saveCalculation({
        email,
        company,
        simpleInputs: simple,
      } as any)
      if (result?.success) {
        setReportSent(true)
        setEmail("")
        setCompany("")
        // Reset success message after 5 seconds
        setTimeout(() => setReportSent(false), 5000)
      }
    } catch (error) {
      console.error("Failed to send report:", error)
    } finally {
      setSending(false)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold">The Economics of Returnable Asset Visibility</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Find out the real financial impact of tracking, managing, and controlling returnable assets across the supply chain. This calculator helps you quantify losses from shrink, extended dwell time, excess inventory, and manual processes - so you can clearly see how improved visibility drives cost savings, working capital efficiency, and measurable ROI.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* LEFT: sliders */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Container Loss</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <SliderRow
                  label="Estimated number of containers lost each month"
                  value={simple.lostContainersPerMonth}
                  min={0}
                  max={10000}
                  step={10}
                  onChange={(v) => update("lostContainersPerMonth", v)}
                />
                <SliderRow
                  label="Estimated average replacement cost of containers"
                  value={simple.replacementCost}
                  min={1}
                  max={5000}
                  step={1}
                  prefix="$"
                  onChange={(v) => update("replacementCost", v)}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Process Efficiency</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <SliderRow
                  label="Estimated number of cycle counts performed every month"
                  value={simple.cycleCountsPerMonth}
                  min={0}
                  max={15}
                  step={1}
                  onChange={(v) => update("cycleCountsPerMonth", v)}
                />
                <SliderRow
                  label="Estimated average time to perform cycle count every month"
                  value={simple.hoursPerCycleCount}
                  min={0}
                  max={15}
                  step={1}
                  suffix=" hours"
                  onChange={(v) => update("hoursPerCycleCount", v)}
                />
                <SliderRow
                  label="Estimated number of associates performing cycle count"
                  value={simple.cycleCountAssociates}
                  min={0}
                  max={5}
                  step={1}
                  onChange={(v) => update("cycleCountAssociates", v)}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Fleet Velocity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <SliderRow
                  label="Estimated number of assets not moving 10+ days"
                  value={simple.nonMovingAssets10Plus}
                  min={0}
                  max={150}
                  step={1}
                  onChange={(v) => update("nonMovingAssets10Plus", v)}
                />
                <p className="text-xs text-muted-foreground">
                  Represents value tied up/unavailable due to extended dwell time. These assets may be recoverable, but represent working capital that's effectively unavailable.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Material Handling Efficiency</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <SliderRow
                  label="Estimated amount of time looking for assets every month"
                  value={simple.hoursSearchingPerMonth}
                  min={0}
                  max={150}
                  step={1}
                  suffix=" hours"
                  onChange={(v) => update("hoursSearchingPerMonth", v)}
                />
                <SliderRow
                  label="Estimated number of material handling associates"
                  value={simple.materialHandlingAssociates}
                  min={0}
                  max={15}
                  step={1}
                  onChange={(v) => update("materialHandlingAssociates", v)}
                />
                <SliderRow
                  label="Estimated average hourly rate for workers"
                  value={simple.hourlyRate}
                  min={1}
                  max={50}
                  step={1}
                  prefix="$"
                  onChange={(v) => update("hourlyRate", v)}
                />

                {/* Presets */}
                <div className="pt-2 space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground">Quick presets</div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => applyPreset("conservative")}>
                      Conservative
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => applyPreset("typical")}>
                      Typical
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => applyPreset("aggressive")}>
                      Aggressive
                    </Button>
                  </div>
                </div>

                {/* Optional conservative knob, keep at bottom */}
                <div className="pt-2">
                  <Button variant="outline" onClick={() => setShowAdvanced((s) => !s)}>
                    {showAdvanced ? "Hide Advanced" : "Show Advanced"}
                  </Button>
                </div>

                {showAdvanced && (
                  <div className="mt-4 rounded-lg border p-4 space-y-4">
                    <div className="text-sm font-semibold">Advanced assumptions</div>
                    <SliderRow
                      label="Savings capture rate (conservative factor)"
                      value={simple.captureRatePercent ?? 100}
                      min={0}
                      max={100}
                      step={5}
                      suffix="%"
                      onChange={(v) => update("captureRatePercent", v)}
                    />
                    <SliderRow
                      label="Effective write-off rate for non-moving assets"
                      value={simple.effectiveWriteOffRate ?? 100}
                      min={0}
                      max={100}
                      step={5}
                      suffix="%"
                      onChange={(v) => update("effectiveWriteOffRate", v)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Percentage of non-moving assets treated as effectively lost/unavailable. Lower values reflect that some assets may be recoverable.
                    </p>
                    <SliderRow
                      label="Time reduction from visibility"
                      value={simple.timeReductionPercent ?? 100}
                      min={0}
                      max={100}
                      step={5}
                      suffix="%"
                      onChange={(v) => update("timeReductionPercent", v)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Percentage of cycle count and search time that becomes avoidable savings. Some operations may still require periodic counts.
                    </p>

                    {/* Optional: show your legacy ROI model summary here */}
                    {advancedResults && (
                      <div className="text-xs text-muted-foreground pt-2 border-t">
                        Legacy model (optional): total annual losses {formatMoney(advancedResults.baselineTotalLoss)}, payback{" "}
                        {advancedResults.paybackPeriodYears === Infinity ? "N/A" : `${advancedResults.paybackPeriodYears.toFixed(1)} years`}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: savings panel */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Your Potential Savings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <SavingsRow label="Lost container savings" monthly={results.lostContainerSavingsMonthly} yearly={results.lostContainerSavingsYearly} />
                <SavingsRow label="Time savings value" monthly={results.timeSavingsMonthly} yearly={results.timeSavingsYearly} />
                <SavingsRow label="Current cost of non-moving containers" monthly={results.nonMovingCostMonthly} yearly={results.nonMovingCostYearly} />
                <SavingsRow label="Potential manpower efficiency gains" monthly={results.manpowerEfficiencyMonthly} yearly={results.manpowerEfficiencyYearly} />

                {showOverallSavings ? (
                  <div className="pt-3 border-t">
                    <div className="text-sm font-semibold">Overall savings</div>
                    <div className="mt-2 text-xl font-semibold">{formatMoney(results.overallMonthlySavings)} / month</div>
                    <div className="text-sm text-muted-foreground">{formatMoney(results.overallYearlySavings)} / year</div>
                  </div>
                ) : (
                  <div className="pt-3 border-t">
                    <Button 
                      className="w-full" 
                      onClick={() => setShowOverallSavings(true)}
                      style={{
                        background: 'linear-gradient(135deg, #2D69A7 0%, #009A93 100%)'
                      }}
                    >
                      See Overall Savings
                    </Button>
                  </div>
                )}

                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="w-full">Get the report</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Send results</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      {reportSent ? (
                        <div className="py-4 text-center">
                          <div className="text-green-600 font-semibold mb-2">✓ Report sent successfully!</div>
                          <div className="text-sm text-muted-foreground">The report has been sent to your email address.</div>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-1">
                            <div className="text-xs font-semibold">Company</div>
                            <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company name" />
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs font-semibold">Email</div>
                            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
                          </div>
                          <Button onClick={onSendReport} disabled={sending || !email.includes("@") || company.length < 2}>
                            {sending ? "Sending..." : "Send report"}
                          </Button>
                        </>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">What this includes</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>1) Replacement cost from monthly loss.</p>
                <p>2) Labor time for cycle counting.</p>
                <p>3) Replacement equivalent for non-moving assets.</p>
                <p>4) Labor time spent searching for assets.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  )
}

function SliderRow(props: {
  label: string
  value: number
  min: number
  max: number
  step: number
  prefix?: string
  suffix?: string
  onChange: (v: number) => void
}) {
  const { label, value, min, max, step, prefix, suffix, onChange } = props
  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-3">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-sm tabular-nums text-muted-foreground">
          {prefix ?? ""}
          {formatInt(value)}
          {suffix ?? ""}
        </div>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0] ?? 0)}
      />
    </div>
  )
}

function SavingsRow(props: { label: string; monthly: number; yearly: number }) {
  return (
    <div>
      <div className="text-sm font-medium">{props.label}</div>
      <div className="mt-1 text-sm text-muted-foreground">
        {formatMoney(props.monthly)} / month
      </div>
      <div className="text-sm text-muted-foreground">
        {formatMoney(props.yearly)} / year
      </div>
    </div>
  )
}
