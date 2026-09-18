const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const twilio = require("twilio");

const app = express();
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

function db() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase environment variables are missing.");
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });
}

function validPhone(phone) {
  return /^\+[1-9]\d{7,14}$/.test(phone);
}

app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "Reminder API is running." });
});

app.get("/api/reminders", async (req, res) => {
  try {
    const { data, error } = await db()
      .from("reminders")
      .select("id,phone,message,reminder_at,status,error_message,created_at")
      .order("reminder_at", { ascending: true })
      .limit(100);

    if (error) throw error;

    res.json({ success: true, reminders: data || [] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Could not load reminders." });
  }
});

app.post("/api/reminders", async (req, res) => {
  try {
    const { phone, message, reminder_at } = req.body;

    if (!phone || !message || !reminder_at) {
      return res.status(400).json({
        success: false,
        error: "Phone, message and reminder time are required."
      });
    }

    if (!validPhone(phone)) {
      return res.status(400).json({
        success: false,
        error: "Phone number must use international format, for example +9779812345678."
      });
    }

    if (message.length > 1000) {
      return res.status(400).json({
        success: false,
        error: "Reminder message is too long."
      });
    }

    const reminderDate = new Date(reminder_at);
    if (Number.isNaN(reminderDate.getTime()) || reminderDate.getTime() <= Date.now()) {
      return res.status(400).json({
        success: false,
        error: "Reminder time must be in the future."
      });
    }

    const { data, error } = await db()
      .from("reminders")
      .insert({
        phone,
        message,
        reminder_at: reminderDate.toISOString(),
        status: "pending"
      })
      .select("id,phone,message,reminder_at,status")
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: "Reminder saved.",
      reminder: data
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Could not save reminder." });
  }
});

app.delete("/api/reminders", async (req, res) => {
  try {
    const id = req.query.id;
    if (!id) {
      return res.status(400).json({ success: false, error: "Reminder ID is required." });
    }

    const { error } = await db()
      .from("reminders")
      .update({ status: "cancelled" })
      .eq("id", id)
      .eq("status", "pending");

    if (error) throw error;

    res.json({ success: true, message: "Reminder cancelled." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Could not cancel reminder." });
  }
});

async function sendDueReminders() {
  const supabase = db();

  const now = new Date().toISOString();

  // Claim due reminders first so two cron invocations do not normally send the same SMS.
  const { data: due, error } = await supabase
    .from("reminders")
    .update({ status: "processing", updated_at: now })
    .eq("status", "pending")
    .lte("reminder_at", now)
    .select("*")
    .limit(50);

  if (error) throw error;

  if (!due || due.length === 0) {
    return { processed: 0, sent: 0, failed: 0 };
  }

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    for (const reminder of due) {
      await supabase.from("reminders").update({
        status: "failed",
        error_message: "Twilio environment variables are not configured.",
        updated_at: new Date().toISOString()
      }).eq("id", reminder.id);
    }
    return { processed: due.length, sent: 0, failed: due.length };
  }

  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  let sent = 0;
  let failed = 0;

  for (const reminder of due) {
    try {
      await client.messages.create({
        body: `Reminder: ${reminder.message}`,
        from: TWILIO_PHONE_NUMBER,
        to: reminder.phone
      });

      await supabase.from("reminders").update({
        status: "sent",
        sent_at: new Date().toISOString(),
        error_message: null,
        updated_at: new Date().toISOString()
      }).eq("id", reminder.id);

      sent++;
    } catch (error) {
      console.error("Twilio error:", error);

      await supabase.from("reminders").update({
        status: "failed",
        error_message: String(error.message || "SMS sending failed").slice(0, 1000),
        updated_at: new Date().toISOString()
      }).eq("id", reminder.id);

      failed++;
    }
  }

  return { processed: due.length, sent, failed };
}

app.get("/api/cron/send-reminders", async (req, res) => {
  try {
    const secret = process.env.CRON_SECRET;

    if (secret) {
      const auth = req.headers.authorization || "";
      if (auth !== `Bearer ${secret}`) {
        return res.status(401).json({ success: false, error: "Unauthorized." });
      }
    }

    const result = await sendDueReminders();
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Cron error:", error);
    res.status(500).json({ success: false, error: "Cron job failed." });
  }
});

module.exports = app;

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`Server running on port ${port}`));
}
