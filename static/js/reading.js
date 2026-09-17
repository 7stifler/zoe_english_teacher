(() => {
  const trailView = document.getElementById("trail-view");
  const trailEl = document.getElementById("trail");
  const passageView = document.getElementById("passage-view");
  const quizView = document.getElementById("quiz-view");
  const finishView = document.getElementById("finish-view");
  const pointsPill = document.getElementById("points-pill");

  const passageTitle = document.getElementById("passage-title");
  const passageText = document.getElementById("passage-text");
  const speakBtn = document.getElementById("speak-passage-btn");
  const startQuizBtn = document.getElementById("start-quiz-btn");
  const backToTrail = document.getElementById("back-to-trail");

  const quizProgress = document.getElementById("quiz-progress");
  const quizScore = document.getElementById("quiz-score");
  const quizPrompt = document.getElementById("quiz-prompt");
  const quizChoices = document.getElementById("quiz-choices");
  const nextBtn = document.getElementById("next-question-btn");

  const finishStars = document.getElementById("finish-stars");
  const finishPoints = document.getElementById("finish-points");
  const finishBackBtn = document.getElementById("finish-back-btn");

  let passages = [];
  let currentPassage = null;
  let qIndex = 0;
  let correctCount = 0;
  let pointsEarnedThisRound = 0;

  function updatePointsPill() {
    pointsPill.textContent = `⭐ ${ZoeProgress.getPoints()}`;
  }
  updatePointsPill();

  function showView(view) {
    [trailView, passageView, quizView, finishView].forEach(v => (v.style.display = "none"));
    view.style.display = view === trailView ? "block" : "block";
  }

  async function loadPassages() {
    try {
      const res = await fetch("/api/reading");
      const data = await res.json();
      passages = data.passages;
      renderTrail();
    } catch (err) {
      trailEl.innerHTML = `<span class="status-line">שגיאה בטעינה - ודא שהשרת רץ</span>`;
    }
  }

  function renderTrail() {
    trailEl.innerHTML = "";
    const progress = ZoeProgress.getReadingProgress();
    passages.forEach((p, i) => {
      const unlocked = ZoeProgress.isPassageUnlocked(i, passages);
      const done = progress[p.id];
      const station = document.createElement("div");
      station.className = "trail-station";

      const circle = document.createElement("div");
      circle.className = "station-circle" + (!unlocked ? " locked" : done ? " completed" : "");
      circle.textContent = unlocked ? p.icon : "🔒";
      if (done) {
        const starsSpan = document.createElement("div");
        starsSpan.className = "station-stars";
        starsSpan.textContent = "⭐".repeat(done.stars);
        circle.appendChild(starsSpan);
      }
      if (unlocked) {
        circle.addEventListener("click", () => openPassage(p));
      }

      const label = document.createElement("div");
      label.className = "station-label";
      label.innerHTML = `${p.title}<span class="lvl">${p.level}</span>`;

      const spacer = document.createElement("div");
      spacer.className = "spacer";

      station.appendChild(circle);
      station.appendChild(label);
      station.appendChild(spacer);
      trailEl.appendChild(station);
    });
  }

  function openPassage(p) {
    currentPassage = p;
    passageTitle.textContent = p.title;
    passageText.textContent = p.text;
    showView(passageView);
  }

  speakBtn.addEventListener("click", () => {
    if (currentPassage) ZoeTTS.speak(currentPassage.text);
  });

  backToTrail.addEventListener("click", (e) => {
    e.preventDefault();
    ZoeTTS.stop();
    showView(trailView);
  });

  startQuizBtn.addEventListener("click", () => {
    qIndex = 0;
    correctCount = 0;
    pointsEarnedThisRound = 0;
    showView(quizView);
    renderQuestion();
  });

  function renderQuestion() {
    nextBtn.style.display = "none";
    const q = currentPassage.questions[qIndex];
    quizProgress.textContent = `שאלה ${qIndex + 1} מתוך ${currentPassage.questions.length}`;
    quizScore.textContent = `נכונות: ${correctCount}`;
    quizPrompt.textContent = q.q;
    quizPrompt.style.direction = "ltr";
    quizPrompt.style.textAlign = "left";
    quizChoices.innerHTML = "";
    q.choices.forEach((choice, idx) => {
      const btn = document.createElement("button");
      btn.className = "quiz-choice";
      btn.textContent = choice;
      btn.style.direction = "ltr";
      btn.style.textAlign = "left";
      btn.addEventListener("click", () => answer(idx, btn));
      quizChoices.appendChild(btn);
    });
  }

  function answer(idx, btnEl) {
    const q = currentPassage.questions[qIndex];
    const buttons = Array.from(quizChoices.children);
    buttons.forEach(b => (b.disabled = true));
    if (idx === q.correctIndex) {
      btnEl.classList.add("correct");
      correctCount++;
      pointsEarnedThisRound += 10;
    } else {
      btnEl.classList.add("wrong");
      buttons[q.correctIndex].classList.add("correct");
      pointsEarnedThisRound += 2;
    }
    quizScore.textContent = `נכונות: ${correctCount}`;
    nextBtn.style.display = "inline-flex";
    nextBtn.textContent = qIndex < currentPassage.questions.length - 1 ? "הבא ›" : "סיימי ✓";
  }

  nextBtn.addEventListener("click", () => {
    qIndex++;
    if (qIndex < currentPassage.questions.length) {
      renderQuestion();
    } else {
      finishRound();
    }
  });

  function finishRound() {
    const total = currentPassage.questions.length;
    let stars = 1;
    if (correctCount === total) stars = 3;
    else if (correctCount >= Math.ceil(total / 2)) stars = 2;

    pointsEarnedThisRound += 20; // completion bonus
    ZoeProgress.addPoints(pointsEarnedThisRound);
    ZoeProgress.markPassageComplete(currentPassage.id, stars);
    updatePointsPill();

    finishStars.textContent = "⭐".repeat(stars) + "☆".repeat(3 - stars);
    finishPoints.textContent = `צברת ${pointsEarnedThisRound} נקודות בסבב הזה!`;
    showView(finishView);
  }

  finishBackBtn.addEventListener("click", () => {
    renderTrail();
    showView(trailView);
  });

  loadPassages();
})();
