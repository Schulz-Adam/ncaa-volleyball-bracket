# n8n Automation Setup Guide

This guide will walk you through setting up n8n to automatically run the NCAA bracket scraper on schedule.

## Overview

- **API Endpoint:** `https://your-app.vercel.app/api/cron/scrape-results`
- **Schedule:** Thursday-Sunday, 12pm-12am PST (hourly)
- **Method:** n8n will trigger the Vercel API endpoint via HTTP POST

---

## Step 1: Generate a Secret Token

First, generate a secure random token for authentication:

### Option A: Online Generator
1. Go to: https://www.uuidgenerator.net/
2. Click "Generate"
3. Copy the UUID (e.g., `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)

### Option B: Command Line
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Save this token** - you'll need it in multiple places!

---

## Step 2: Add Secret to Your Project

### Local Development (.env.local)
Add to your `.env.local` file:
```
CRON_SECRET=your-generated-token-here
```

### Vercel Deployment
1. Go to: https://vercel.com/your-username/ncaa-volleyball-bracket/settings/environment-variables
2. Add new environment variable:
   - **Name:** `CRON_SECRET`
   - **Value:** Your generated token
   - **Environments:** Production, Preview, Development
3. Click **Save**
4. **Redeploy** your app (go to Deployments → click ⋯ → Redeploy)

---

## Step 3: Choose Your n8n Setup

### Option A: n8n Cloud (Easiest - Recommended for Beginners)

**Pros:**
- No setup required
- Always online
- Free tier available (20 workflows)
- No maintenance

**Cons:**
- Limited to 5,000 executions/month on free tier
- Our schedule needs ~52 executions/week = ~224/month (well within limit!)

**Get Started:**
1. Go to: https://n8n.io/cloud/
2. Click **"Try n8n Cloud free"**
3. Sign up with email or Google
4. Skip to **Step 4** below

---

### Option B: Self-Hosted n8n (For Advanced Users)

**Prerequisites:**
- A server (VPS, Raspberry Pi, home computer that runs 24/7)
- Docker installed
- Basic command line knowledge

**Quick Setup with Docker:**

1. Create a directory:
```bash
mkdir n8n-data
cd n8n-data
```

2. Run n8n:
```bash
docker run -d \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  --restart unless-stopped \
  n8nio/n8n
```

3. Access n8n at: http://localhost:5678

4. Create an account (stored locally)

**Alternative - Docker Compose:**

Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  n8n:
    image: n8nio/n8n
    restart: unless-stopped
    ports:
      - "5678:5678"
    volumes:
      - ~/.n8n:/home/node/.n8n
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=changeme
```

Run: `docker-compose up -d`

---

## Step 4: Create the n8n Workflow

### Method 1: Import Workflow JSON (Easiest)

1. In n8n, click **"Add workflow"** (+ button top right)
2. Click the **⋯** menu → **Import from File**
3. Copy and paste this JSON into a file named `ncaa-scraper.json`:

```json
{
  "name": "NCAA Bracket Scraper",
  "nodes": [
    {
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "cronExpression",
              "expression": "0 20-23 * * 4,5,6,0"
            }
          ]
        }
      },
      "name": "Schedule Trigger - Thu-Sun 12pm-3pm PST",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1,
      "position": [
        240,
        300
      ],
      "id": "1"
    },
    {
      "parameters": {
        "rule": {
          "interval": [
            {
              "field": "cronExpression",
              "expression": "0 0-8 * * 5,6,0,1"
            }
          ]
        }
      },
      "name": "Schedule Trigger - Thu-Sun 4pm-12am PST",
      "type": "n8n-nodes-base.scheduleTrigger",
      "typeVersion": 1,
      "position": [
        240,
        500
      ],
      "id": "2"
    },
    {
      "parameters": {
        "url": "https://your-app.vercel.app/api/cron/scrape-results",
        "authentication": "genericCredentialType",
        "genericAuthType": "httpHeaderAuth",
        "options": {}
      },
      "name": "Call Scraper API",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.1,
      "position": [
        460,
        400
      ],
      "credentials": {
        "httpHeaderAuth": {
          "id": "1",
          "name": "Bearer Token"
        }
      },
      "id": "3"
    },
    {
      "parameters": {
        "conditions": {
          "boolean": [
            {
              "value1": "={{ $json.success }}",
              "value2": true
            }
          ]
        }
      },
      "name": "Check Success",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [
        680,
        400
      ],
      "id": "4"
    }
  ],
  "connections": {
    "Schedule Trigger - Thu-Sun 12pm-3pm PST": {
      "main": [
        [
          {
            "node": "Call Scraper API",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Schedule Trigger - Thu-Sun 4pm-12am PST": {
      "main": [
        [
          {
            "node": "Call Scraper API",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Call Scraper API": {
      "main": [
        [
          {
            "node": "Check Success",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
}
```

4. **IMPORTANT:** Update the URL in the workflow:
   - Click on **"Call Scraper API"** node
   - Change URL from `your-app.vercel.app` to your actual Vercel URL
   - Click **Save**

5. Set up credentials:
   - Click on **"Call Scraper API"** node
   - Click **"Create New Credential"** for HTTP Header Auth
   - **Name:** `Authorization`
   - **Value:** `Bearer YOUR_CRON_SECRET_HERE`
   - Click **Save**

---

### Method 2: Build Workflow Manually

#### 1. Create New Workflow
- Click **"Add workflow"** (+)
- Name it: **"NCAA Bracket Scraper"**

#### 2. Add Schedule Triggers (2 nodes needed for split schedule)

**First Trigger - Thu-Sun 12pm-3pm PST:**
1. Click **"Add first step"**
2. Search for **"Schedule Trigger"**
3. Select **Cron Expression** mode
4. Enter: `0 20-23 * * 4,5,6,0`
   - Translation: Every hour from 8pm-11pm UTC (12pm-3pm PST) on Thu/Fri/Sat/Sun
5. Name it: **"Schedule - 12pm-3pm PST"**

**Second Trigger - Thu-Sun 4pm-12am PST:**
1. Add another **Schedule Trigger** node
2. Cron Expression: `0 0-8 * * 5,6,0,1`
   - Translation: Every hour from 12am-8am UTC (4pm-12am PST previous day)
3. Name it: **"Schedule - 4pm-12am PST"**

#### 3. Add HTTP Request Node
1. Add **"HTTP Request"** node
2. Connect both schedule triggers to it
3. Configure:
   - **Method:** POST
   - **URL:** `https://your-actual-vercel-url.vercel.app/api/cron/scrape-results`
   - **Authentication:** Generic Credential Type → HTTP Header Auth
   - Create credential:
     - **Name:** `Authorization`
     - **Value:** `Bearer YOUR_CRON_SECRET`
4. Name it: **"Call Scraper API"**

#### 4. Add Error Handling (Optional but Recommended)
1. Add **"IF"** node after HTTP Request
2. Condition: `{{ $json.success }} equals true`
3. Connect **False** output to **"Send Email"** or **"Send Message"** node for notifications

#### 5. Save and Activate
- Click **Save** (top right)
- Toggle **Active** switch (top right)

---

## Step 5: Test the Workflow

### Test Execution
1. In n8n, open your workflow
2. Click **"Execute Workflow"** button (play icon, top right)
3. Watch the execution:
   - Green = Success
   - Red = Error
4. Click on nodes to see their output

### Check Results
- Look for `"success": true` in the HTTP Request node output
- Check `scrapedMatches` and `updatedMatches` counts
- Verify in your app that matches were updated

---

## Step 6: Monitor & Troubleshoot

### View Execution History
- In n8n, click **"Executions"** (left sidebar)
- See all past runs with success/failure status
- Click any execution to see details

### Common Issues

**Error: "Unauthorized"**
- Check that CRON_SECRET matches in:
  - Vercel environment variables
  - n8n HTTP Request Authorization header
- Make sure format is: `Bearer YOUR_TOKEN` (with space)

**Error: "Can't reach database"**
- This is expected if using Supabase free tier
- Vercel can connect fine; GitHub Actions cannot
- No action needed - this is why we're using Vercel API!

**Error: "Timeout"**
- Scraper takes too long (>10s on Vercel Hobby)
- Upgrade to Vercel Pro for 60s timeout
- Or optimize scraper code

**Workflow not triggering**
- Check that workflow is **Active** (toggle top right)
- Verify cron expression is correct
- n8n Cloud free tier: max 5,000 executions/month

---

## Schedule Breakdown

Our schedule runs **13 times per day** on **4 days per week**:

### Days
- Thursday, Friday, Saturday, Sunday

### Times (PST)
- 12:00 PM, 1:00 PM, 2:00 PM, 3:00 PM
- 4:00 PM, 5:00 PM, 6:00 PM, 7:00 PM
- 8:00 PM, 9:00 PM, 10:00 PM, 11:00 PM
- 12:00 AM (midnight)

### Total Executions
- 13 executions/day × 4 days = **52 executions per week**
- ~**224 executions per month** (well within n8n free tier limit)

---

## Advanced: Add Notifications

Want to get notified when scraper runs? Add these nodes after the "Check Success" IF node:

### Email Notifications
1. Add **"Gmail"** or **"Send Email"** node
2. Connect to **True** output (success) or **False** output (failure)
3. Configure email settings
4. Message: `Scraped {{ $node["Call Scraper API"].json["scrapedMatches"] }} matches!`

### Slack/Discord
1. Add **"Slack"** or **"Discord"** node
2. Similar setup as email
3. Can send rich notifications with match details

---

## Maintenance

### Modify Schedule
1. Open workflow in n8n
2. Click on Schedule Trigger nodes
3. Update cron expression
4. Click **Save**

### Pause Automation
1. Open workflow
2. Toggle **Active** switch to **Inactive**

### Delete Workflow
1. In workflow list, click **⋯** on your workflow
2. Click **Delete**

---

## Getting Help

- **n8n Documentation:** https://docs.n8n.io
- **n8n Community:** https://community.n8n.io
- **Cron Expression Helper:** https://crontab.guru

## Next Steps

After setup:
1. ✅ Test workflow manually
2. ✅ Wait for first scheduled run
3. ✅ Check execution history
4. ✅ Verify matches updated in your app
5. 🎉 Enjoy automated bracket updates!
