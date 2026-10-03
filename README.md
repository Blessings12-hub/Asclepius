# Asclepius

A private study workspace for medical school. Single user.

## What it does

- Years 1-6, each with editable courses (the starter list is a generic curriculum; add, rename or extend it)
- Materials per course: notes, web links, files, and 3D lessons (embed link such as a Sketchfab URL, or upload a `.glb`/`.gltf`)
- Translate to English: paste text or a link in any language, or tick the box when saving a material
- Study help: ask questions, make study guides and quizzes from your own materials
- Flashcards with spaced repetition, interactive quizzes that track your weak topics, and a study planner (all under Today)
- Presentations: PowerPoint or PDF built from your topic and materials, with diagrams from Wikimedia Commons (credit printed on each slide)
- Photo capture: snap handwriting, slides or book pages; they become translated, searchable notes
- Anki: export and import cards as Anki text files
- Search: ask a question across all your materials and get an answer with numbered citations
- Offline: installable on your phone; pages you have opened keep working without internet

New in 0.4:

- **Progress**: study streak, hours studied, a 14-day chart with your daily goal, and a mastery score for every course
- **Focus timer**: Pomodoro sessions (25/5/15 by default, all adjustable). Finished sessions are saved to your streak and hours. The timer runs from the clock, so it stays correct if your phone sleeps or you close the tab
- **Backup and sync**: your data lives in the cloud and is the same on every device. Automatic backups, one-tap restore, and a downloadable backup file
- **Dark mode**: Auto (follows your phone), Light or Dark, remembered per device
- **Drug and lab reference**: searchable, fully editable tables with starter rows

## How "mastery" is worked out

For each course it is the average of two things: how many of your last 100 quiz answers there were right, and the share of its flashcards you now remember for a week or longer. A part only counts once there is enough data (5 quiz answers, 5 cards). A day counts toward your streak if you do at least one minute of focus time, one flashcard, or one quiz answer.

## Put it online with Vercel (works from a phone)

You need three free accounts: GitHub, Vercel and Supabase. Supabase is where your data lives, because Vercel itself cannot save files.

**1. Put the code on GitHub.** Upload this project to a GitHub repository (on a phone, use the GitHub website's "Add file > Upload files"). Do not upload `node_modules` or `data`; the included `.gitignore` is there to keep them out.

**2. Make the database (Supabase).**
1. Create a project at supabase.com. Wait for it to finish setting up.
2. Open **SQL Editor > New query**, paste the whole of `schema.sql`, and press **Run**.
3. Open **Project Settings > API Keys**. Copy the **Project URL** and the **secret** key (starts with `sb_secret_`). If you only see "legacy" keys, copy the `service_role` key instead.
4. Never share the secret key or put it in the app's code. It goes only into Vercel (next step).

**3. Deploy (Vercel).**
1. In Vercel choose **Add New > Project** and import your GitHub repository. No build settings are needed; Vercel recognises the app by itself.
2. Before pressing Deploy, open **Environment Variables** and add:

| Name | Value |
| --- | --- |
| `PASSWORD` | the password you will sign in with (make it long) |
| `SECRET` | any long random text (30+ characters) |
| `ANTHROPIC_API_KEY` | your Anthropic key |
| `SUPABASE_URL` | the Project URL from step 2 |
| `SUPABASE_SECRET_KEY` | the secret key from step 2 |
| `CRON_SECRET` | any other long random text (switches on the nightly backup) |
| `OWNER` | your name (optional, goes in presentation file properties) |

3. Press **Deploy**. If you add or change variables later, redeploy for them to take effect.

**4. Check that everything is switched on.** Open your site, sign in, and go to **Backup and sync**. The Status box lists what is working and what to fix (cloud storage, secret, AI key, nightly backup). Then press **Back up now** once to see it work.

You can also open `https://your-site.vercel.app/api/health` to see yes/no flags without signing in.

### Good to know on Vercel

- **Files:** uploads go straight from your phone to Supabase Storage, so large PDFs and 3D models work. A private bucket called `asclepius` is created automatically the first time you upload. I believe the free Supabase plan limits a single file to 50 MB; check this in your Supabase settings if a big upload fails.
- **Nightly backup:** on the free Vercel plan it runs once a day at some point in the 02:00 UTC hour. The app also makes a backup the first time you open it each day, so it works even without `CRON_SECRET`. The newest 7 automatic, 10 manual and 5 pre-restore backups are kept.
- **Backups live in the same Supabase project as your data.** They protect you from mistakes, not from losing the Supabase account. Download a backup file now and then (the page reminds you).
- **Size limits:** Vercel accepts at most about 4.5 MB per request. Restoring from an uploaded backup *file* is limited by that. Restoring from a saved backup in the list is not.
- **PDF export of presentations** depends on font files that I could not confirm are packaged on Vercel. If it shows an error, use the PowerPoint download.
- **Safe to leave public:** the table is locked so only your server can read it, and every page of the app needs your password.

## Run on your own computer

```bash
npm install
cp .env.example .env   # set PASSWORD, SECRET, ANTHROPIC_API_KEY
npm start              # http://localhost:3000
```

Needs Node 20+. With no Supabase variables set, data is saved in `data/` (git-ignored) and backups in `data/backups/`. Add the two `SUPABASE_` variables to use the cloud instead.

## Notes

- Only add 3D and course content you have the right to use (open-access sources, your university's licensed material, your own files).
- PDFs with real text are read automatically. Scanned (image-only) PDFs are not; paste their text into a note. A PDF whose text cannot be read is still saved and can be opened.
- Slide images are found by search, so check each one fits the slide. Keep the credit line.
- Presentations carry your name (`OWNER`) in the file properties. Check your school's AI policy for graded work.
- The drug and lab tables are for study. The starter rows come from general textbook knowledge, contain no doses, and have not been checked against any particular formulary or laboratory. Normal ranges differ between labs and countries. Check against your own textbooks and local guidelines, and edit freely.
- Offline mode needs HTTPS (or localhost) to install.
