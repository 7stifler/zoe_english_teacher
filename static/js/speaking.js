(() => {
  Track.pageView("speaking");
  const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
  const chatLog = document.getElementById("chat-log");
  const micBtn = document.getElementById("mic-btn");
  const statusLine = document.getElementById("status-line");
  const pickerCard = document.getElementById("picker-card");
  const chatCard = document.getElementById("chat-card");
  const categoryPicker = document.getElementById("category-picker");
  const changeTopicBtn = document.getElementById("change-topic-btn");
  const turnCounterEl = document.getElementById("turn-counter");

  const TURNS_KEY = "zoe-speaking-turns-v1";
  const pointsPill = document.getElementById("points-pill");
  let currentCategory = null;
  let currentWords = [];
  let conversationHistory = []; // [{speaker: "zoe"|"me", text}] - the real, growing conversation
  let recognition = null;
  let isListening = false;

  function getTurns() {
    return parseInt(localStorage.getItem(TURNS_KEY) || "0", 10);
  }
  function bumpTurns() {
    const n = getTurns() + 1;
    localStorage.setItem(TURNS_KEY, String(n));
    ZoeProgress.addPoints(5);
    updateTurnCounter();
    updatePointsPill();
    Track.send("speaking_turn", { category: currentCategory ? currentCategory.title : "" });
  }
  function updateTurnCounter() {
    const n = getTurns();
    turnCounterEl.textContent = n > 0
      ? `דיברת עם Zoe ${n} פעמים עד עכשיו! כל הכבוד 🌟`
      : "בואי נדבר קצת אנגלית!";
  }
  function updatePointsPill() {
    if (pointsPill) pointsPill.textContent = `⭐ ${ZoeProgress.getPoints()}`;
  }
  updateTurnCounter();
  updatePointsPill();

  // ---------- Voice output (English TTS) ----------
  const speakEnglish = (text) => ZoeTTS.speak(text);

  // ---------- Chat rendering ----------
  function avatarHtml(who) {
    const src = who === "zoe" ? "img/zoe-avatar.png" : "img/daniel-avatar.png";
    const fallback = who === "zoe" ? "🧑‍🏫" : "🙂";
    return `<span class="msg-avatar msg-avatar-${who}">${fallback}<img src="${src}" alt="" onerror="this.style.display='none'"></span>`;
  }

  function addBubble(text, who) {
    const row = document.createElement("div");
    row.className = `msg-row msg-row-${who}`;
    const bubbleHtml = `<div class="bubble ${who}"></div>`;
    row.innerHTML = who === "me"
      ? `${bubbleHtml}${avatarHtml(who)}`
      : `${avatarHtml(who)}${bubbleHtml}`;
    row.querySelector(".bubble").textContent = text;
    chatLog.appendChild(row);
    chatLog.scrollTop = chatLog.scrollHeight;
    return row;
  }
  function addHint(text, isEnglish) {
    if (!text) return;
    const div = document.createElement("div");
    div.className = isEnglish ? "bubble hint-en" : "bubble hint";
    div.textContent = isEnglish ? `💡 ${text}` : `💡 ${text}`;
    chatLog.appendChild(div);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  function showZoeResponse(data) {
    addBubble(data.reply_en, "zoe");
    if (data.corrected_model_sentence) {
      addHint(`Try saying: "${data.corrected_model_sentence}"`, true);
    }
    if (data.hebrew_hint) {
      addHint(data.hebrew_hint, false);
    }
    conversationHistory.push({ speaker: "zoe", text: data.reply_en || "" });
    speakEnglish(data.reply_en);
  }

  // ---------- Category picking ----------
  async function loadCategories() {
    try {
      const res = await fetch("/api/vocab");
      const data = await res.json();
      categoryPicker.innerHTML = "";
      data.categories.forEach(cat => {
        const chip = document.createElement("button");
        chip.className = "category-chip";
        chip.textContent = `${cat.icon} ${cat.titleHe}`;
        chip.addEventListener("click", () => startSession(cat));
        categoryPicker.appendChild(chip);
      });
    } catch (err) {
      categoryPicker.innerHTML = `<span class="status-line">שגיאה בטעינת נושאים - ודא שהשרת רץ</span>`;
    }
  }

  async function startSession(cat) {
    currentCategory = cat;
    currentWords = cat.words.slice(0, 6).map(w => w.word);
    conversationHistory = [];
    pickerCard.style.display = "none";
    chatCard.style.display = "block";
    chatLog.innerHTML = "";
    statusLine.textContent = "Zoe חושבת...";
    micBtn.disabled = true;

    try {
      const res = await fetch("/api/speaking/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryTitle: cat.title, words: currentWords }),
      });
      const data = await res.json();
      showZoeResponse(data);
      statusLine.textContent = "לחצי על המיקרופון ותתחילי לדבר";
    } catch (err) {
      addBubble("Oops, I couldn't connect. Please check the server.", "zoe");
      statusLine.textContent = "שגיאת חיבור לשרת";
    }
    micBtn.disabled = false;
  }

  changeTopicBtn.addEventListener("click", () => {
    chatCard.style.display = "none";
    pickerCard.style.display = "block";
  });

  // ---------- Speech recognition ----------
  if (!SpeechRecognitionAPI) {
    document.getElementById("unsupported-card").style.display = "block";
    pickerCard.style.display = "none";
  } else {
    recognition = new SpeechRecognitionAPI();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      isListening = true;
      micBtn.classList.add("listening");
      statusLine.textContent = "מקשיבה... דברי עכשיו 🎙️";
    };

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      addBubble(transcript, "me");
      statusLine.textContent = "Zoe חושבת...";
      await sendTranscript(transcript);
    };

    recognition.onerror = async (event) => {
      if (event.error === "no-speech") {
        statusLine.textContent = "לא שמעתי כלום, ננסה שוב?";
        await sendTranscript("");
      } else {
        statusLine.textContent = "הייתה שגיאה בזיהוי הדיבור, נסי שוב";
      }
    };

    recognition.onend = () => {
      isListening = false;
      micBtn.classList.remove("listening");
    };

    micBtn.addEventListener("click", () => {
      if (isListening) {
        recognition.stop();
        return;
      }
      ZoeTTS.stop();
      try {
        recognition.start();
      } catch (e) {
        // already started - ignore
      }
    });
  }

  async function sendTranscript(transcript) {
    const historyForRequest = conversationHistory.slice(); // before this turn's "me" entry
    conversationHistory.push({ speaker: "me", text: transcript });
    try {
      const res = await fetch("/api/speaking/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          categoryTitle: currentCategory ? currentCategory.title : "general topics",
          words: currentWords,
          history: historyForRequest,
        }),
      });
      const data = await res.json();
      showZoeResponse(data);
      if (transcript) bumpTurns();
      statusLine.textContent = "לחצי על המיקרופון ותתחילי לדבר";
    } catch (err) {
      addBubble("Oops, I couldn't connect. Please check the server.", "zoe");
      statusLine.textContent = "שגיאת חיבור לשרת";
    }
  }

  loadCategories();
})();
