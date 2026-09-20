"""
One-off script: adds a Hebrew translation ("exampleHe") of every vocab word's
example sentence in data/vocab.json, via a single batched Claude call.
Run from the project root: python scripts/translate_examples.py
"""
import json
from pathlib import Path

from dotenv import load_dotenv
import os
import anthropic

load_dotenv()

BASE_DIR = Path(__file__).parent.parent
VOCAB_PATH = BASE_DIR / "data" / "vocab.json"

client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

data = json.loads(VOCAB_PATH.read_text(encoding="utf-8"))

# Flatten every example sentence with a stable index.
items = []
for cat in data["categories"]:
    for w in cat["words"]:
        items.append({"idx": len(items), "en": w["example"]})

prompt = (
    "Translate each English sentence below into natural, simple, child-friendly Hebrew "
    "(these are example sentences for a 10-year-old learning English vocabulary). "
    "Keep the same tone and simplicity. Return ONLY a JSON array of Hebrew strings, "
    "in the exact same order, no markdown fences, no explanation.\n\n"
    + json.dumps([it["en"] for it in items], ensure_ascii=False, indent=2)
)

resp = client.messages.create(
    model="claude-sonnet-5",
    max_tokens=4000,
    messages=[{"role": "user", "content": prompt}],
)
raw = "".join(b.text for b in resp.content if getattr(b, "type", None) == "text").strip()
if raw.startswith("```"):
    raw = raw.strip("`")
    if raw.startswith("json"):
        raw = raw[4:]

translations = json.loads(raw)
assert len(translations) == len(items), f"expected {len(items)} got {len(translations)}"

i = 0
for cat in data["categories"]:
    for w in cat["words"]:
        w["exampleHe"] = translations[i]
        i += 1

VOCAB_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Added exampleHe to {i} words.")
