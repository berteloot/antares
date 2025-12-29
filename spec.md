# Project Specification: Antares ROI Calculator

## 1. Overview
A B2B ROI calculator for returnable asset visibility, comparing baseline (today) vs. with visibility (future state) to quantify the financial impact of improved tracking and management.

Stack: Next.js 14 (App Router), TypeScript, Tailwind CSS, Shadcn UI, Recharts.
Backend: HubSpot (CRM), SendGrid (Email), OpenAI (Analysis).
Deployment: Render.

## 2. Data Logic & Math

### A. Baseline (Today) Scenario

**Inputs:**
- `Monthly Volume` (int) - Number of containers shipped per month
- `Returnable Unit Cost` ($) - Cost to replace one container
- `Current Fleet Size` (int) - Total number of containers in fleet
- `Shrink Rate` (%) - Percentage of containers lost annually
- `Average Cycle Time` (days) - Average time from shipment to return
- `Excess Inventory Percent` (%) - Optional: Percentage of fleet sitting unused (can be derived from cycle time)
- `Annual Manual Process Cost` ($) - Annual labor cost for manual tracking/management

**Calculations:**
1. **Shrink Cost:**
   - Containers lost annually = Current fleet size × (Shrink rate / 100)
   - Annual shrink cost = Containers lost annually × Returnable unit cost

2. **Dwell Time Cost:**
   - Daily demand = Monthly volume / 30
   - Fleet needed = Daily demand × Average cycle time
   - Fleet capital = Fleet needed × Returnable unit cost
   - Dwell cost = Fleet capital × Cost of capital rate

3. **Excess Fleet Cost:**
   - Excess fleet = Max(0, Current fleet size - Fleet needed)
   - Excess inventory value = Excess fleet × Returnable unit cost
   - Excess inventory cost = Excess inventory value × Cost of capital rate

4. **Manual Process Cost:**
   - Annual manual process cost = Input value

5. **Baseline Total Loss:**
   - Baseline total loss = Shrink cost + Dwell cost + Excess fleet cost + Manual process cost

### B. With Visibility (Future) Scenario

**Inputs:**
- `Shrink Rate After` (%) - Expected shrink rate after visibility
- `Cycle Time After` (days) - Expected cycle time after visibility
- `Annual Manual Process Cost After` ($) - Expected manual process cost after visibility

**Calculations:**
1. **Shrink Cost After:**
   - Containers lost annually after = Current fleet size × (Shrink rate after / 100)
   - Annual shrink cost after = Containers lost annually after × Returnable unit cost

2. **Dwell Time Cost After:**
   - Fleet needed after = Daily demand × Cycle time after
   - Fleet capital after = Fleet needed after × Returnable unit cost
   - Dwell cost after = Fleet capital after × Cost of capital rate

3. **Excess Fleet Cost After:**
   - Excess fleet after = Max(0, Current fleet size - Fleet needed after)
   - Excess inventory value after = Excess fleet after × Returnable unit cost
   - Excess inventory cost after = Excess inventory value after × Cost of capital rate

4. **Manual Process Cost After:**
   - Annual manual process cost after = Input value

5. **Future Total Loss:**
   - Future total loss = Shrink cost after + Dwell cost after + Excess fleet cost after + Manual process cost after

### C. Savings & ROI Calculations

**Program Cost Inputs:**
- `Implementation Cost` ($) - One-time implementation cost
- `Annual Program Cost` ($) - Annual program cost
- `Cost of Capital Rate` (%) - Cost of capital for working capital calculations (default: 8%)

**Calculations:**
1. **Annual Savings:**
   - Annual savings = Baseline total loss - Future total loss

2. **Net Annual Savings:**
   - Net annual savings = Annual savings - Annual program cost

3. **Payback Period:**
   - Payback period (years) = Implementation cost / Net annual savings
   - If net annual savings ≤ 0, payback period = Infinity

4. **3-Year ROI:**
   - 3-year savings = Net annual savings × 3
   - 3-year costs = Implementation cost + (Annual program cost × 3)
   - 3-year ROI = ((3-year savings - 3-year costs) / 3-year costs) × 100
   - If 3-year costs ≤ 0, 3-year ROI = 0

## 3. API Services

- **OpenAI:** Generates a "Business Case" text blurb based on the `results` JSON, comparing baseline vs. future state and emphasizing dwell time improvements.
- **SendGrid:** Sends an HTML email with the "Business Case" and a summary table showing baseline vs. future losses.
- **HubSpot:** Stores calculation inputs and results as notes on contacts for CRM tracking.

## 4. Key Features

1. **Baseline vs. Future Comparison:** Users input both current state and expected future state to see realistic savings projections.

2. **Dwell Time Modeling:** Explicitly models the working capital impact of cycle time, showing how improved visibility reduces the fleet needed and frees up capital.

3. **Excess Fleet Derivation:** Automatically calculates excess fleet based on cycle time requirements vs. actual fleet size.

4. **Program Costs:** Explicit inputs for implementation and annual program costs, making the ROI calculation transparent.

5. **Cost of Capital:** Configurable cost of capital rate for working capital calculations (default 8%).

## 5. Chart Visualization

The chart shows cumulative costs over 3 years:
- **Status Quo Cumulative Cost:** Baseline total loss × Year
- **With Visibility Cumulative Cost:** (Future total loss + Annual program cost) × Year + Implementation cost (in Year 0)

The vertical gap between the lines represents the value created by visibility.
