import { calculateROI } from './calculations'
import { CalculationInputs } from './types'

/**
 * Basic tests for calculation functions
 * Run with: npx tsx src/lib/calculations.test.ts
 */

const baseInputs: CalculationInputs = {
  monthlyVolume: 240,
  returnableUnitCost: 835.00,
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

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

function test(name: string, fn: () => void): boolean {
  try {
    fn()
    console.log(`✓ ${name}`)
    return true
  } catch (error: any) {
    console.error(`✗ ${name}`)
    console.error(`  ${error.message}`)
    return false
  }
}

// Run tests
if (require.main === module) {
  console.log('Running calculation tests...\n')
  
  let passed = 0
  let failed = 0
  
  // Test 1: Baseline total loss is sum of components
  if (test('baseline total loss is sum of components', () => {
    const results = calculateROI(baseInputs)
    const calculatedBaseline = 
      results.annualShrinkCost + 
      results.dwellCostToday + 
      results.excessInventoryCost + 
      results.annualManualProcessCost
    
    assert(
      Math.abs(results.baselineTotalLoss - calculatedBaseline) < 0.01,
      `Baseline total loss mismatch: expected ${calculatedBaseline}, got ${results.baselineTotalLoss}`
    )
  })) passed++; else failed++
  
  // Test 2: Future total loss is sum of components
  if (test('future total loss is sum of components', () => {
    const results = calculateROI(baseInputs)
    const calculatedFuture = 
      results.annualShrinkCostAfter + 
      results.dwellCostAfter + 
      results.excessInventoryCostAfter + 
      results.annualManualProcessCostAfter
    
    assert(
      Math.abs(results.futureTotalLoss - calculatedFuture) < 0.01,
      `Future total loss mismatch: expected ${calculatedFuture}, got ${results.futureTotalLoss}`
    )
  })) passed++; else failed++
  
  // Test 3: Annual savings equals baseline minus future
  if (test('annual savings equals baseline minus future', () => {
    const results = calculateROI(baseInputs)
    const expectedSavings = results.baselineTotalLoss - results.futureTotalLoss
    
    assert(
      Math.abs(results.annualSavings - expectedSavings) < 0.01,
      `Annual savings mismatch: expected ${expectedSavings}, got ${results.annualSavings}`
    )
  })) passed++; else failed++
  
  // Test 4: Net annual savings equals annual savings minus program cost
  if (test('net annual savings equals annual savings minus program cost', () => {
    const results = calculateROI(baseInputs)
    const expectedNet = results.annualSavings - baseInputs.annualProgramCost
    
    assert(
      Math.abs(results.netAnnualSavings - expectedNet) < 0.01,
      `Net annual savings mismatch: expected ${expectedNet}, got ${results.netAnnualSavings}`
    )
  })) passed++; else failed++
  
  // Test 5: Payback period calculation
  if (test('payback period calculation', () => {
    const results = calculateROI(baseInputs)
    
    if (results.netAnnualSavings > 0) {
      const expectedPayback = baseInputs.implementationCost / results.netAnnualSavings
      assert(
        Math.abs(results.paybackPeriodYears - expectedPayback) < 0.01,
        `Payback period mismatch: expected ${expectedPayback}, got ${results.paybackPeriodYears}`
      )
    } else {
      assert(
        results.paybackPeriodYears === Infinity,
        `Payback should be Infinity when net savings is negative, got ${results.paybackPeriodYears}`
      )
    }
  })) passed++; else failed++
  
  // Test 6: 3-year ROI calculation
  if (test('3-year ROI calculation', () => {
    const results = calculateROI(baseInputs)
    const threeYearSavings = results.netAnnualSavings * 3
    const threeYearCosts = baseInputs.implementationCost + (baseInputs.annualProgramCost * 3)
    const expectedROI = threeYearCosts > 0 
      ? ((threeYearSavings - threeYearCosts) / threeYearCosts) * 100
      : 0
    
    assert(
      Math.abs(results.threeYearROI - expectedROI) < 0.01,
      `3-year ROI mismatch: expected ${expectedROI}, got ${results.threeYearROI}`
    )
  })) passed++; else failed++
  
  // Test 7: Future loss is less than baseline
  if (test('future loss is less than baseline', () => {
    const results = calculateROI(baseInputs)
    assert(
      results.futureTotalLoss < results.baselineTotalLoss,
      `Future loss should be less than baseline: ${results.futureTotalLoss} >= ${results.baselineTotalLoss}`
    )
  })) passed++; else failed++
  
  // Test 8: Dwell cost improves with better cycle time
  if (test('dwell cost improves with better cycle time', () => {
    const results = calculateROI(baseInputs)
    assert(
      results.dwellCostAfter < results.dwellCostToday,
      `Dwell cost should improve: ${results.dwellCostAfter} >= ${results.dwellCostToday}`
    )
  })) passed++; else failed++
  
  // Test 9: Shrink cost improves with lower shrink rate
  if (test('shrink cost improves with lower shrink rate', () => {
    const results = calculateROI(baseInputs)
    assert(
      results.annualShrinkCostAfter < results.annualShrinkCost,
      `Shrink cost should improve: ${results.annualShrinkCostAfter} >= ${results.annualShrinkCost}`
    )
  })) passed++; else failed++
  
  console.log(`\n${passed} passed, ${failed} failed`)
  process.exit(failed > 0 ? 1 : 0)
}
