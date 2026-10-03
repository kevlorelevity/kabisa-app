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

### The Kabisa webhook (one Apps Script for suggestions + feedback)
`docs/apps-script/kabisa-webhook.gs` runs as a standalone Apps Script web app under kevin@splotch.ink
(project "Kabisa webhook"). The Vercel functions call it with the new row's id plus the caller's own
Supabase token; the script re-reads the row from Supabase (RLS decides what it may see), so there is
no shared secret. Suggestions → `Suggestions` tab; feedback → email to feedback@kabisa.app
(reply-to = learner) + `Feedback` tab.

To redeploy after editing the script: Deploy → Manage deployments → edit → New version.
Vercel env var (Production): `KABISA_WEBHOOK_URL` = the web app's `/exec` URL.

Until then suggestions are stored in Supabase only (the modal says so).

## Live edits (edit in place)
If the admin changes the text in the "New text" box, the change goes live for everyone as soon as it's saved —
no deploy. It's stored in `public.content_override` (scope = lesson / grammar topic / level, find → replace on
the raw script, before the learner's name and country are swapped in) and applied by `src/lib/contentOverrides.ts`
when the app loads. The suggestion row is marked `applied` and the sheet row shows status `applied`.
The "what should change and why" box is optional.

To undo a live edit: `update public.content_override set active = false where id = '…';`
To make edits permanent in the JSON later, Claude folds active overrides into `content/` and deactivates them.

Not yet covered by live edits: the audio allow-list in `api/tts.ts` only knows the bundled lines (TTS is not
configured in production right now anyway).

## Later: applying suggestions
Planned flow: Claude reads rows with status `new` from `content_suggestion`, proposes concrete edits
to `content/authoring/lessons/*.txt` / `grammar.py` (or the Uber JSON), Kevin approves, Claude applies,
recompiles, sets status `applied` + commit id.

## Learner feedback (💬 button on every page)
`POST /api/feedback` stores the message in `public.feedback`, then calls the Kabisa webhook above,
which emails feedback@kabisa.app (a Google Group; members get every message, reply goes to the learner)
and logs it in the `Feedback` tab. Resend (`RESEND_API_KEY`) remains as an optional alternative.
