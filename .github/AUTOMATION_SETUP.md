# GitHub Actions Automation Setup

## Overview
The NCAA bracket scraper is automated to run every hour on **Thursday-Sunday from 12:00pm to 12:00am PST**.

## Setup Instructions

### 1. Add Database Connection Secret

You need to add your `DATABASE_URL` as a GitHub repository secret:

1. Go to your GitHub repository
2. Click on **Settings** tab
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Add the secret:
   - **Name:** `DATABASE_URL`
   - **Value:** Your PostgreSQL connection string (same as in your `.env.local` file)
   - Example format: `postgresql://user:password@host:port/database`
6. Click **Add secret**

### 2. Enable GitHub Actions

1. Go to the **Actions** tab in your repository
2. If prompted, click **I understand my workflows, go ahead and enable them**
3. You should see the workflow "Scrape NCAA Tournament Results" listed

### 3. Test the Workflow

You can manually trigger the workflow to test it:

1. Go to **Actions** tab
2. Click on **Scrape NCAA Tournament Results** workflow
3. Click **Run workflow** dropdown button
4. Select branch (usually `master` or `main`)
5. Click **Run workflow**
6. Wait for the workflow to complete and check the logs

### 4. Monitor Executions

- **View runs:** Go to Actions tab → Select the workflow
- **Check logs:** Click on any run to see detailed logs
- **Failed runs:** GitHub will send you an email notification if a run fails

## Schedule Details

The scraper runs at these times (PST):
- **Days:** Thursday, Friday, Saturday, Sunday
- **Hours:** 12pm, 1pm, 2pm, 3pm, 4pm, 5pm, 6pm, 7pm, 8pm, 9pm, 10pm, 11pm, 12am (midnight)
- **Total:** 13 runs per day × 4 days = 52 runs per week

## Modifying the Schedule

To change when the scraper runs, edit `.github/workflows/scrape-results.yml`:

```yaml
schedule:
  # Modify these cron expressions
  - cron: '0 20-23 * * 4,5,6,0'  # Thu-Sun evenings (PST 12pm-3pm)
  - cron: '0 0-8 * * 5,6,0,1'     # Fri-Mon mornings (PST 4pm-12am)
```

**Cron syntax:** `minute hour day-of-month month day-of-week`
- Days: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
- Times are in UTC (PST = UTC-8)

## Troubleshooting

### Workflow not running automatically
- Check that the workflow file is in the `master` or `main` branch
- Ensure GitHub Actions are enabled in repository settings
- Wait up to 15 minutes after the scheduled time (GitHub Actions may have delays)

### Database connection errors
- Verify `DATABASE_URL` secret is correctly set
- Ensure your database allows connections from GitHub Actions IPs
- Check database logs for authentication failures

### Puppeteer/Chrome errors
- The workflow installs Chrome dependencies automatically
- Check the "Install Puppeteer dependencies" step in the logs

### Manual testing
You can test the scraper locally before relying on automation:
```bash
npx tsx scripts/scrape-results.ts
```

## Cost
GitHub Actions is **free** for public repositories and includes 2,000 minutes/month for private repos on the free plan. This automation uses approximately:
- ~5 minutes per run
- 52 runs per week = ~260 minutes/week
- Well within free tier limits during tournament season

## Disabling Automation

To temporarily disable:
1. Go to **Actions** tab
2. Click on **Scrape NCAA Tournament Results**
3. Click the **⋯** menu → **Disable workflow**

Or delete the workflow file:
```bash
rm .github/workflows/scrape-results.yml
```
