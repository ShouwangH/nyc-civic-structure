# NYC Civic Structure - Project Handoff Guide

**Last Updated:** 2025-11-12

This document guides you through taking ownership of the NYC Civic Structure visualization project. Follow these steps to migrate the project to your own infrastructure.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Step 1: Database Setup](#step-1-database-setup)
4. [Step 2: Repository Setup](#step-2-repository-setup)
5. [Step 3: Local Development](#step-3-local-development)
6. [Step 4: Deployment Setup](#step-4-deployment-setup)
7. [Step 5: Automated Data Updates](#step-5-automated-data-updates)
8. [Maintenance](#maintenance)
9. [Troubleshooting](#troubleshooting)

---

## Overview

### Current Infrastructure (Developer)
- **Main Repository:** GitHub (to be transferred)
- **Workflow Repository:** Separate GitHub repo for automated updates
- **Database:** Supabase PostgreSQL with seeded NYC Open Data
- **Deployment:** Vercel static hosting at https://nyc-civic-structure.vercel.app/
- **Automation:** GitHub Actions for weekly database updates

### Your New Infrastructure
- **Main Repository:** Your GitHub account
- **Workflow Repository:** Your GitHub account (clone from developer)
- **Database:** Your own PostgreSQL database (Supabase recommended)
- **Deployment:** Your own Vercel account (or alternative static host)
- **Automation:** GitHub Actions with your database credentials

### Migration Strategy
We'll use a **fresh database approach**: rather than exporting/importing the database, you'll run the seed scripts to fetch fresh data from NYC Open Data APIs. This ensures you have the latest data and avoids any transfer issues.

---

## Prerequisites

Before starting, ensure you have:

- [x] **GitHub account** for repositories
- [x] **Bun** installed (v1.3.0+): https://bun.sh/
- [x] **PostgreSQL database** (see [Database Setup](#step-1-database-setup))
- [x] **Vercel account** (or alternative: Netlify, Cloudflare Pages)
- [x] **Basic terminal knowledge**
- [x] **Access to workflow repository** (contact developer)

**Estimated time:** 45-60 minutes (main setup) + 10 minutes (workflow setup)

---

## Step 1: Database Setup

You'll need a PostgreSQL database with PostGIS support. Supabase is recommended (free tier sufficient for development).

### Option A: Supabase (Recommended)

1. **Create account:** https://supabase.com/

2. **Create new project:**
   - Click "New Project"
   - Name: `nyc-civic-structure`
   - Database password: Save this securely
   - Region: Choose closest to your users (e.g., US East)
   - Plan: Free tier is sufficient for development

3. **Get connection string:**
   - Go to Project Settings → Database
   - Under "Connection string", select **"URI"** mode
   - Copy the **"Direct connection"** string (not pooled)
   - Replace `[YOUR-PASSWORD]` with your actual database password

   Example format:
   ```
   postgresql://postgres.abc123xyz:your-password@aws-0-us-west-1.pooler.supabase.com:5432/postgres?sslmode=require
   ```

4. **Enable PostGIS** (already enabled by default on Supabase)

### Option B: Other PostgreSQL Providers

- **Railway:** https://railway.app/ (PostgreSQL with PostGIS)
- **Render:** https://render.com/ (PostgreSQL addon)
- **Self-hosted:** Requires PostgreSQL 14+ with PostGIS extension

**Save your `DATABASE_URL` - you'll need it in the next step.**

---

## Step 2: Repository Setup

### Option A: Transfer Repository (Same Organization)

If you're part of the same GitHub organization:

1. Ask the developer to transfer ownership:
   - Go to repository Settings → General → Danger Zone
   - Click "Transfer ownership"
   - Enter your GitHub username

2. Accept the transfer

### Option B: Fork/Clone (Different Organization)

If you're in a different organization or want a fresh copy:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/[developer-username]/nyc-civic-structure.git
   cd nyc-civic-structure
   ```

2. **Create your own GitHub repository:**
   - Go to https://github.com/new
   - Name: `nyc-civic-structure`
   - Leave "Initialize repository" unchecked
   - Click "Create repository"

3. **Update remote to your repository:**
   ```bash
   git remote set-url origin https://github.com/[your-username]/nyc-civic-structure.git
   git push -u origin main
   ```

---

## Step 3: Local Development

Now set up the project locally and seed your database.

### 3.1 Install Dependencies

```bash
cd nyc-civic-structure
bun install
```

### 3.2 Configure Environment

1. **Copy environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` with your database URL:**
   ```bash
   # .env
   DATABASE_URL=postgresql://your-connection-string-here
   ```

   Paste the connection string you saved from [Step 1](#step-1-database-setup).

### 3.3 Initialize Database Schema

```bash
bun run db:push
```

This creates all required tables (housing, capital projects, financial datasets, etc.).

### 3.4 Seed Data from NYC Open Data

**This will take 10-20 minutes** as it fetches data from NYC Open Data APIs:

```bash
bun run seed:all
```

This seeds:
- **Housing data:** ~37,000 records (DCP Housing Database + Housing NY)
- **Capital projects:** ~15,000 records (CPDB)
- **Financial datasets:** Sankey and Sunburst visualizations

**Individual seed scripts** (if you want to seed incrementally):
```bash
bun run seed:housing      # ~10-15 minutes
bun run seed:capital      # ~5-10 minutes
bun run seed:financial    # ~2-3 minutes
```

### 3.5 Verify Data

```bash
# Check housing data
bun run verify:housing

# Open database GUI
bun run db:studio
```

### 3.6 Start Development Server

```bash
bun run dev
```

Open http://localhost:5173 - you should see the NYC civic structure graph.

**Test the visualizations:**
- Click nodes to see details
- Switch between "Diagram", "Financials", and "Maps" views
- Verify housing timelapse loads correctly
- Check that capital budget map displays

---

## Step 4: Deployment Setup

The app is a **static frontend** with API middleware. Vercel is recommended but not required.

### Option A: Vercel (Current Setup)

1. **Install Vercel CLI:**
   ```bash
   bun install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Link project:**
   ```bash
   vercel link
   ```

   - Create new project: Yes
   - Project name: `nyc-civic-structure`
   - Directory: `.` (current directory)

4. **Set environment variable:**
   ```bash
   vercel env add DATABASE_URL
   ```

   When prompted, paste your `DATABASE_URL` and select "Production, Preview, Development".

5. **Deploy:**
   ```bash
   vercel --prod
   ```

   Your site will be live at `https://nyc-civic-structure-[your-username].vercel.app`

**Note:** The current deployment at https://nyc-civic-structure.vercel.app/ will continue to work until the developer removes it. You can use your own custom domain in Vercel settings.

### Option B: Netlify

1. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```

2. Build the project:
   ```bash
   bun run build
   ```

3. Deploy:
   ```bash
   netlify deploy --prod --dir=dist
   ```

4. Set environment variables in Netlify dashboard:
   - Go to Site Settings → Environment Variables
   - Add `DATABASE_URL`

### Option C: Cloudflare Pages

1. Build the project:
   ```bash
   bun run build
   ```

2. Deploy via Cloudflare Pages dashboard:
   - Connect your GitHub repo
   - Build command: `bun run build`
   - Output directory: `dist`
   - Add `DATABASE_URL` environment variable

---

## Step 5: Automated Data Updates

The database update workflow is maintained in a **separate repository** for infrastructure management. You'll need to clone and set up this repository as well.

### 5.1 Clone Workflow Repository

Contact the original developer for access to the workflow repository. It contains GitHub Actions configuration for automated weekly data updates.

**What it does:**
- Runs every Sunday to refresh data from NYC Open Data APIs
- Updates your PostgreSQL database automatically
- Processes housing, capital, and financial datasets

### 5.2 Set Up Workflow Repository

1. **Clone the workflow repository** (provided by developer)

2. **Add Database Secret** to the workflow repository:
   - Go to the workflow repo → Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `DATABASE_URL`
   - Value: Your PostgreSQL connection string (same as your `.env`)
   - Click "Add secret"

3. **The workflow will automatically run** every Sunday

### 5.3 Test the Workflow

**Manual trigger:**
1. Go to the workflow repository on GitHub
2. Click "Actions" tab
3. Select the update workflow
4. Click "Run workflow" → "Run workflow"
5. Monitor the execution

**First run will take ~30-40 minutes** as it processes all datasets.

### 5.4 Manual Alternative

If you prefer not to use automated updates, you can manually refresh data anytime:

```bash
# Run locally or via CI/CD of your choice
bun run seed:all
```

---

## Maintenance

### Weekly Data Refresh

The GitHub Actions workflow handles this automatically. To manually refresh:

```bash
bun run seed:all
```

### Monitoring

- **Database size:** Monitor Supabase dashboard (free tier: 500 MB limit)
- **API performance:** Check response times in browser DevTools
- **Cache status:** API responses show `"cached": true/false`

### Cache Management

The app caches API responses for 24 hours. To force refresh:

```
https://your-site.com/api/housing-data?refresh=true
```

### Database Maintenance

```bash
# Check for duplicate locations
bun run check:duplicates

# Verify housing data integrity
bun run verify:housing

# Open database GUI
bun run db:studio
```

### Updating Dependencies

```bash
# Update all dependencies
bun update

# Check for outdated packages
bun outdated
```

---

## Troubleshooting

### Database Connection Issues

**Error:** `Connection refused` or `timeout`

**Solution:**
1. Verify `DATABASE_URL` format (check for typos)
2. Ensure you're using **direct connection** (not pooled)
3. Check database is running (Supabase dashboard)
4. Verify SSL mode: `?sslmode=require` at end of URL

### Seed Script Failures

**Error:** `Failed to fetch from NYC Open Data`

**Solution:**
1. Check internet connection
2. NYC Open Data APIs may be temporarily down (retry in 30 minutes)
3. Try seeding individual datasets:
   ```bash
   bun run seed:housing
   bun run seed:capital
   bun run seed:financial
   ```

**Error:** `Out of memory` during seeding

**Solution:**
1. Close other applications
2. Increase Node.js memory: `NODE_OPTIONS=--max-old-space-size=4096 bun run seed:all`

### Deployment Issues

**Error:** `Module not found` on Vercel

**Solution:**
1. Ensure `DATABASE_URL` environment variable is set
2. Redeploy: `vercel --prod`
3. Check build logs in Vercel dashboard

**Error:** API endpoints return 404

**Solution:**
1. Verify `DATABASE_URL` is set in deployment environment
2. Check database has seeded data: `bun run db:studio`
3. Restart deployment

### GitHub Actions Failures

**Error:** `DATABASE_URL not found`

**Solution:**
1. Verify secret is set: Settings → Secrets → `DATABASE_URL`
2. Re-run workflow

**Error:** Workflow times out after 6 hours

**Solution:**
1. This is rare - NYC Open Data APIs may be slow
2. Re-run workflow manually
3. Consider running seed scripts locally and skipping automation

---

## Getting Help

### Documentation

- [README.md](README.md) - User guide and API reference
- [ARCHITECTURE.md](ARCHITECTURE.md) - System architecture and design patterns
- [docs/DATA_FLOW.md](docs/DATA_FLOW.md) - Data flow documentation

### Common Questions

**Q: How much does this cost to run?**
- Supabase: Free tier sufficient (500 MB database, 2 GB bandwidth)
- Vercel: Free tier sufficient (100 GB bandwidth)
- Total: $0/month for low-moderate traffic

**Q: How long does initial setup take?**
- Database setup: 10 minutes
- Repository setup: 5 minutes
- Seeding data: 30-40 minutes
- Deployment: 10 minutes
- **Total: ~60 minutes**

**Q: Can I use a different database provider?**
- Yes, any PostgreSQL 14+ with PostGIS support works
- Providers: Railway, Render, AWS RDS, self-hosted

**Q: Can I deploy somewhere other than Vercel?**
- Yes, any static host works: Netlify, Cloudflare Pages, AWS S3, etc.
- The app is a standard Vite build (`dist/` folder)

**Q: What if NYC Open Data APIs are down?**
- APIs are highly reliable (99%+ uptime)
- If down, wait 30 minutes and retry
- You can always use the cached data (24-hour TTL)

**Q: How do I update the civic structure graph?**
- Edit `data/city-intra.json`
- Redeploy the application
- Data is static JSON, not fetched from API

---

## Post-Handoff Checklist

Once you've completed the handoff:

- [ ] Main repository cloned and configured
- [ ] Database is seeded and verified
- [ ] Local development works (`bun run dev`)
- [ ] Deployment is live and functional
- [ ] Workflow repository cloned (if using automated updates)
- [ ] Workflow repository has `DATABASE_URL` secret set
- [ ] Test manual data refresh works (`bun run seed:all`)
- [ ] All visualizations load correctly
- [ ] Reviewed [ARCHITECTURE.md](ARCHITECTURE.md) for system understanding
- [ ] Bookmarked Supabase and Vercel dashboards
- [ ] Set up monitoring/alerts (optional)

---

## Support Timeline

**Original developer support:**
- Contact details: [https://github.com/ShouwangH]

---

**Questions?** Review [README.md](README.md) and [ARCHITECTURE.md](ARCHITECTURE.md) first, then contact the original developer if needed.
