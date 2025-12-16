# ACSIS ROI Calculator

A B2B ROI calculator comparing disposable vs. returnable packaging assets.

## Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Shadcn UI, Recharts
- **Backend:** Postgres (Prisma ORM), SendGrid (Email), OpenAI (Analysis)
- **Deployment:** Render

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Database setup:**
   ```bash
   # Generate Prisma client
   npm run db:generate

   # Push schema to database
   npm run db:push
   ```

3. **Environment variables:**
   Create a `.env.local` file with:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/antares"
   OPENAI_API_KEY="your-openai-api-key"
   SENDGRID_API_KEY="your-sendgrid-api-key"
   FROM_EMAIL="noreply@yourdomain.com"
   ```
   
   **Note:** The `FROM_EMAIL` must be a verified sender in your SendGrid account.

4. **Run development server:**
   ```bash
   npm run dev
   ```

## Features

- Interactive ROI calculator with real-time calculations
- Cycle time component sliders for detailed fleet sizing
- 3-year cost comparison visualization
- Email report generation with AI-powered business case
- Database storage of all calculations

## Database Schema

The `Calculation` model stores:
- User email and company
- All input parameters as JSON
- Calculated results as JSON
- Timestamp

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

### Render Deployment

This application is configured for deployment on Render with:
- Automatic Prisma client generation via `postinstall` script
- Singleton database connection pattern (critical for Render)
- Server-side rendering and API routes
- `render.yaml` configuration file for easy setup

#### Steps to Deploy on Render:

1. **Create a Render account** at [render.com](https://render.com)

2. **Connect your GitHub repository:**
   - Go to your Render dashboard
   - Click "New" → "Blueprint"
   - Connect your GitHub account and select the `antares` repository
   - Render will automatically detect the `render.yaml` file

3. **Or manually create services:**
   - **PostgreSQL Database:**
     - Create a new PostgreSQL database
     - Name it `antares-db`
     - Note the connection string
   
   - **Web Service:**
     - Create a new Web Service
     - Connect to your GitHub repository
     - Use these settings:
       - **Build Command:** `npm install && npm run db:generate && npm run build`
       - **Start Command:** `npm start`
       - **Environment:** Node
       - **Plan:** Starter (or higher)

4. **Configure Environment Variables:**
   In your Render Web Service, add these environment variables:
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: (automatically set if using `render.yaml`, otherwise use the connection string from your database)
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `SENDGRID_API_KEY`: Your SendGrid API key
   - `FROM_EMAIL`: Your verified sender email (e.g., `noreply@yourdomain.com`)

5. **Deploy:**
   - Render will automatically deploy on every push to the main branch
   - On first deploy, you may need to run database migrations:
     - Go to your Web Service → Shell
     - Run: `npx prisma db push`

6. **Verify Deployment:**
   - Check the logs in Render dashboard
   - Visit your deployed URL
   - Run the validation script: `npm run validate-env` (in Render Shell)

#### Important Notes:

- The `FROM_EMAIL` must be a verified sender in your SendGrid account
- The database will be automatically provisioned if using `render.yaml`
- Prisma client is automatically generated on each deploy via the `postinstall` script
- Make sure your SendGrid sender is verified before sending emails

