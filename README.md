# Asclepius

A private study workspace for medical school. Single user, self-hosted.

- Years 1-6, each with editable courses (the starter list is a generic curriculum; add, rename or extend it)
- Materials per course: notes, web links, files, and 3D lessons (embed link such as a Sketchfab URL, or upload a `.glb`/`.gltf`)
- Translate to English: paste text or a link in any language, or tick the box when saving a material
- Study help: ask questions, make study guides and quizzes from your own materials
- Presentations: download PowerPoint or PDF built from your topic and materials

## Run

```bash
npm install
cp .env.example .env   # set PASSWORD, SECRET, ANTHROPIC_API_KEY
npm start              # http://localhost:3000
```

Needs Node 20+. Data lives in `data/` (git-ignored). Deploy behind HTTPS (Render, Fly.io, a VPS) if you want it on your phone.

## Notes

- Only add 3D and course content you have the right to use (open-access sources, your university's licensed material, your own files).
- Uploaded PDFs are stored and linked, but only `.txt`/`.md` files, notes and links feed the AI. Paste PDF text into a note to include it.
- Presentations have no images yet and carry your name (`OWNER`) in the file properties.

## Next

Flashcards with spaced repetition, question bank tracking, study planner, offline mode, slide images.
