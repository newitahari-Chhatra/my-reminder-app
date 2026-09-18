create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  message text not null,
  reminder_at timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending','processing','sent','failed','cancelled')),
  sent_at timestamptz null,
  error_message text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reminders_due_idx
on public.reminders(status, reminder_at);

-- This starter app keeps the database behind the server-side service-role key.
-- Do not put SUPABASE_SERVICE_ROLE_KEY in frontend code.
