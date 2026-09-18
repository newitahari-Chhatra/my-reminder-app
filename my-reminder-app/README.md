# My Reminder App

A simple Vercel + GitHub reminder app that stores reminders in Supabase and sends SMS through Twilio.

## What you need

1. A GitHub account
2. A Vercel account
3. A Supabase project
4. A Twilio account and SMS-capable Twilio number

## Step 1 — Supabase

Create a Supabase project.

Open the Supabase SQL Editor and run the contents of `supabase.sql`.

From Supabase Project Settings > API, copy:
- Project URL
- Service Role Key

## Step 2 — Twilio

Create a Twilio account and obtain:
- Account SID
- Auth Token
- Twilio phone number capable of sending SMS

## Step 3 — GitHub

Upload this entire folder to a GitHub repository.

Do not upload secrets. `.gitignore` is already included.

## Step 4 — Vercel

Import the GitHub repository into Vercel.

Keep the Root Directory as the repository root (`./`).

Add these Environment Variables in Vercel:

SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
CRON_SECRET=make_a_long_random_secret

Redeploy after adding the variables.

## Important

The browser converts the selected local date/time into an absolute timestamp. The backend stores that timestamp in Supabase.

Vercel Cron calls `/api/cron/send-reminders` every minute. The job finds due reminders and sends their SMS through Twilio.

Actual SMS timing depends on the Vercel Cron schedule/plan and Twilio delivery. It should be treated as "around the selected minute", not a guaranteed exact second.

## Security note

This starter does not have user accounts. Anyone who can access the app can see the reminders returned by `/api/reminders`. For a public production app, add authentication and per-user access control before storing private reminders or phone numbers.

## Local test

From the project root:

cd backend
npm install
node server.js

The frontend can be served with any static server. Vercel deployment is the intended setup.
