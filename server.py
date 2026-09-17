"""
Teacher Zoe - English speaking practice server.
Serves the static frontend and proxies conversation/feedback calls to Claude,
so the Anthropic API key never reaches the browser. Also generates warm,
natural female English narration server-side via edge-tts (the browser's
built-in voices on this machine default to a male voice, which doesn't fit
Teacher Zoe's character).
"""
import asyncio
import hashlib
import json
import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory, send_file, abort
import anthropic
import edge_tts

load_dotenv()

BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
STATIC_DIR = BASE_DIR / "static"
AUDIO_CACHE_DIR = BASE_DIR / "audio_cache"
AUDIO_CACHE_DIR.mkdir(exist_ok=True)

API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
PORT = int(os.environ.get("PORT", "5050"))
MODEL = "claude-sonnet-5"
STUDENT_NAME = "Daniel"
MAX_HISTORY_TURNS = 12  # trailing {speaker, text} entries kept for context (6 exchanges)

# Warm, natural neural voice for Teacher Zoe - caring but confident young woman.
ZOE_VOICE = "en-US-AvaNeural"
ZOE_RATE = "-8%"  # slightly slower, easier for a young English learner to follow

app = Flask(__name__, static_folder=str(STATIC_DIR), static_url_path="")
client = anthropic.Anthropic(api_key=API_KEY) if API_KEY and "your-key-here" not in API_KEY else None

ZOE_SYSTEM_PROMPT = f"""You are "Teacher Zoe", an English speaking coach for a 10-year-old Israeli girl
named {STUDENT_NAME}. She can read Hebrew and basic English, but she is SHY about speaking English out
loud and has a limited vocabulary, so she has barely practiced speaking before.

Your personality: warm, caring, patient — but you NEVER let a student give up. You gently push her
to keep trying rather than switching the conversation to Hebrew or moving on without an attempt.
Students adore you because you make them feel safe AND proud of real progress.

You are having a REAL, CONTINUOUS CONVERSATION with {STUDENT_NAME} — you will see the full exchange so
far as conversation history. Actually lead it: remember what she already told you, build on it, refer
back to earlier things she said, and let one topic naturally flow into the next, the way a real teacher
having a chat with a student would — don't treat each turn as an isolated, disconnected Q&A.

Strict rules for every reply:
1. Address her by name sometimes ("{STUDENT_NAME}") — warmly, like a teacher who knows her — instead of
   generic pet names like "my star" every time. Vary it naturally; don't use her name in literally every
   single message, that gets robotic.
2. Always start with genuine, specific praise for what she DID try — even a one-word or broken attempt.
3. Keep YOUR OWN sentences short and simple (CEFR A1-A2), max 2-3 short sentences, natural spoken English.
4. If she made a grammar/vocabulary mistake, model the correct form by naturally repeating her idea
   correctly — never say "wrong" or "incorrect". Example style: "Oh nice! You mean: I HAVE a dog. Yes!
   Tell me more about your dog."
5. Ask exactly ONE simple, concrete follow-up question to keep the conversation going — ideally building
   on what she just said (not a generic new question), using vocabulary from the given category when natural.
6. If her transcript is empty, very short, or clearly a nervous stall ("um", "I don't know"), respond with
   extra warmth and a small hint or an easier version of the question — do NOT scold her, do NOT skip her turn.
7. You may include ONE short Hebrew phrase in parentheses only if it helps her feel reassured or clarifies
   a hard word — but at least 80% of your reply must be English so she gets real practice.
8. Never lecture with a list of corrections. One gentle correction at a time, folded into natural speech.

Respond ONLY with valid JSON, no markdown fences, matching this shape:
{{"reply_en": "<what Zoe says out loud, English, 2-3 short sentences>",
 "hebrew_hint": "<optional short Hebrew reassurance/clarification, or empty string>",
 "corrected_model_sentence": "<the clean correct version of what she was trying to say, for her to hear again, or empty string if no correction needed>"}}
"""


def call_zoe(messages: list) -> dict:
    if client is None:
        return {
            "reply_en": f"Teacher Zoe needs her API key first! Ask a grown-up to add it to the .env file.",
            "hebrew_hint": "צריך להוסיף מפתח API בקובץ .env כדי שזואי תוכל לדבר",
            "corrected_model_sentence": "",
        }
    resp = client.messages.create(
        model=MODEL,
        max_tokens=400,
        system=ZOE_SYSTEM_PROMPT,
        messages=messages,
    )
    text_blocks = [b.text for b in resp.content if getattr(b, "type", None) == "text"]
    raw = "".join(text_blocks).strip()
    # Be defensive: strip accidental code fences if the model adds them.
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.startswith("json"):
            raw = raw[4:]
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {"reply_en": raw, "hebrew_hint": "", "corrected_model_sentence": ""}


def build_kickoff_text(category_title: str, words: list) -> str:
    word_list = ", ".join(words[:6])
    return (
        f"Let's start a new speaking practice session with {STUDENT_NAME}. "
        f"Topic category: {category_title}. Some vocabulary words she recently studied: {word_list}. "
        f"Greet her by name ({STUDENT_NAME}), then ask one simple, friendly opening question about this "
        f"topic to get her talking."
    )


@app.route("/")
def home():
    return send_from_directory(STATIC_DIR, "index.html")


@app.route("/api/vocab")
def api_vocab():
    return jsonify(json.loads((DATA_DIR / "vocab.json").read_text(encoding="utf-8")))


@app.route("/api/reading")
def api_reading():
    return jsonify(json.loads((DATA_DIR / "reading.json").read_text(encoding="utf-8")))


@app.route("/api/speaking/start", methods=["POST"])
def speaking_start():
    body = request.get_json(force=True) or {}
    category_title = body.get("categoryTitle", "general topics")
    words = body.get("words", [])
    kickoff = build_kickoff_text(category_title, words)
    return jsonify(call_zoe([{"role": "user", "content": kickoff}]))


@app.route("/api/speaking/reply", methods=["POST"])
def speaking_reply():
    body = request.get_json(force=True) or {}
    transcript = (body.get("transcript") or "").strip()
    category_title = body.get("categoryTitle", "general topics")
    words = body.get("words", [])
    history = body.get("history", [])[-MAX_HISTORY_TURNS:]

    # Rebuild the full conversation as real multi-turn messages, so Claude actually
    # remembers what was said and can lead a continuous conversation instead of
    # answering each turn in isolation.
    messages = [{"role": "user", "content": build_kickoff_text(category_title, words)}]
    for turn in history:
        role = "assistant" if turn.get("speaker") == "zoe" else "user"
        text = (turn.get("text") or "").strip()
        if text:
            messages.append({"role": role, "content": text})

    if transcript:
        final_text = f'(from speech recognition, may contain small errors): "{transcript}"'
    else:
        final_text = (
            "(she stayed silent / the microphone did not catch anything - gently encourage her "
            "to try, maybe offer a simpler version of the question or a word to start with. "
            "Do not skip her turn.)"
        )
    messages.append({"role": "user", "content": final_text})

    return jsonify(call_zoe(messages))


@app.route("/api/tts", methods=["POST"])
def api_tts():
    body = request.get_json(force=True) or {}
    text = (body.get("text") or "").strip()
    if not text:
        return abort(400)
    if len(text) > 800:
        text = text[:800]

    cache_key = hashlib.md5(f"{ZOE_VOICE}|{ZOE_RATE}|{text}".encode("utf-8")).hexdigest()
    cache_path = AUDIO_CACHE_DIR / f"{cache_key}.mp3"

    if not cache_path.exists():
        async def generate():
            communicate = edge_tts.Communicate(text, ZOE_VOICE, rate=ZOE_RATE)
            await communicate.save(str(cache_path))

        try:
            asyncio.run(generate())
        except Exception as exc:
            return jsonify({"error": str(exc)}), 500

    return send_file(cache_path, mimetype="audio/mpeg")


@app.route("/health")
def health():
    return jsonify({"ok": True, "api_key_configured": client is not None})


if __name__ == "__main__":
    # Local dev only. In production (Render), gunicorn imports `app` directly
    # and this block never runs - see render.yaml's startCommand.
    print(f"Teacher Zoe server starting on http://localhost:{PORT}")
    if client is None:
        print("WARNING: ANTHROPIC_API_KEY not set in .env yet - Zoe will show a placeholder message.")
    app.run(host="0.0.0.0", port=PORT, debug=True)
