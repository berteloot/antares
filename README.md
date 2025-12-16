# ACSIS ROI Calculator

A B2B ROI calculator comparing disposable vs. returnable packaging assets.

## Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Shadcn UI, Recharts
- **Backend:** HubSpot (CRM), SendGrid (Email), OpenAI (Analysis)
- **Deployment:** Render

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

## Features

- Interactive ROI calculator with real-time calculations
- Cycle time component sliders for detailed fleet sizing
- 3-year cost comparison visualization
- Email report generation with AI-powered business case
- HubSpot integration for storing all calculations as notes on contacts

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
     - **Branch:** `master` (or your default branch)
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

