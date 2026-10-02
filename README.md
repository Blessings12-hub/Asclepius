# Asclepius

A private study workspace for medical school. Single user, self-hosted.

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

## Run

```bash
npm install
cp .env.example .env   # set PASSWORD, SECRET, ANTHROPIC_API_KEY
npm start              # http://localhost:3000
```

Needs Node 20+. Data lives in `data/` (git-ignored). Deploy behind HTTPS (Render, Fly.io, a VPS) if you want it on your phone.

## Notes

- Only add 3D and course content you have the right to use (open-access sources, your university's licensed material, your own files).
- PDFs with real text are read automatically. Scanned (image-only) PDFs are not; paste their text into a note.
- Slide images are found by search, so check each one fits the slide. Keep the credit line.
- Presentations carry your name (`OWNER`) in the file properties. Check your school's AI policy for graded work.
- Offline mode needs HTTPS (or localhost) to install.
