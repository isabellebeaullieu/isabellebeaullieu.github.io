/**
 * Website Leads → Google Sheet
 *
 * Setup (one time):
 * 1. Create a Google Sheet named "Website Leads".
 * 2. Extensions → Apps Script. Delete the sample code and paste this whole file. Click Save.
 * 3. Deploy → New deployment → gear icon → Web app.
 *      Execute as: Me
 *      Who has access: Anyone
 *    Click Deploy, approve access to your own account, and copy the Web app URL.
 * 4. Paste that URL into assets/js/config.js as leadEndpoint (or send it to Claude).
 *
 * If you ever edit this script, use Deploy → Manage deployments → Edit → New version
 * so the same URL keeps working.
 */

// Where lead alerts go. Leave blank to send them to the Google account that owns this sheet.
const NOTIFY_EMAIL = "";

const SHEET_NAME = "Leads";
const HEADERS = [
  "Received", "Name", "Phone", "Email", "Property", "MLS #",
  "Pre-approved", "Timeline", "Has agent", "Message", "Listing ID", "Page", "Status"
];

function doPost(e) {
  const p = (e && e.parameter) || {};

  // Spam trap: real visitors never fill this hidden field
  if (p.company_website) return ok_();

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheet_();
    sheet.appendRow([
      new Date(),
      clean_(p.name), clean_(p.phone), clean_(p.email),
      clean_(p.property) || "General inquiry", clean_(p.mls),
      clean_(p.preapproved), clean_(p.timeline), clean_(p.has_agent),
      clean_(p.message), clean_(p.listing_id), clean_(p.submitted_from),
      "New"
    ]);
  } finally {
    lock.releaseLock();
  }

  notify_(p);
  return ok_();
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME, 0);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold").setBackground("#b2c1df").setFontColor("#2b2f38");
    sheet.setFrozenRows(1);
    sheet.getRange("A:A").setNumberFormat("m/d/yyyy h:mm am/pm");
    sheet.getRange(2, HEADERS.length, 999, 1).setDataValidation(
      SpreadsheetApp.newDataValidation().requireValueInList(["New", "Contacted", "Showing set", "Nurture", "Closed", "Not a fit"]).build()
    );
  }
  return sheet;
}

function notify_(p) {
  const to = NOTIFY_EMAIL || Session.getEffectiveUser().getEmail();
  if (!to) return;
  const property = clean_(p.property) || "General inquiry";
  const lines = [
    "Name: " + clean_(p.name),
    "Phone: " + clean_(p.phone),
    "Email: " + clean_(p.email),
    "Property: " + property + (p.mls ? " (MLS# " + clean_(p.mls) + ")" : ""),
    "Pre-approved: " + clean_(p.preapproved),
    "Timeline: " + clean_(p.timeline),
    "Working with an agent: " + clean_(p.has_agent),
    "",
    "Message:",
    clean_(p.message),
    "",
    "Open the sheet: " + SpreadsheetApp.getActiveSpreadsheet().getUrl()
  ];
  const opts = {};
  if (p.email) opts.replyTo = clean_(p.email);
  MailApp.sendEmail(to, "New lead: " + property + " — " + (clean_(p.name) || "Website visitor"), lines.join("\n"), opts);
}

// Blocks spreadsheet formula injection and trims long input
function clean_(v) {
  let s = String(v == null ? "" : v).trim().slice(0, 2000);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function ok_() {
  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
}

// Run this once from the editor (select testLead, click Run) to check the setup.
function testLead() {
  doPost({ parameter: {
    name: "Test Buyer", email: "test@example.com", phone: "337-555-0100",
    property: "100 Sample Lane, Lafayette, LA 70508", preapproved: "Yes",
    timeline: "1–3 months", message: "This is a test lead."
  }});
}
