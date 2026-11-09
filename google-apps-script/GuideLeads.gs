/**
 * Guide Leads → Google Sheet  (Buyer's Guide and Seller's Guide downloads)
 *
 * This is a SEPARATE sheet from "Website Leads". Every row is marked
 * "Buyer" or "Seller" in the Lead Type column and color-coded:
 *   Buyer  = green      Seller = blue
 *
 * Setup (one time):
 * 1. Create a new Google Sheet named "Guide Leads".
 * 2. Extensions → Apps Script. Delete the sample code and paste this whole file. Click Save.
 * 3. Deploy → New deployment → gear icon → Web app.
 *      Execute as: Me
 *      Who has access: Anyone
 *    Click Deploy, approve access to your own account, and copy the Web app URL.
 * 4. Send that URL to Claude, or paste it into assets/js/config.js as guideLeadEndpoint.
 *
 * If you ever edit this script, use Deploy → Manage deployments → Edit → New version
 * so the same URL keeps working.
 */

// Where lead alerts go (your Compass inbox). Leave blank to send them to the Google account that owns this sheet.
const NOTIFY_EMAIL = "isabelle.beaullieu@compass.com";

const SHEET_NAME = "Guide Leads";
const HEADERS = ["Received", "Lead Type", "Name", "Phone", "Email", "Guide", "Page", "Status"];
const COLORS = { Buyer: "#dcebe2", Seller: "#dde5f4" };

function doPost(e) {
  const p = (e && e.parameter) || {};

  // Spam trap: real visitors never fill this hidden field
  if (p.company_website) return ok_();

  const type = /^seller$/i.test(p.lead_type) ? "Seller" : "Buyer";
  const guide = clean_(p.guide) || (type === "Seller" ? "Seller’s Guide" : "Buyer’s Guide");

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheet_();
    sheet.appendRow([
      new Date(), type, clean_(p.name), clean_(p.phone), clean_(p.email),
      guide, clean_(p.submitted_from), "New"
    ]);
    sheet.getRange(sheet.getLastRow(), 1, 1, HEADERS.length).setBackground(COLORS[type]);
  } finally {
    lock.releaseLock();
  }

  notify_(p, type, guide);
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
      SpreadsheetApp.newDataValidation().requireValueInList(["New", "Contacted", "Nurture", "Appointment set", "Client", "Not a fit"]).build()
    );
    sheet.getRange(2, 2, 999, 1).setFontWeight("bold");
  }
  return sheet;
}

function notify_(p, type, guide) {
  const to = NOTIFY_EMAIL || Session.getEffectiveUser().getEmail();
  if (!to) return;
  const lines = [
    "Lead type: " + type,
    "Guide: " + guide,
    "",
    "Name: " + clean_(p.name),
    "Phone: " + clean_(p.phone),
    "Email: " + clean_(p.email),
    "",
    "Open the sheet: " + SpreadsheetApp.getActiveSpreadsheet().getUrl()
  ];
  const opts = {};
  if (p.email) opts.replyTo = clean_(p.email);
  MailApp.sendEmail(to, "New " + type + " lead: " + guide + " download — " + (clean_(p.name) || "Website visitor"), lines.join("\n"), opts);
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

// Run these once from the editor (pick the function, click Run) to check the setup.
function testBuyerLead() {
  doPost({ parameter: { lead_type: "Buyer", guide: "Buyer’s Guide", name: "Test Buyer", email: "test@example.com", phone: "(337) 555-0100", submitted_from: "https://isabellebeaullieu.com/buyers-guide/" } });
}
function testSellerLead() {
  doPost({ parameter: { lead_type: "Seller", guide: "Seller’s Guide", name: "Test Seller", email: "test@example.com", phone: "(337) 555-0101", submitted_from: "https://isabellebeaullieu.com/sellers-guide/" } });
}
