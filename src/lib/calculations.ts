import { CalculationInputs, CalculationResults, VisibilitySimpleInputs, VisibilitySimpleResults } from './types'

export function calculateROI(inputs: CalculationInputs): CalculationResults {
  // Calculate daily demand
  const dailyDemand = inputs.monthlyVolume / 30

  // Calculate fleet needed based on cycle time
  const fleetNeededToday = dailyDemand * inputs.averageCycleTime
  const fleetNeededAfter = dailyDemand * inputs.cycleTimeAfter

  // Get cost of capital rate (default to 8% if not provided)
  const capitalCostRate = inputs.capitalCostRate || 0.08

  // ============================================
  // BASELINE (TODAY) CALCULATIONS
  // ============================================

  // 1. Shrink Cost (Today)
  const containersLostAnnuallyToday = inputs.currentFleetSize * (inputs.shrinkRate / 100)
  const annualShrinkCost = containersLostAnnuallyToday * inputs.returnableUnitCost

  // 2. Dwell Time Cost (Today) - Working capital tied up due to cycle time
  const fleetCapitalToday = fleetNeededToday * inputs.returnableUnitCost
  const dwellCostToday = fleetCapitalToday * capitalCostRate

  // 3. Excess Inventory Cost (Today) - Fleet beyond what cycle time requires
  // Derive excess from cycle time requirement vs actual fleet
  const excessFleet = Math.max(0, inputs.currentFleetSize - fleetNeededToday)
  const excessInventoryValue = excessFleet * inputs.returnableUnitCost
  const excessInventoryCost = excessInventoryValue * capitalCostRate

  // 4. Manual Process Cost (Today)
  const annualManualProcessCost = inputs.annualManualProcessCost

  // Total baseline annual loss
  const baselineTotalLoss = annualShrinkCost + dwellCostToday + excessInventoryCost + annualManualProcessCost

  // ============================================
  // WITH VISIBILITY (FUTURE) CALCULATIONS
  // ============================================

  // 1. Shrink Cost (After)
  const containersLostAnnuallyAfter = inputs.currentFleetSize * (inputs.shrinkRateAfter / 100)
  const annualShrinkCostAfter = containersLostAnnuallyAfter * inputs.returnableUnitCost

  // 2. Dwell Time Cost (After) - Working capital tied up due to improved cycle time
  const fleetCapitalAfter = fleetNeededAfter * inputs.returnableUnitCost
  const dwellCostAfter = fleetCapitalAfter * capitalCostRate

  // 3. Excess Inventory Cost (After) - Assuming we can reduce excess by improving cycle time
  // If cycle time improves, we need less fleet, so excess should reduce proportionally
  // For simplicity, assume excess reduces proportionally to cycle time improvement
  const cycleTimeImprovementRatio = inputs.cycleTimeAfter / inputs.averageCycleTime
  const excessFleetAfter = Math.max(0, inputs.currentFleetSize - fleetNeededAfter)
  const excessInventoryValueAfter = excessFleetAfter * inputs.returnableUnitCost
  const excessInventoryCostAfter = excessInventoryValueAfter * capitalCostRate

  // 4. Manual Process Cost (After)
  const annualManualProcessCostAfter = inputs.annualManualProcessCostAfter

  // Total future annual loss
  const futureTotalLoss = annualShrinkCostAfter + dwellCostAfter + excessInventoryCostAfter + annualManualProcessCostAfter

  // ============================================
  // SAVINGS CALCULATIONS
  // ============================================

  // Annual savings = baseline loss - future loss
  const annualSavings = baselineTotalLoss - futureTotalLoss

  // Net annual savings = annual savings - annual program cost
  const netAnnualSavings = annualSavings - inputs.annualProgramCost

  // ============================================
  // ROI CALCULATIONS
  // ============================================

  // Payback period = implementation cost / net annual savings
  const paybackPeriodYears = netAnnualSavings > 0 
    ? inputs.implementationCost / netAnnualSavings 
    : Infinity

  // 3-year ROI: (Total savings over 3 years - Total costs) / Total costs * 100
  const threeYearSavings = netAnnualSavings * 3
  const threeYearCosts = inputs.implementationCost + (inputs.annualProgramCost * 3)
  const threeYearROI = threeYearCosts > 0 
    ? ((threeYearSavings - threeYearCosts) / threeYearCosts) * 100
    : 0

  return {
    // Baseline (Today) Loss Calculations
    annualShrinkCost,
    dwellCostToday,
    excessInventoryCost,
    annualManualProcessCost,
    baselineTotalLoss,

    // With Visibility (Future) Loss Calculations
    annualShrinkCostAfter,
    dwellCostAfter,
    excessInventoryCostAfter,
    annualManualProcessCostAfter,
    futureTotalLoss,

    // Savings Calculations
    annualSavings,
    netAnnualSavings,

    // ROI Metrics
    paybackPeriodYears,
    threeYearROI,
  }
}

export function generateChartData(
  results: CalculationResults,
  inputs: CalculationInputs
) {
  // Show cumulative costs over 3 years
  const years = [0, 1, 2, 3]

  return years.map(year => ({
    year: `Year ${year}`,
    // Status quo: cumulative baseline loss
    statusQuoCumulativeCost: results.baselineTotalLoss * year,
    // With visibility: cumulative future loss + program costs + implementation cost
    withVisibilityCumulativeCost: year === 0
      ? inputs.implementationCost
      : (results.futureTotalLoss + inputs.annualProgramCost) * year + inputs.implementationCost,
  }))
}

/**
 * Surgere-style "visibility economics" calculator
 */
export function calculateVisibilitySavingsSimple(
  inputs: VisibilitySimpleInputs
): VisibilitySimpleResults {
  const captureRatePercent = clampNumber(inputs.captureRatePercent ?? 100, 0, 100)
  const capture = captureRatePercent / 100

  const effectiveWriteOffRate = clampNumber(inputs.effectiveWriteOffRate ?? 100, 0, 100) / 100
  const timeReductionPercent = clampNumber(inputs.timeReductionPercent ?? 100, 0, 100) / 100

  // 1) Lost container savings
  const lostContainerSavingsMonthly = inputs.lostContainersPerMonth * inputs.replacementCost * capture

  // 2) Time savings value (cycle counting) - applies time reduction factor
  const timeSavingsMonthly =
    inputs.cycleCountsPerMonth *
    inputs.hoursPerCycleCount *
    inputs.cycleCountAssociates *
    inputs.hourlyRate *
    capture *
    timeReductionPercent

  // 3) Non-moving containers cost - applies effective write-off rate
  // Represents value tied up/unavailable due to extended dwell time
  const nonMovingCostMonthly = inputs.nonMovingAssets10Plus * inputs.replacementCost * capture * effectiveWriteOffRate

  // 4) Manpower efficiency gains (search time) - applies time reduction factor
  const manpowerEfficiencyMonthly =
    inputs.hoursSearchingPerMonth *
    inputs.materialHandlingAssociates *
    inputs.hourlyRate *
    capture *
    timeReductionPercent

  const overallMonthlySavings =
    lostContainerSavingsMonthly + timeSavingsMonthly + nonMovingCostMonthly + manpowerEfficiencyMonthly

  const toYear = (m: number) => m * 12

  return {
    captureRatePercent,

    lostContainerSavingsMonthly,
    timeSavingsMonthly,
    nonMovingCostMonthly,
    manpowerEfficiencyMonthly,

    overallMonthlySavings,
    overallYearlySavings: toYear(overallMonthlySavings),

    lostContainerSavingsYearly: toYear(lostContainerSavingsMonthly),
    timeSavingsYearly: toYear(timeSavingsMonthly),
    nonMovingCostYearly: toYear(nonMovingCostMonthly),
    manpowerEfficiencyYearly: toYear(manpowerEfficiencyMonthly),
  }
}

function clampNumber(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min
  return Math.min(max, Math.max(min, value))
}
