# Teacher Zoe — English Practice

Personal English-practice site (speaking, vocabulary, reading) built for a
10-year-old, with an AI mentor ("Teacher Zoe") powered by Claude.

## Run locally

```bash
pip install -r requirements.txt
cp .env.example .env   # then edit .env and paste your real ANTHROPIC_API_KEY
python server.py
```

Open http://localhost:5050 in **Chrome** (the speaking module needs
Chrome's speech recognition support).

## Deploy to Render

1. Push this folder to a GitHub repo (see commands below).
2. On [render.com](https://render.com), **New → Blueprint**, connect the repo.
   Render reads `render.yaml` automatically.
3. When prompted, paste your `ANTHROPIC_API_KEY` as an environment variable
   (Render asks for it because `render.yaml` marks it `sync: false` — it's
   never stored in the repo).
4. Deploy. Render gives you a public URL (e.g. `teacher-zoe.onrender.com`)
   reachable from any device.

**Free tier note:** the free plan spins the server down after ~15 minutes of
no traffic, so the first request after a break takes ~30-50s to wake up.
Upgrade to a paid instance later if that delay bothers her.

### First-time GitHub push

```bash
cd teacher_zoe
git init
git add .
git commit -m "Teacher Zoe - initial version"
git branch -M main
git remote add origin <your-empty-github-repo-url>
git push -u origin main
```

## Project structure

- `server.py` — Flask backend: proxies Claude calls (keeps the API key
  server-side) and generates Teacher Zoe's voice via edge-tts.
- `data/vocab.json`, `data/reading.json` — content, easy to extend.
- `static/` — the frontend (no build step, plain HTML/CSS/JS).
- `audio_cache/` — generated voice clips, gitignored, safe to delete anytime.
