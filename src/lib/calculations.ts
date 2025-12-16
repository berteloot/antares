import { CalculationInputs, CalculationResults } from './types'

export function calculateROI(inputs: CalculationInputs): CalculationResults {
  // Disposable Scenario
  const annualDisposableCost = inputs.monthlyVolume * 12 * inputs.disposableUnitCost

  // Returnable Scenario - Derived Math
  const totalCycleDays = inputs.warehouse + inputs.transit + inputs.customer + inputs.return + inputs.cleaning + inputs.buffer
  const dailyDemand = inputs.monthlyVolume / 30
  const theoreticalFleetNeeded = dailyDemand * totalCycleDays

  // Investment Logic
  // Round up fleet size to whole units (you buy whole assets, not fractions)
  const requiredFleetSize = inputs.useTheoreticalFleet 
    ? Math.ceil(theoreticalFleetNeeded) 
    : (inputs.manualFleetSize || 0)
  const totalInvestment = requiredFleetSize * inputs.returnableUnitCost

  // ROI Math
  const annualOperatingCost = inputs.annualMaintCleaningBudget
  const grossAnnualSavings = annualDisposableCost - annualOperatingCost
  
  // LOGIC FIX:
  // If savings are <= 0, you never pay it back. Return Infinity.
  // If Investment is 0, payback is instant (0).
  let paybackPeriodYears = 0
  
  if (totalInvestment > 0) {
    if (grossAnnualSavings > 0) {
      paybackPeriodYears = totalInvestment / grossAnnualSavings
    } else {
      // Investment exists but we lose money every year -> Never pays back
      paybackPeriodYears = Infinity
    }
  }

  // Calculate break-even year (first year where returnable cumulative <= disposable cumulative)
  let breakEvenYear: number | null = null
  for (let year = 0; year <= 10; year++) {
    const disposableCumulative = annualDisposableCost * year
    const returnableCumulative = totalInvestment + (annualOperatingCost * year)
    if (returnableCumulative <= disposableCumulative) {
      breakEvenYear = year
      break
    }
  }

  return {
    // Disposable Scenario
    annualDisposableCost,

    // Returnable Scenario
    totalCycleDays,
    dailyDemand,
    theoreticalFleetNeeded,
    requiredFleetSize,
    totalInvestment,

    // ROI Math
    annualOperatingCost,
    grossAnnualSavings,
    paybackPeriodYears,
    breakEvenYear,
  }
}

export function generateChartData(results: CalculationResults) {
  // Start at Year 0 to visualize the initial "gap" (the investment spike)
  const years = [0, 1, 2, 3]

  return years.map(year => ({
    year: `Year ${year}`,
    // Year 0 cost is 0 for disposable (pay as you go)
    disposable: results.annualDisposableCost * year,
    // Year 0 cost is the huge initial investment for returnable
    returnable: results.totalInvestment + (results.annualOperatingCost * year),
  }))
}
