# Antares ROI Calculator

A B2B ROI calculator for returnable asset visibility, comparing baseline (today) vs. with visibility (future state) to quantify the financial impact of improved tracking and management.

## Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Shadcn UI, Recharts
- **Backend:** HubSpot (CRM), SendGrid (Email), OpenAI (Analysis)
- **Deployment:** Render

## Overview

The Antares ROI Calculator helps businesses quantify the financial impact of implementing returnable asset visibility solutions. It models:

- **Baseline (Today) Losses:**
  - Shrink cost (containers lost annually)
  - Dwell time cost (working capital tied up due to cycle time)
  - Excess fleet cost (working capital in unused containers)
  - Manual process cost (labor for tracking and management)

- **With Visibility (Future) Losses:**
  - Reduced shrink cost
  - Reduced dwell time cost (improved cycle time)
  - Reduced excess fleet cost
  - Reduced manual process cost

- **ROI Metrics:**
  - Annual savings (baseline loss - future loss)
  - Net annual savings (annual savings - program costs)
  - Payback period
  - 3-year ROI

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment variables:**
   Create a `.env.local` file with:
   ```env
   OPENAI_API_KEY="your-openai-api-key"
   SENDGRID_API_KEY="your-sendgrid-api-key"
   FROM_EMAIL="noreply@yourdomain.com"
   HUBSPOT_ACCESS_TOKEN="your-hubspot-access-token"
   ```
   
   **Note:** 
   - The `FROM_EMAIL` must be a verified sender in your SendGrid account
   - `HUBSPOT_ACCESS_TOKEN` is optional - if not provided, calculations will still work but won't be saved to HubSpot

3. **Run development server:**
   ```bash
   npm run dev
   ```

4. **Run tests:**
   ```bash
   npx tsx src/lib/calculations.test.ts
   ```

## Features

- Interactive ROI calculator with real-time calculations
- Baseline vs. future state comparison
- Dwell time modeling (working capital impact of cycle time)
- 3-year cumulative cost visualization
- Email report generation with AI-powered business case
- HubSpot integration for storing all calculations as notes on contacts

## Model Assumptions

The calculator uses the following model:

1. **Dwell Time Calculation:**
   - Fleet needed = Daily demand × Cycle time
   - Dwell cost = Fleet needed × Unit cost × Cost of capital

2. **Excess Fleet Calculation:**
   - Excess fleet = Max(0, Current fleet - Fleet needed)
   - Excess cost = Excess fleet × Unit cost × Cost of capital

3. **Savings Calculation:**
   - Annual savings = Baseline total loss - Future total loss
   - Net annual savings = Annual savings - Annual program cost

4. **ROI Calculation:**
   - Payback period = Implementation cost / Net annual savings
   - 3-year ROI = ((3-year savings - 3-year costs) / 3-year costs) × 100

## Deployment

### GitHub Setup

1. **Initialize Git repository (if not already done):**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Add remote and push to GitHub:**
   ```bash
   git remote add origin https://github.com/berteloot/antares.git
   git branch -M main
   git push -u origin main
   ```

### Render Deployment (Manual Setup)

This application is configured for deployment on Render with:
- Server-side rendering and API routes
- No database required - all data is stored in HubSpot

#### Steps to Deploy on Render:

1. **Create a Render account** at [render.com](https://render.com)

2. **Create a Web Service:**
   - Go to your Render dashboard
   - Click "New" → "Web Service"
   - Connect your GitHub account and select the `antares` repository
   - Configure the service:
     - **Name:** `antares` (or your preferred name)
     - **Environment:** `Node`
     - **Region:** Choose closest to your users
     - **Branch:** `main` (or your default branch)
     - **Root Directory:** (leave empty, or `./` if needed)
     - **Build Command:** `npm install && npm run build`
     - **Start Command:** `npm start`
     - **Plan:** Free (or upgrade as needed)

3. **Configure Environment Variables:**
   In your Render Web Service settings, go to "Environment" and add:
   - `NODE_ENV`: `production`
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `SENDGRID_API_KEY`: Your SendGrid API key
   - `FROM_EMAIL`: Your verified sender email (e.g., `sberteloot@nytromarketing.com`)
   - `HUBSPOT_ACCESS_TOKEN`: Your HubSpot access token (optional - if not provided, calculations won't be saved to HubSpot)

4. **Deploy:**
   - Click "Create Web Service"
   - Render will automatically deploy on every push to your branch

5. **Verify Deployment:**
   - Check the build and runtime logs in Render dashboard
   - Visit your deployed URL (shown in the service dashboard)
   - Optionally, run the validation script in the Shell: `npm run validate-env`

#### Important Notes:

- The `FROM_EMAIL` must be a verified sender in your SendGrid account
- All calculation data is stored in HubSpot as notes on contacts (no database required)
- If `HUBSPOT_ACCESS_TOKEN` is not provided, the app will still work but won't save calculations to HubSpot
- Make sure your SendGrid sender is verified before sending emails
