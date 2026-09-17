(() => {
  const modeStudyBtn = document.getElementById("mode-study-btn");
  const modeGameBtn = document.getElementById("mode-game-btn");
  const pickerCard = document.getElementById("picker-card");
  const categoryPicker = document.getElementById("category-picker");
  const pointsPill = document.getElementById("points-pill");

  // Study mode elements
  const deckCard = document.getElementById("deck-card");
  const flashcard = document.getElementById("flashcard");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const progressLabel = document.getElementById("progress-label");
  const changeTopicBtn = document.getElementById("change-topic-btn");

  // Game mode elements
  const quizCard = document.getElementById("quiz-card");
  const quizProgress = document.getElementById("quiz-progress");
  const streakBadge = document.getElementById("streak-badge");
  const quizPrompt = document.getElementById("quiz-prompt");
  const quizChoices = document.getElementById("quiz-choices");
  const nextRoundBtn = document.getElementById("next-round-btn");
  const quizFinishCard = document.getElementById("quiz-finish-card");
  const quizFinishSummary = document.getElementById("quiz-finish-summary");
  const quizPlayAgainBtn = document.getElementById("quiz-play-again-btn");
  const quizChangeTopicBtn = document.getElementById("quiz-change-topic-btn");

  Mentor.render("zoe-avatar-slot", "smile", 64);

  let categories = [];
  let mode = "study";
  let currentCategory = null;

  // Study state
  let words = [];
  let index = 0;
  let flipped = false;

  // Game state
  const ROUNDS = 8;
  let quizRounds = [];
  let roundIndex = 0;
  let streak = 0;
  let sessionPoints = 0;
  let correctCount = 0;

  function updatePointsPill() {
    pointsPill.textContent = `⭐ ${ZoeProgress.getPoints()}`;
  }
  updatePointsPill();

  function setMode(newMode) {
    mode = newMode;
    modeStudyBtn.classList.toggle("active", mode === "study");
    modeGameBtn.classList.toggle("active", mode === "game");
    [deckCard, quizCard, quizFinishCard].forEach(el => (el.style.display = "none"));
    pickerCard.style.display = "block";
  }
  modeStudyBtn.addEventListener("click", () => setMode("study"));
  modeGameBtn.addEventListener("click", () => setMode("game"));

  async function loadCategories() {
    try {
      const res = await fetch("/api/vocab");
      const data = await res.json();
      categories = data.categories;
      categoryPicker.innerHTML = "";
      categories.forEach(cat => {
        const chip = document.createElement("button");
        chip.className = "category-chip";
        chip.textContent = `${cat.icon} ${cat.titleHe}`;
        chip.addEventListener("click", () => {
          currentCategory = cat;
          pickerCard.style.display = "none";
          if (mode === "study") openDeck(cat);
          else startQuiz(cat);
        });
        categoryPicker.appendChild(chip);
      });
    } catch (err) {
      categoryPicker.innerHTML = `<span class="status-line">שגיאה בטעינה - ודא שהשרת רץ</span>`;
    }
  }

  // ---------------- Study mode ----------------
  function openDeck(cat) {
    words = cat.words;
    index = 0;
    flipped = false;
    deckCard.style.display = "block";
    renderCard();
  }

  function renderCard() {
    const w = words[index];
    progressLabel.textContent = `${index + 1} / ${words.length}`;
    if (!flipped) {
      flashcard.innerHTML = `
        <div class="word">${w.word}</div>
        <button class="btn btn-secondary" id="speak-btn" style="margin-top:6px;">🔊 השמע</button>
        <div class="hint">הקש/י לתרגום</div>`;
      document.getElementById("speak-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        ZoeTTS.speak(w.word);
      });
    } else {
      flashcard.innerHTML = `
        <div class="translation">${w.he}</div>
        <div class="example">"${w.example}"</div>
        <div class="hint">הקש/י בחזרה למילה</div>`;
    }
  }

  flashcard.addEventListener("click", () => {
    flipped = !flipped;
    renderCard();
  });

  prevBtn.addEventListener("click", () => {
    index = (index - 1 + words.length) % words.length;
    flipped = false;
    renderCard();
  });
  nextBtn.addEventListener("click", () => {
    index = (index + 1) % words.length;
    flipped = false;
    renderCard();
    ZoeTTS.speak(words[index].word);
  });

  changeTopicBtn.addEventListener("click", () => {
    deckCard.style.display = "none";
    pickerCard.style.display = "block";
  });

  // ---------------- Game mode ----------------
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function buildRounds(cat) {
    const pool = cat.words;
    const n = Math.min(ROUNDS, pool.length);
    const chosen = shuffle(pool).slice(0, n);
    return chosen.map(w => {
      const direction = Math.random() < 0.5 ? "en2he" : "he2en";
      const distractorPool = pool.filter(x => x.word !== w.word);
      const distractors = shuffle(distractorPool).slice(0, 3);
      const options = shuffle([w, ...distractors]);
      return { correct: w, options, direction };
    });
  }

  function startQuiz(cat) {
    quizRounds = buildRounds(cat);
    roundIndex = 0;
    streak = 0;
    sessionPoints = 0;
    correctCount = 0;
    quizCard.style.display = "block";
    renderRound();
  }

  function renderRound() {
    nextRoundBtn.style.display = "none";
    const round = quizRounds[roundIndex];
    quizProgress.textContent = `שאלה ${roundIndex + 1} מתוך ${quizRounds.length}`;
    streakBadge.textContent = `🔥 ${streak}`;

    if (round.direction === "en2he") {
      quizPrompt.textContent = round.correct.word;
      quizPrompt.style.direction = "ltr";
    } else {
      quizPrompt.textContent = round.correct.he;
      quizPrompt.style.direction = "rtl";
    }

    quizChoices.innerHTML = "";
    round.options.forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "quiz-choice";
      const label = round.direction === "en2he" ? opt.he : opt.word;
      btn.textContent = label;
      if (round.direction === "he2en") {
        btn.style.direction = "ltr";
        btn.style.textAlign = "left";
      }
      btn.addEventListener("click", () => answerRound(opt, btn, round));
      quizChoices.appendChild(btn);
    });

    if (round.direction === "he2en") ZoeTTS.speak(round.correct.word);
  }

  function answerRound(opt, btnEl, round) {
    const buttons = Array.from(quizChoices.children);
    buttons.forEach(b => (b.disabled = true));
    const isCorrect = opt.word === round.correct.word;

    if (isCorrect) {
      btnEl.classList.add("correct");
      streak++;
      correctCount++;
      const bonus = Math.min(streak * 2, 20);
      sessionPoints += 10 + bonus;
      if (round.direction === "en2he") ZoeTTS.speak(round.correct.word);
    } else {
      btnEl.classList.add("wrong");
      const correctBtn = buttons.find((b, i) => round.options[i].word === round.correct.word);
      if (correctBtn) correctBtn.classList.add("correct");
      streak = 0;
    }
    streakBadge.textContent = `🔥 ${streak}`;
    nextRoundBtn.style.display = "inline-flex";
    nextRoundBtn.textContent = roundIndex < quizRounds.length - 1 ? "הבא ›" : "סיימי ✓";
  }

  nextRoundBtn.addEventListener("click", () => {
    roundIndex++;
    if (roundIndex < quizRounds.length) {
      renderRound();
    } else {
      finishQuiz();
    }
  });

  function finishQuiz() {
    ZoeProgress.addPoints(sessionPoints);
    ZoeProgress.setVocabBest(currentCategory.id, sessionPoints);
    updatePointsPill();
    quizCard.style.display = "none";
    quizFinishCard.style.display = "block";
    quizFinishSummary.textContent =
      `ענית נכון על ${correctCount} מתוך ${quizRounds.length} ` +
      `וצברת ${sessionPoints} נקודות! ⭐`;
  }

  quizPlayAgainBtn.addEventListener("click", () => {
    quizFinishCard.style.display = "none";
    startQuiz(currentCategory);
  });
  quizChangeTopicBtn.addEventListener("click", () => {
    quizFinishCard.style.display = "none";
    pickerCard.style.display = "block";
  });

  loadCategories();
})();
