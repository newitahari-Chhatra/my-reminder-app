const form = document.getElementById("reminderForm");
const statusBox = document.getElementById("status");
const submitButton = document.getElementById("submitButton");
const dateInput = document.getElementById("date");
const remindersBox = document.getElementById("reminders");

function localDateString() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

dateInput.min = localDateString();

function showStatus(message, type = "success") {
  statusBox.textContent = message;
  statusBox.className = `status ${type}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[c]));
}

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

async function loadReminders() {
  try {
    const response = await fetch("/api/reminders");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load reminders.");

    if (!data.reminders.length) {
      remindersBox.innerHTML = '<p class="muted">No reminders yet.</p>';
      return;
    }

    remindersBox.innerHTML = data.reminders.map(r => `
      <div class="reminder">
        <div class="reminder-top">
          <div class="reminder-message">${escapeHtml(r.message)}</div>
          <span class="badge ${r.status}">${escapeHtml(r.status)}</span>
        </div>
        <div class="reminder-meta">
          ${escapeHtml(formatDate(r.reminder_at))} · ${escapeHtml(r.phone)}
        </div>
        ${r.status === "pending" ? `<button class="delete-btn" onclick="cancelReminder('${r.id}')">Cancel</button>` : ""}
        ${r.error_message ? `<div class="reminder-meta">Error: ${escapeHtml(r.error_message)}</div>` : ""}
      </div>
    `).join("");
  } catch (error) {
    remindersBox.innerHTML = `<p class="muted">${escapeHtml(error.message)}</p>`;
  }
}

async function cancelReminder(id) {
  if (!confirm("Cancel this reminder?")) return;

  try {
    const response = await fetch(`/api/reminders?id=${encodeURIComponent(id)}`, {
      method: "DELETE"
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not cancel reminder.");
    showStatus("Reminder cancelled.");
    loadReminders();
  } catch (error) {
    showStatus(error.message, "error");
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const phone = document.getElementById("phone").value.trim();
  const message = document.getElementById("message").value.trim();
  const date = dateInput.value;
  const time = document.getElementById("time").value;

  // Convert the user's local date/time to an absolute UTC timestamp.
  const reminderAt = new Date(`${date}T${time}`);

  if (Number.isNaN(reminderAt.getTime()) || reminderAt.getTime() <= Date.now()) {
    showStatus("Please choose a future date and time.", "error");
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Saving...";

  try {
    const response = await fetch("/api/reminders", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        phone,
        message,
        reminder_at: reminderAt.toISOString()
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not create reminder.");

    showStatus("Reminder saved successfully. The SMS will be sent around the selected time.");
    form.reset();
    dateInput.min = localDateString();
    loadReminders();
  } catch (error) {
    showStatus(error.message, "error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Set Reminder";
  }
});

loadReminders();
setInterval(loadReminders, 30000);
