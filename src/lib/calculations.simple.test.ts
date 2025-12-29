import { calculateVisibilitySavingsSimple } from './calculations'
import { VisibilitySimpleInputs } from './types'

/**
 * Unit tests for simple visibility calculator
 * Run with: npx tsx src/lib/calculations.simple.test.ts
 */

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

// Test case from user feedback (screenshot values)
const screenshotInputs: VisibilitySimpleInputs = {
  lostContainersPerMonth: 7790,
  replacementCost: 2126,
  cycleCountsPerMonth: 10,
  hoursPerCycleCount: 6,
  cycleCountAssociates: 3,
  nonMovingAssets10Plus: 83,
  hoursSearchingPerMonth: 103,
  materialHandlingAssociates: 5,
  hourlyRate: 24,
  captureRatePercent: 55,
}

if (require.main === module) {
  console.log('Running simple calculator tests...\n')
  
  let passed = 0
  let failed = 0

  // Test 1: Lost container savings (from screenshot)
  if (test('lost container savings matches screenshot', () => {
    const results = calculateVisibilitySavingsSimple(screenshotInputs)
    // 7,790 × 2,126 × 0.55 = $9,108,847 / month
    const expected = 7790 * 2126 * 0.55
    assert(
      Math.abs(results.lostContainerSavingsMonthly - expected) < 1,
      `Expected ${expected}, got ${results.lostContainerSavingsMonthly}`
    )
  })) passed++; else failed++

  // Test 2: Time savings value (from screenshot)
  if (test('time savings value matches screenshot', () => {
    const results = calculateVisibilitySavingsSimple(screenshotInputs)
    // 10 × 6 × 3 × 24 × 0.55 = $2,376 / month
    const expected = 10 * 6 * 3 * 24 * 0.55
    assert(
      Math.abs(results.timeSavingsMonthly - expected) < 1,
      `Expected ${expected}, got ${results.timeSavingsMonthly}`
    )
  })) passed++; else failed++

  // Test 3: Non-moving containers (from screenshot)
  if (test('non-moving containers cost matches screenshot', () => {
    const results = calculateVisibilitySavingsSimple(screenshotInputs)
    // 83 × 2,126 × 0.55 = $97,052 / month
    const expected = 83 * 2126 * 0.55
    assert(
      Math.abs(results.nonMovingCostMonthly - expected) < 1,
      `Expected ${expected}, got ${results.nonMovingCostMonthly}`
    )
  })) passed++; else failed++

  // Test 4: Manpower efficiency (from screenshot)
  if (test('manpower efficiency matches screenshot', () => {
    const results = calculateVisibilitySavingsSimple(screenshotInputs)
    // 103 × 5 × 24 × 0.55 = $6,798 / month
    const expected = 103 * 5 * 24 * 0.55
    assert(
      Math.abs(results.manpowerEfficiencyMonthly - expected) < 1,
      `Expected ${expected}, got ${results.manpowerEfficiencyMonthly}`
    )
  })) passed++; else failed++

  // Test 5: Total monthly savings (from screenshot)
  if (test('total monthly savings matches screenshot', () => {
    const results = calculateVisibilitySavingsSimple(screenshotInputs)
    // 9,108,847 + 2,376 + 97,052 + 6,798 = $9,215,073 / month
    const expected = 9108847 + 2376 + 97052 + 6798
    assert(
      Math.abs(results.overallMonthlySavings - expected) < 1,
      `Expected ${expected}, got ${results.overallMonthlySavings}`
    )
  })) passed++; else failed++

  // Test 6: Yearly conversion
  if (test('yearly savings equals monthly × 12', () => {
    const results = calculateVisibilitySavingsSimple(screenshotInputs)
    assert(
      Math.abs(results.overallYearlySavings - (results.overallMonthlySavings * 12)) < 0.01,
      `Yearly should be monthly × 12`
    )
  })) passed++; else failed++

  // Test 7: Effective write-off rate
  if (test('effective write-off rate reduces non-moving cost', () => {
    const inputsWithWriteOff: VisibilitySimpleInputs = {
      ...screenshotInputs,
      effectiveWriteOffRate: 30, // 30% instead of 100%
    }
    const results = calculateVisibilitySavingsSimple(inputsWithWriteOff)
    // Should be 30% of the original
    const original = 83 * 2126 * 0.55
    const expected = original * 0.30
    assert(
      Math.abs(results.nonMovingCostMonthly - expected) < 1,
      `Expected ${expected} with 30% write-off, got ${results.nonMovingCostMonthly}`
    )
  })) passed++; else failed++

  // Test 8: Time reduction percent
  if (test('time reduction percent reduces time savings', () => {
    const inputsWithReduction: VisibilitySimpleInputs = {
      ...screenshotInputs,
      timeReductionPercent: 50, // 50% instead of 100%
    }
    const results = calculateVisibilitySavingsSimple(inputsWithReduction)
    // Should be 50% of the original time savings
    const original = 10 * 6 * 3 * 24 * 0.55
    const expected = original * 0.50
    assert(
      Math.abs(results.timeSavingsMonthly - expected) < 1,
      `Expected ${expected} with 50% time reduction, got ${results.timeSavingsMonthly}`
    )
  })) passed++; else failed++

  // Test 9: Default values
  if (test('defaults work correctly', () => {
    const minimalInputs: VisibilitySimpleInputs = {
      lostContainersPerMonth: 10,
      replacementCost: 100,
      cycleCountsPerMonth: 1,
      hoursPerCycleCount: 1,
      cycleCountAssociates: 1,
      nonMovingAssets10Plus: 1,
      hoursSearchingPerMonth: 1,
      materialHandlingAssociates: 1,
      hourlyRate: 20,
      // No optional fields - should use defaults
    }
    const results = calculateVisibilitySavingsSimple(minimalInputs)
    // Should all be positive
    assert(results.overallMonthlySavings > 0, 'Overall savings should be positive')
    assert(results.captureRatePercent === 100, 'Default capture rate should be 100%')
  })) passed++; else failed++

  console.log(`\n${passed} passed, ${failed} failed`)
  process.exit(failed > 0 ? 1 : 0)
}

