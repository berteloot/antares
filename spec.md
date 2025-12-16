# Project Specification: ACSIS ROI Calculator

## 1. Overview
A B2B ROI calculator comparing "Disposable" vs. "Returnable" packaging assets.
Stack: Next.js 14 (App Router), TypeScript, Tailwind CSS, Shadcn UI, Recharts.
Backend: Postgres (Prisma ORM), SendGrid (Email), OpenAI (Analysis).
Deployment: Render.

## 2. Data Logic & Math
### A. Disposable Scenario (Current State)
- **Inputs:** `Monthly Volume` (int), `Disposable Unit Cost` ($).
- **Math:** `Annual Disposable Cost` = Monthly Volume * 12 * Disposable Unit Cost.

### B. Returnable Scenario (Future State)
- **Inputs:** - `Returnable Unit Cost` ($)
  - `Annual Maint/Cleaning Budget` ($)
  - `Cycle Time Components` (Days): Warehouse, Transit, Customer, Return, Cleaning, Buffer.
- **Derived Math:**
  - `Total Cycle Days` = Sum of all cycle time components.
  - `Daily Demand` = Monthly Volume / 30.
  - `Theoretical Fleet Needed` = Daily Demand * Total Cycle Days.
- **Investment Logic:**
  - `Required Fleet Size`: Allow user to toggle between "Theoretical Fleet Needed" (calculated) or "Manual Override" (user input).
  - `Total Investment` = Required Fleet Size * Returnable Unit Cost.
- **ROI Math:**
  - `Annual Operating Cost` = Annual Maint/Cleaning Budget.
  - `Gross Annual Savings` = Annual Disposable Cost - Annual Operating Cost.
  - `Payback Period (Years)` = Total Investment / Gross Annual Savings.

## 3. Database Schema (Prisma)
Model `Calculation`:
- `id` (UUID)
- `email` (String)
- `company` (String)
- `inputs` (JSON) - Stores all volumes, costs, and day assumptions.
- `results` (JSON) - Stores calculated savings, payback, and fleet size.
- `createdAt` (DateTime)

## 4. API Services
- **OpenAI:** Generates a "Business Case" text blurb based on the `results` JSON.
- **SendGrid:** Sends an HTML email with the "Business Case" and a summary table.
