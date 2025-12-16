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

### Render Deployment (Manual Setup)

This application is configured for deployment on Render with:
- Automatic Prisma client generation via `postinstall` script
- Singleton database connection pattern (critical for Render)
- Server-side rendering and API routes

#### Steps to Deploy on Render:

1. **Create a Render account** at [render.com](https://render.com)

2. **Create a PostgreSQL Database (Optional - only if you need a new database):**
   - Go to your Render dashboard
   - Click "New" → "PostgreSQL"
   - Choose a name (e.g., `antares-db`)
   - Select a plan (Free tier available for development)
   - Click "Create Database"
   - **Copy the Internal Database URL** - you'll need this for the web service
   - **Note:** If you already have a database, skip this step and use your existing database URL

3. **Create a Web Service:**
   - Go to your Render dashboard
   - Click "New" → "Web Service"
   - Connect your GitHub account and select the `antares` repository
   - Configure the service:
     - **Name:** `antares` (or your preferred name)
     - **Environment:** `Node`
     - **Region:** Choose closest to your users
     - **Branch:** `master` (or your default branch)
     - **Root Directory:** (leave empty, or `./` if needed)
     - **Build Command:** `npm install && npm run db:generate && npm run build`
     - **Start Command:** `npm start`
     - **Plan:** Free (or upgrade as needed)

4. **Configure Environment Variables:**
   In your Render Web Service settings, go to "Environment" and add:
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: Your PostgreSQL connection string (from step 2, or your existing database)
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `SENDGRID_API_KEY`: Your SendGrid API key
   - `FROM_EMAIL`: Your verified sender email (e.g., `sberteloot@nytromarketing.com`)

5. **Deploy:**
   - Click "Create Web Service"
   - Render will automatically deploy on every push to your branch
   - On first deploy, after the service is running, you need to set up the database schema:
     - Go to your Web Service → "Shell" tab
     - Run: `npx prisma db push`
     - This will create the `Calculation` table in your database

6. **Verify Deployment:**
   - Check the build and runtime logs in Render dashboard
   - Visit your deployed URL (shown in the service dashboard)
   - Optionally, run the validation script in the Shell: `npm run validate-env`

#### Important Notes:

- The `FROM_EMAIL` must be a verified sender in your SendGrid account
- You can use an existing PostgreSQL database - just provide its connection string
- Prisma client is automatically generated on each deploy via the `postinstall` script
- Make sure your SendGrid sender is verified before sending emails
- The database schema is pushed manually on first deploy (step 5)

