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

New in 1.4:

- **Pharmacology guides now read like a pharmacology course.** Every drug topic opens with "Classification at a glance": a table of every type, subtype and class with all of its drugs, and a second table of the targets (for autonomic drugs: M1 to M5, NM, NN, alpha1, alpha2, beta1 to beta3 and so on) with where each one is and what it does when activated or blocked. Then one section per drug class with TWO tables, one row per drug in the same order: (1) subtype or target and mechanism, effects, main uses; (2) adverse effects, contraindications and interactions, usual dose, route and frequency. Physiology is kept to what explains the drug target. At most 14 drugs per section (big classes are split), up to 26 sections, 15-20 practice questions
- **Drugs are listed under their subtype.** A drug topic now has one section per subtype or target (for autonomic drugs: M1, M2, M3, M4 and M5, NM, NN, alpha1, alpha2, beta1, beta2, beta3, dopamine, the cholinesterase inhibitors and so on), and the drugs sit under the subtype they act on, activators first and blockers after, with the other subtypes they also act on named in their row. The opening classification table has one row per subtype with two columns of drugs: those that activate it and those that block it. The same rule now applies to every course: each subtype is named with all its members under it (organisms, diseases, enzymes, structures), and topics with types open with a "Classification at a glance" table
- **General pharmacology topics** (principles, pharmacokinetics, pharmacodynamics, interactions, adverse reactions, prescribing, special groups) get their own checklist instead of a drug table: routes, formulas with worked examples, CYP450 lists, ADR types, example drug pairs
- **Every other course gets a full-course checklist** chosen from the course name: anatomy (relations, supply, nerve supply, muscle tables), histology and embryology, physiology, biochemistry and chemistry, microbiology and immunology (one row per organism), pathology, public health (formulas, study designs), and clinical courses (classification, criteria, investigations, first-line drugs with dose and duration). Guides have 10-16 sections, 10-14 points per section and tables of up to 25 rows
- **Reactions, symbols and drawings (all courses that need them).** Biochemistry, chemistry, physiology, physics, anatomy, histology, microbiology, pathology, public health and clinical guides now carry: (1) "Reactions and formulas" boxes with real symbols (H₂O, NAD⁺, CH₃–CO–COO⁻, → and ⇌, Δ, Greek letters, t½ = 0.693 × Vd / CL) and the enzyme, cofactors and regulation underneath; (2) drawn pathway and cycle diagrams (glycolysis, TCA, urea cycle, life cycles, cascades, management pathways) with the enzyme on every arrow and what is used and released; (3) a real picture found on Wikimedia Commons (a structure, labelled anatomy drawing, micrograph, graph, ECG) with its credit. Everything also prints in the PDF. The PDF now uses the DejaVu fonts (free licence, in `lib/fonts`) so symbols are not turned into plain text. Pictures are found automatically from a search, so check each one matches the topic. If the picture search finds nothing, the figure is left out. The AI writes the reactions and diagrams: check them against your textbook
- More topics count as drug topics (treatment regimens, antiepileptics, analgesics, anticoagulants, diuretics and so on), so TB regimens and similar get the drug layout
- The Pharmacology course has 7 more starter topics (respiratory, gastrointestinal, blood, analgesics and anaesthetics, antimalarial/antiparasitic/antiviral, anticancer and immunosuppressant, toxicology). To get them: Course outline > Starter 6-year structure > Add. It only adds topics you do not have yet
- PowerPoint slides for drug topics now see the drug names of each class
- Not tested against a real AI or live websites (tested with a stand-in AI). Longer sections take longer to write and use more of the free AI allowance. Check every dose against the Zambian STG or your formulary

New in 1.3:

- **Presentations and PowerPoints are now separate from study guides.** The Presentation tab no longer builds a study guide. It researches the topic, writes a detailed presentation (rich sections with speaker notes, tables, glossary, questions) and offers it as its own PDF. The PowerPoint is then summarised from that presentation, with pictures. The Study guide tab is unchanged and keeps its own PDF
- **Choose how many slides** (8, 10, 12, 15, 20, 25 or 30) before building. The number is the total: title slide with the topic name, outline and sources slides are included. Changing the number and building again reuses the presentation you already have
- **All downloads kept:** everything as a zip (presentation PDF + PowerPoint), PowerPoint only, slides as PDF, presentation PDF, and the study guide PDF in the Study guide tab
- **Full detail in every guide and presentation, doses included.** Drug topics are organised by type and subtype (for autonomic drugs: muscarinic M1 to M5, nicotinic NM and NN, cholinesterase inhibitors, alpha1, alpha2, beta1 to beta3 and so on). Every drug gets a row with its subtype and mechanism, uses, adverse effects, contraindications, interactions and usual dose and route. Doses come only from the sources or well-established practice; otherwise the cell says "see formulary". Check doses against the Zambian STG or your formulary before relying on them. All other courses are told to list every type, subtype, classification, stage and grade with the defining numbers
- Tested locally (PowerPoint and PDF builds with 17 slides, drug tables with a dose column). Not tested against live websites or an AI key

New in 1.2:

- **Deeper research for every study guide.** Guides now name every important item instead of a few examples (every organism, enzyme, nerve, condition in the topic), with 7-10 sections, longer sections and tables that list all items
- **Drug mode for Pharmacology, Clinical Pharmacology, Psychopharmacology, antimicrobials, toxicology and anaesthesia topics.** The research also reads Wikipedia drug-list and ATC pages, more StatPearls drug chapters and a drug-focused web search. The guide is planned one section per drug class, each with a table that has a row for every drug (mechanism, uses, adverse effects and cautions), then class-wide facts: contraindications, pregnancy, interactions, monitoring, drugs of choice, antidotes. Physiology is kept to a sentence. Practice questions ask which drug, which adverse effect, which contraindication. Doses are still left out (check your guideline)
- **Study guide for every topic** (button on each course page, under Topics): researches and writes a full guide for each topic in the course outline, one after another, and joins them into one guide and one PDF. It takes 20 to 40 minutes for a big course and uses a lot of the free AI allowance; keep the page open. A topic that fails is listed in the overview so you can build it alone
- Guide PDFs and limits raised so long guides are not cut off (up to 160 sections, 400 sources)
- Not tested against the live websites from where this was written: if a site returns nothing, the guide still builds from the others, and the "Websites read" line shows which ones worked

New in 1.1:

- **Microscopy and Macroscopy are now separate** (two menu items). Microscopy is what you see down the microscope: histology, cytology, smears, histopathology, stained microbes and parasites, electron micrographs. Macroscopy is what you see by eye: gross specimens and cut organs, dissections, cultures on plates, and how disease looks on the patient. The AI problems differ too (a macroscopy slide is described like a gross specimen: size, shape, colour, cut surface)
- **Organised per course, with every topic**: Microscopy, Macroscopy, ECG trainer and Imaging trainer each open on your courses (headline = the course, grouped by year). Open a course to see every topic in its outline, each with prepared searches. Tap one, then save a picture straight to that course and topic. "My slides" and the Slide quiz are grouped and filtered by course and topic. Courses are read from your Course outline, so if you reorganise courses or add topics they appear here too (a topic with no prepared searches is searched by its own name)
- **Anatomy 3D** has a "Browse by course" panel too (Anatomy, Neuroscience, Cardiology, Neurosurgery and others), every topic with 3D model searches
- **Paste a question in any language** (Practice > Question bank): paste one question or several, with lab values or answer options if it has them. It is translated to English, answered, and saved with the other questions for the course and type you pick (Clinical cases, Lab interpretation, Viva, Practical or My question). The original text stays under the question. Needs an AI key. The answer is written by the AI, so check it against your textbook or guideline
- **Code blue simulator** (Practice > Code blue): a full-code adult cardiac arrest played step by step. Ten cases (VF, pulseless VT, PEA and asystole, with causes such as hyperkalaemia, tamponade, tension pneumothorax, haemorrhage, pulmonary embolism, hypothermia, organophosphate poisoning and asthma). Start compressions, attach the monitor, read the rhythm on the live trace, shock or not, give epinephrine and amiodarone on time, look for and treat the reversible cause. You get a scored debrief and the result feeds your weak topics (under Emergency Medicine). It works offline and needs no AI key. It follows the general shape of the AHA and ERC adult algorithms; your hospital protocol and the Zambian guideline come first, and doses should be checked there
- **Notifications when the app is closed** (Settings and tools): a real push notification on your phone for timetable blocks when they start, the daily flashcard reminder, exam countdowns (14, 7, 3, 1 days and on the day) and a streak nudge at 19:00. Turn it on once per device, then press "Send a test now". On an iPhone, first add Asclepius to the Home Screen and open it from there. No extra packages and no keys to set up: the server makes its own push keys the first time. **One more step for on-time delivery:** a closed app cannot wake itself, so something must call the server every minute. Create a free job at cron-job.org that opens `https://YOUR-APP.vercel.app/api/cron/notify?key=YOUR_CRON_SECRET` every minute (CRON_SECRET is the same value you already use for the nightly backup; set it in Vercel if you have not). Vercel's own free cron only runs once a day, so it cannot do this. Without the scheduler the test button still works but timed notifications will not arrive. Each notification is sent once per day and device
- Slides you saved earlier under Microscopy that are really gross specimens: use "Move to Macroscopy" on the slide
- The prepared searches live in `public/slidebank.js` (plain text, one line per topic, separated by |). Edit it to add your own. The searches were written from the course outline and have not all been tested against Wikimedia Commons, so some will return few or no pictures: try different words in the search box

New in 1.0:

- **Exams and auto-timetable** (Focus timer page): add exam dates; "Build my timetable" shares your daily study blocks by how close each exam is and how weak your quiz answers are, with breaks
- **Past papers** (Practice): paste a paper (or pick a saved material, e.g. a photo of a paper) and get each question with a model answer in the Question bank, plus a chart of topics that repeat
- **Predict exam questions** (Question bank): paste lecture slides or notes and get likely exam questions with hidden answers
- **Logbook** (Practice): procedures by level (observed, assisted, supervised, independent) against editable targets. The starter targets are examples, not your school's official numbers. Patient names and ID or phone numbers are refused
- **Differential trainer**, **Case presenter** and **Lecture recorder** (Practice). The recorder sends 4-minute chunks to Gemini for transcription (needs a Gemini key), then makes notes and flashcards
- **ECG trainer** and **Imaging trainer** (new menu items): the same find, save, quiz and AI-problems flow as Microscopy, for ECGs, X-rays, CT and ultrasound
- **Label quiz** on Image atlas pictures: draw boxes in Occlusion cards, press Save for label quiz, then type the names
- **Calculators**: child weight, tube size and fluid estimates, and a dose-by-weight calculator (arithmetic only; you enter the dose from your guideline)
- **Zambian guidelines links** at the top of the Drug and lab reference page
- **Settings and tools** (new menu item): text size, daily card limit, screen lock PIN, offline pack, Anki .apkg export and import (Node 22.5 or newer on the server), and a 26-week study heatmap (also on the Progress page)
- Fixes a crash in the Question bank tab from version 0.9

New in 0.9:

- **Alarm and timetable** (Focus timer page): pick an alarm tone (bell, chime, digital, siren), volume, and whether it keeps ringing until you press Stop. Build a daily timetable of study blocks, breaks and meals with from and to times, per weekday, or use Quick fill to generate study blocks with breaks. The alarm rings at the start of every block while the app is open, and when a focus session or break ends. "Add to phone alarms" downloads a .ics file that repeats weekly in your phone calendar, which also rings when the app is closed
- **Question bank** (Practice): clinical case questions, lab interpretation, viva and practical questions for any course, with the answer hidden until you tap Reveal answer. Mark "I knew it" or "I missed it" to feed your weak topics. "Fill every course in Year N" generates cases and lab questions for a whole year (skips what already exists). Needs an AI key
- **Microscopy** (new menu item): search Wikimedia Commons for histology, pathology, haematology and microbiology micrographs, save them to a course with their credit and licence, make AI problems for a slide (identify, stain, key features, diagnosis, clinical link), and take a slide quiz with the title hidden until you reveal it. With a Gemini key the AI looks at the image; otherwise it works from the title and description. Always check AI answers against your atlas

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
