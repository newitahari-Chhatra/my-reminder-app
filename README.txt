SETUP
1. Upload this entire folder to GitHub.
2. Import the repository into Vercel. Keep Root Directory at repository root.
3. Create Supabase project and run supabase.sql in SQL Editor.
4. Add these Vercel Environment Variables:
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_PHONE_NUMBER
CRON_SECRET
5. Redeploy.

BEHAVIOR
The reminder is stored as pending. The scheduler checks periodically. If the scheduled time has passed, it remains due and is sent on the next check. Missing the exact time does not delete it.

This package uses an hourly cron schedule so it can work with plans that allow hourly scheduling. Therefore an SMS may arrive later than the selected time.

IMPORTANT
This starter has no login. Anyone who can access the app can see the reminders. Add authentication before using private data publicly.
