# Admin suggestions (pencil icons) & feedback

## Who is an admin
Accounts whose email is in `public.admin_email` get `role = 'admin'` when they first sign in
(migration `006b_admin_allowlist.sql`). Seeded: `kevin@kabisa.app`, `wanyonyi@kabisa.app`.
Add someone: `insert into public.admin_email (email) values ('name@kabisa.app');`
(if they already have an account: `update public.account set role = 'admin' where email = 'name@kabisa.app';`).

Admins see a small ✎ next to lesson titles, context notes, every dialogue line and its English,
every MCQ option, word explanations (in the tap tooltip), practice prompts/sentences/explanations,
vocab & flashcards, level names, and every grammar-explainer title, paragraph, table and example.

## Where suggestions go
1. `public.content_suggestion` in Supabase (always) — the source of truth Claude will read later.
2. The Google Sheet **Kabisa — Admin content suggestions** (tab `Suggestions`) via an Apps Script web app.
   Columns: timestamp, status (new/approved/applied/rejected), reviewer, email, type, where, lesson,
   element, item id, current text, suggestion, proposed text, page, suggestion id, approved by, commit, notes.

### Connecting the sheet (one-time, ~3 minutes)
1. Open the sheet → Extensions → Apps Script. Paste `docs/apps-script/suggestions-webhook.gs`, save.
2. Project Settings → Script properties → add `SECRET` = a long random string.
3. Deploy → New deployment → type **Web app** → Execute as **Me** → Who has access **Anyone** → Deploy, authorise, copy the URL.
4. Vercel → kabisa project → Settings → Environment Variables (Production):
   `SUGGESTIONS_SHEET_WEBHOOK` = the URL, `SUGGESTIONS_SHEET_SECRET` = the same secret. Redeploy.

Until then suggestions are stored in Supabase only (the modal says so).

## Later: applying suggestions
Planned flow: Claude reads rows with status `new` from `content_suggestion`, proposes concrete edits
to `content/authoring/lessons/*.txt` / `grammar.py` (or the Uber JSON), Kevin approves, Claude applies,
recompiles, sets status `applied` + commit id.

## Learner feedback (💬 button on every page)
`POST /api/feedback` stores the message in `public.feedback` and emails it via Resend.
Env vars: `RESEND_API_KEY` (resend.com, with kabisa.app verified), optional `FEEDBACK_TO`
(default `feedback@kabisa.app`) and `FEEDBACK_FROM`. Without the key, feedback is stored only.
