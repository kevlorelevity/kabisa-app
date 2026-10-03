/**
 * Kabisa webhook (Google Apps Script web app, runs as kevin@splotch.ink).
 *
 * Called by the Vercel functions after they store a row in Supabase:
 *   api/feedback.ts   → { type: 'feedback',   id, accessToken, anonKey }
 *   api/suggestion.ts → { type: 'suggestion', id, accessToken, anonKey }
 *
 * No shared secret: the script re-reads the row from Supabase with the
 * caller's own access token (RLS: learners see only their own feedback, only
 * admins see suggestions). A forged call without a real, signed-in user and a
 * real row does nothing. The Supabase URL is pinned below, so a caller can't
 * point it elsewhere. The anon key is Supabase's public, publishable key.
 *
 * - feedback   → emails feedback@kabisa.app (reply-to = the learner) and logs a row in the "Feedback" tab
 * - suggestion → appends a row to the "Suggestions" tab for review
 *
 * Deploy: Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone.
 * Put the /exec URL in Vercel as KABISA_WEBHOOK_URL.
 */
var SUPABASE_URL = 'https://jqfrcubhisppewfetomn.supabase.co';
var SHEET_ID = '17cdK8vHzL2gWSScuAY-vB1fS8NlHhvmQH7j6lIsOnjg';
var FEEDBACK_TO = 'feedback@kabisa.app';

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!body.id || !body.accessToken || !body.anonKey) return reply_({ ok: false, error: 'bad_request' });

    var cache = CacheService.getScriptCache();
    var seenKey = body.type + ':' + body.id;
    if (cache.get(seenKey)) return reply_({ ok: true, duplicate: true });

    if (body.type === 'feedback') {
      var fb = fetchRow_('feedback', body);
      if (!fb) return reply_({ ok: false, error: 'not_found' });
      emailFeedback_(fb);
      logFeedback_(fb);
    } else if (body.type === 'suggestion') {
      var s = fetchRow_('content_suggestion', body);
      if (!s) return reply_({ ok: false, error: 'not_found' });
      appendSuggestion_(s);
    } else {
      return reply_({ ok: false, error: 'unknown_type' });
    }
    cache.put(seenKey, '1', 21600);
    return reply_({ ok: true });
  } catch (err) {
    console.error(err);
    return reply_({ ok: false, error: String(err) });
  }
}

function fetchRow_(table, body) {
  var id = String(body.id).replace(/[^0-9a-fA-F-]/g, '');
  var res = UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/' + table + '?select=*&id=eq.' + id, {
    headers: { apikey: body.anonKey, Authorization: 'Bearer ' + body.accessToken },
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) return null;
  var rows = JSON.parse(res.getContentText());
  return rows && rows.length ? rows[0] : null;
}

function esc_(s) {
  return String(s == null ? '' : s).replace(/[<>&"']/g, function (c) {
    return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function emailFeedback_(fb) {
  var who = fb.display_name || fb.email || 'A learner';
  var subject = 'Kabisa feedback from ' + who + (fb.context ? ' · ' + fb.context : '');
  var html =
    '<p style="white-space:pre-wrap;font-size:15px">' + esc_(fb.message) + '</p><hr>' +
    '<p style="color:#666;font-size:13px">From: ' + esc_(who) + (fb.email ? ' &lt;' + esc_(fb.email) + '&gt;' : '') +
    '<br>Page: ' + esc_(fb.page || '—') + (fb.context ? '<br>Context: ' + esc_(fb.context) : '') +
    '<br>Browser: ' + esc_(fb.user_agent || '—') + '<br>Sent: ' + esc_(fb.created_at) + '</p>';
  var opts = { htmlBody: html, name: 'Kabisa Feedback' };
  if (fb.email) opts.replyTo = fb.email;
  // The script sends as its owner (kevin@splotch.ink). Gmail never shows you a
  // copy of your own message coming back through a group you're in, so the
  // owner would never see it via feedback@kabisa.app. Cc the owner directly;
  // other group members (e.g. Wanyonyi) still get it through the group.
  var owner = Session.getEffectiveUser().getEmail();
  if (owner) opts.cc = owner;
  MailApp.sendEmail(FEEDBACK_TO, subject, fb.message + '\n\n— ' + who + '\nPage: ' + (fb.page || '—'), opts);
}

function tab_(name, headers) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return sh;
}

function logFeedback_(fb) {
  var sh = tab_('Feedback', ['Timestamp (EAT)', 'Name', 'Email', 'Context', 'Message', 'Page', 'Browser', 'Feedback ID', 'Status', 'Notes']);
  sh.appendRow([new Date(fb.created_at), fb.display_name || '', fb.email || '', fb.context || '', fb.message || '', fb.page || '', fb.user_agent || '', fb.id, 'new', '']);
  sh.getRange(sh.getLastRow(), 1).setNumberFormat('yyyy-mm-dd hh:mm');
}

function appendSuggestion_(s) {
  var sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Suggestions');
  sh.appendRow([
    new Date(s.created_at), 'new', s.reviewer_name || '', s.reviewer_email || '', s.kind || '',
    s.target_label || '', s.lesson_id || '', s.target_type || '', s.item_id || '',
    s.current_text || '', s.suggestion || '', s.proposed_text || '', s.page || '', s.id, '', '', '',
  ]);
  sh.getRange(sh.getLastRow(), 1).setNumberFormat('yyyy-mm-dd hh:mm');
}

function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** Run once from the editor to grant permissions (mail, sheets, external requests). */
function authorize() {
  SpreadsheetApp.openById(SHEET_ID).getName();
  MailApp.getRemainingDailyQuota();
  UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/', { muteHttpExceptions: true });
}
