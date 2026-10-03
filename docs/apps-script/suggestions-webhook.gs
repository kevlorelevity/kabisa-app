/**
 * Kabisa — admin suggestions webhook.
 * Bound to the "Kabisa — Admin content suggestions" Google Sheet.
 * Receives POSTs from api/suggestion.ts and appends one row per suggestion.
 *
 * Setup: Extensions → Apps Script → paste this file → Project Settings →
 * Script properties → add SECRET (same value as SUGGESTIONS_SHEET_SECRET on Vercel)
 * → Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone → copy the URL.
 */
function doPost(e) {
  var body = JSON.parse(e.postData.contents || '{}');
  var secret = PropertiesService.getScriptProperties().getProperty('SECRET');
  if (!secret || body.secret !== secret) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'forbidden' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  var sheet = SpreadsheetApp.getActive().getSheetByName('Suggestions');
  sheet.appendRow([
    body.createdAt ? new Date(body.createdAt) : new Date(),
    'new',
    body.reviewer_name || '',
    body.reviewer_email || '',
    body.kind || '',
    body.target_label || '',
    body.lesson_id || '',
    body.target_type || '',
    body.item_id || '',
    body.current_text || '',
    body.suggestion || '',
    body.proposed_text || '',
    body.page || '',
    body.id || '',
    '', '', ''
  ]);
  var last = sheet.getLastRow();
  sheet.getRange(last, 1).setNumberFormat('yyyy-mm-dd hh:mm');
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
