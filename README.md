# Asclepius

A private study workspace for medical school. Single user.

## What it does

- 5 years (MBChB, following Lusaka Apex Medical University), each with courses and topics. The starter list is a typical layout, not any university's official outline. Use Course outline to import your own school's outline or edit freely
- Materials per course: notes, web links, files, and 3D lessons (embed link such as a Sketchfab URL, or upload a `.glb`/`.gltf`)
- Translate to English: paste text or a link in any language, or tick the box when saving a material
- Study help: ask questions, make study guides and quizzes from your own materials
- Flashcards with spaced repetition, interactive quizzes that track your weak topics, and a study planner (all under Today)
- Presentations: researched from the web and your materials, with pictures from Wikimedia Commons, Wikipedia and Openverse. Preview every slide, swap or remove pictures, pick a style, then download PowerPoint, PDF or both (picture credits are printed on each slide and on a sources slide)
- Photo capture: snap handwriting, slides or book pages; they become translated, searchable notes
- Anki: export and import cards as Anki text files
- Search: ask a question across all your materials and get an answer with numbered citations
- Offline: installable on your phone; pages you have opened keep working without internet

New in 0.8:

- **Anatomy 3D** (new menu item): searches Sketchfab's public library (no key needed) for skeleton, skull, spine, muscles, heart, brain, nerves, organs and more. In the viewer you can hide parts to peel layers, tap a part to name it and get an AI explanation (attachments, nerve and blood supply, clinical point), take a 3D location quiz, and save the model to any course as a 3D lesson. Model credit and licence are shown; keep them. Parts lists and quizzes only work on models whose parts are named. Other free sources (Z-Anatomy, BodyParts3D, NIH 3D, Smithsonian 3D) are linked there: download a .glb and add it to a course
- **Image atlas**: keep your own histology slides, ECGs, X-rays and diagrams by course, with labels and search. Press Occlusion cards on any image, drag boxes over the labels, and each box becomes a flashcard (the box hides the structure on the front and is outlined on the back)
- **Cloze cards**: write {{c1::hidden words}} or let the AI write them. Each hidden word becomes its own card
- **FSRS scheduling** replaces the old SM-2 intervals for all flashcards. Cards you already have are converted the first time you review them
- **Scanned PDFs**: PDFs with no text layer are read by Gemini (OCR) when you upload them, up to about 15 MB. Needs a Gemini key
- **Concept map** (Practice): a radial map of a topic with memory aids, saved to your notes if you like
- **Listen**: a button on study guides reads them aloud using your device's voice

New in 0.7:

- **5-year MBChB layout** (reference: Lusaka Apex Medical University, 5 years, then internship). Year 6 is gone: any old Year 6 courses move into Year 5 once, keeping their materials, cards and progress. About 25 new courses were added across years 1 to 5 (Neuroscience, Cardiology, Pulmonology, Gastroenterology, Nephrology, Haematology, Rheumatology, Geriatrics, Urology, Neurosurgery, Paediatric Surgery, Cardiothoracic Surgery, Palliative Care, ECG & Imaging, Clinical Research Project and more). The university does not publish its year-by-year course list, so this is a typical Zambian layout: use Course outline to match your handbook
- **Practice** (new menu item): timed mock exam with clinical-vignette questions, OSCE stations with a marking checklist, an AI patient simulator (history, exam, tests, then "Diagnosis:" for feedback), and clinical calculators (GCS, CURB-65, CHA2DS2-VASc, Wells PE, anion gap, corrected calcium, eGFR)
- **Weak topics to planner**: after a mock exam, one tap adds revision items for the topics you get wrong

New in 0.6:

- **Deep research for the study guide**: the guide is built in four steps. It reads many websites at once (StatPearls chapters on NCBI Bookshelf, full Wikipedia articles, MedlinePlus, Wikibooks, Wikiversity, review abstracts from Europe PMC/PubMed, and, with a Gemini key, a Google-grounded web search that reads pages such as NHS, Mayo Clinic and Merck Manual). It then plans 6-8 sections, writes each one in detail (explanation, key points, comparison table, memory aid, clinical link, source numbers), and adds a glossary, high-yield facts, pitfalls and 12-15 practice questions. The PDF has a contents box, learning objectives, numbered sources and page numbers
- **The PowerPoint is now the short version of that guide**: one slide per guide section with 3-4 short points and a picture, an "Inside the study guide (PDF)" slide that lists what the PDF contains, and a "Full detail: study guide, section N" tag on every slide. Download everything in one zip (guide PDF + PowerPoint), or each file by itself
- **More courses**: General & Inorganic Chemistry, Organic Chemistry, Medical Biology & Genetics, Medical Physics, Latin, Informatics & Biostatistics, History of Medicine, English, Pathological Anatomy, Pathological Physiology, Operative Surgery & Topographic Anatomy, Hygiene, Propaedeutics, Clinical Pharmacology, Nutrition, Infectious Diseases, Endocrinology, Oncology, Anaesthesiology, Phthisiology and a Year 6. They are added once, automatically, to your existing course list (nothing is renamed, changed or removed). More topics under Biochemistry. Edit or delete any of them under Course outline

Notes for 0.6: a full guide takes about 1-2 minutes (several AI calls). The free Gemini limit is per minute and per day, so wait a minute if you see the limit message. Web search with Google needs a Gemini key and has its own free daily allowance; if it is used up the guide is still built from the other sites. The Websites read line under each guide shows which sites answered.

New in 0.5:

- **Study help is easier to read**: answers show as headings, bullets, tables and bold key terms instead of one long text. Study guides are split into collapsible sections with a high-yield box, common pitfalls and tap-to-reveal practice questions. Download a guide as a PDF, save it to your notes, copy it, or turn it into flashcards
- **Better presentations**: topic research from Wikipedia, several picture choices per slide, three styles, title, outline, steps, comparison, key-number and summary slides, and speaker notes
- **Better PDFs**: the slide PDF matches the PowerPoint design, and medical symbols such as arrows, Greek letters and subscripts are converted so they print correctly

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
| `GEMINI_API_KEY` | free key from aistudio.google.com (or use `GROQ_API_KEY` from console.groq.com) |
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
- **PDF export of presentations** uses a PDFKit build that has its fonts built in, so it works on Vercel. PowerPoint is still the better format if you want to keep editing.
- **Offline:** once you have opened a page while online, it opens again with no signal. Flashcard reviews and focus sessions done offline are saved on your phone and sync by themselves when you are back online.
- **Sign-in protection:** after 5 wrong passwords from one address the sign-in locks (5 minutes, then longer). Sign-in lasts 30 days; use **Sign out** on the Backup page on shared devices.
- **Review reminders:** set a time on the Today page. The app reminds you when it is open; the **Add to my calendar** button gives a daily reminder that works even when the app is closed.
- **Safe to leave public:** the table is locked so only your server can read it, and every page of the app needs your password.

## Run on your own computer

```bash
npm install
cp .env.example .env   # set PASSWORD, SECRET, GEMINI_API_KEY
npm start              # http://localhost:3000
```

Needs Node 20+. With no Supabase variables set, data is saved in `data/` (git-ignored) and backups in `data/backups/`. Add the two `SUPABASE_` variables to use the cloud instead.

## Free AI

The app uses Google Gemini or Groq, both of which have free tiers that I believe need no card. Set one key and it is picked automatically. Free limits (requests per minute and per day) change and are shown in your provider's dashboard; I could not confirm exact numbers. When a limit is hit, the app tells you and tries the backup model. Model names change over time: if you see "model not found", set `AI_MODELS` to a current name. Free tiers may use your prompts to improve the provider's products (check their terms), so avoid putting patient-identifying information in. Photo notes need Gemini, or Groq with a vision model.

## Notes

- Only add 3D and course content you have the right to use (open-access sources, your university's licensed material, your own files).
- PDFs with real text are read automatically. Scanned (image-only) PDFs are not; paste their text into a note. A PDF whose text cannot be read is still saved and can be opened.
- Slide pictures are found by search, so check each one in the preview. Keep the credit lines. Wikipedia text is used only as background reading; check facts against your textbooks.
- Building a presentation takes 20-60 seconds (research, writing, picture search). On Vercel the function limit is 60 seconds, so choose 8-12 slides if a build ever times out.
- Presentations carry your name (`OWNER`) in the file properties. Check your school's AI policy for graded work.
- The drug and lab tables are for study. The starter rows come from general textbook knowledge, contain no doses, and have not been checked against any particular formulary or laboratory. Normal ranges differ between labs and countries. Check against your own textbooks and local guidelines, and edit freely.
- Offline mode needs HTTPS (or localhost) to install.
