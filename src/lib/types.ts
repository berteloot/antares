export interface CalculationInputs {
  // Disposable Scenario
  monthlyVolume: number
  disposableUnitCost: number

  // Returnable Scenario
  returnableUnitCost: number
  annualMaintCleaningBudget: number

  // Cycle Time Components (Days)
  warehouse: number
  transit: number
  customer: number
  return: number
  cleaning: number
  buffer: number

  // Fleet Size Toggle
  useTheoreticalFleet: boolean
  manualFleetSize?: number
}

export interface CalculationResults {
  // Disposable Scenario
  annualDisposableCost: number

  // Returnable Scenario
  totalCycleDays: number
  dailyDemand: number
  theoreticalFleetNeeded: number
  requiredFleetSize: number
  totalInvestment: number

  // ROI Math
  annualOperatingCost: number
  grossAnnualSavings: number
  paybackPeriodYears: number
  breakEvenYear: number | null
}

export interface CalculationData {
  inputs: CalculationInputs
  results: CalculationResults
}
