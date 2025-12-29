export interface CalculationInputs {
  // Basic Parameters
  monthlyVolume: number
  returnableUnitCost: number
  currentFleetSize: number

  // Baseline (Today) Loss Parameters
  shrinkRate: number  // Percentage of containers lost annually (0-100)
  averageCycleTime: number  // Average cycle time in days (today)
  excessInventoryPercent: number  // Percentage of fleet sitting unused (0-100) - optional, can be derived from cycle time
  annualManualProcessCost: number  // Annual labor cost for manual tracking/management (today)

  // With Visibility (Future State) Parameters
  shrinkRateAfter: number  // Shrink rate after visibility (%)
  cycleTimeAfter: number  // Cycle time after visibility (days)
  annualManualProcessCostAfter: number  // Manual process cost after visibility ($/yr)

  // Program Costs
  implementationCost: number  // One-time implementation cost ($)
  annualProgramCost: number  // Annual program cost ($/yr)

  // Advanced Parameters
  capitalCostRate: number  // Cost of capital rate (default 0.08 = 8%)
}

export interface CalculationResults {
  // Baseline (Today) Loss Calculations
  annualShrinkCost: number  // Cost of replacing lost containers (today)
  dwellCostToday: number  // Working capital cost due to cycle time (today)
  excessInventoryCost: number  // Working capital tied up in excess inventory (today)
  annualManualProcessCost: number  // Labor costs for manual processes (today)
  baselineTotalLoss: number  // Total annual loss (baseline)

  // With Visibility (Future) Loss Calculations
  annualShrinkCostAfter: number  // Cost of replacing lost containers (after)
  dwellCostAfter: number  // Working capital cost due to cycle time (after)
  excessInventoryCostAfter: number  // Working capital tied up in excess inventory (after)
  annualManualProcessCostAfter: number  // Labor costs for manual processes (after)
  futureTotalLoss: number  // Total annual loss (with visibility)

  // Savings Calculations
  annualSavings: number  // Annual savings = baselineTotalLoss - futureTotalLoss
  netAnnualSavings: number  // Net annual savings = annualSavings - annualProgramCost

  // ROI Metrics
  paybackPeriodYears: number
  threeYearROI: number
}

export interface CalculationData {
  inputs: CalculationInputs
  results: CalculationResults
}

/**
 * Simple, Surgere-style calculator
 */
export interface VisibilitySimpleInputs {
  lostContainersPerMonth: number
  replacementCost: number

  cycleCountsPerMonth: number
  hoursPerCycleCount: number
  cycleCountAssociates: number

  nonMovingAssets10Plus: number

  hoursSearchingPerMonth: number
  materialHandlingAssociates: number

  hourlyRate: number

  // Optional conservative factors (Advanced)
  captureRatePercent?: number // 0-100, defaults to 100
  effectiveWriteOffRate?: number // 0-100, defaults to 100 - % of non-moving assets treated as effectively lost
  timeReductionPercent?: number // 0-100, defaults to 100 - % of cycle count/search time that becomes savings
}

export interface VisibilitySimpleResults {
  captureRatePercent: number

  lostContainerSavingsMonthly: number
  timeSavingsMonthly: number
  nonMovingCostMonthly: number
  manpowerEfficiencyMonthly: number

  overallMonthlySavings: number
  overallYearlySavings: number

  lostContainerSavingsYearly: number
  timeSavingsYearly: number
  nonMovingCostYearly: number
  manpowerEfficiencyYearly: number
}
