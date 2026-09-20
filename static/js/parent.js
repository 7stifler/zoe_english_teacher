(() => {
  const daysToggle = document.getElementById("days-toggle");
  const reportSummary = document.getElementById("report-summary");
  const visitsByDay = document.getElementById("visits-by-day");
  const feedEl = document.getElementById("feed");
  const resetProgressBtn = document.getElementById("reset-progress-btn");
  const clearEventsBtn = document.getElementById("clear-events-btn");

  const PAGE_NAMES = { index: "דשבורד", speaking: "תרגול דיבור", vocab: "אוצר מילים", reading: "מסלול קריאה" };

  let currentDays = 7;

  function fmtTime(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleString("he-IL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
    } catch (e) {
      return iso;
    }
  }

  function describe(e) {
    const m = e.meta || {};
    switch (e.event) {
      case "page_view":
        return `פתחה את "${PAGE_NAMES[m.page] || m.page}"`;
      case "reading_complete":
        return `סיימה טקסט קריאה "${m.passage}" — ${m.correct}/${m.total} נכון, ${"⭐".repeat(m.stars || 0)} (+${m.points} נק')`;
      case "vocab_game_complete":
        return `שיחקה משחק אוצר מילים "${m.category}" — ${m.correct}/${m.total} נכון (+${m.points} נק')`;
      case "speaking_turn":
        return `דיברה עם Zoe (נושא: ${m.category || "-"})`;
      default:
        return e.event;
    }
  }

  async function loadReport() {
    reportSummary.innerHTML = "";
    feedEl.innerHTML = "טוען...";
    try {
      const res = await fetch(`/api/parent/report?days=${currentDays}`);
      const data = await res.json();

      const stats = [
        { icon: "📱", value: data.total_visits, label: "כניסות לאתר" },
        { icon: "🗣️", value: data.event_counts.speaking_turn || 0, label: "שיחות דיבור" },
        { icon: "🎮", value: data.event_counts.vocab_game_complete || 0, label: "משחקי מילים" },
        { icon: "🗺️", value: data.event_counts.reading_complete || 0, label: "טקסטים שהושלמו" },
      ];
      reportSummary.innerHTML = stats.map(s => `
        <div class="card stat-tile"><div class="stat-icon">${s.icon}</div><div class="stat-value">${s.value}</div><div class="stat-label">${s.label}</div></div>
      `).join("");

      if (data.visits_by_day.length) {
        const rows = data.visits_by_day.map(([day, n]) => `<tr><td>${day}</td><td>${n}</td></tr>`).join("");
        visitsByDay.innerHTML = `
          <table class="parent-table">
            <thead><tr><th>תאריך</th><th>כניסות</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>`;
      } else {
        visitsByDay.innerHTML = `<p style="color:var(--ink-soft);font-size:0.85rem;">אין עדיין נתוני כניסה בתקופה הזו.</p>`;
      }

      if (data.recent.length) {
        feedEl.innerHTML = data.recent.map(e => `
          <div class="feed-item">
            <div>${describe(e)}</div>
            <div class="feed-time">${fmtTime(e.ts)}</div>
          </div>`).join("");
      } else {
        feedEl.innerHTML = `<p style="color:var(--ink-soft);font-size:0.85rem;">אין עדיין פעילות רשומה.</p>`;
      }
    } catch (err) {
      feedEl.innerHTML = `<p style="color:var(--ink-soft);">שגיאה בטעינת הדוח - ודא שהשרת רץ.</p>`;
    }
  }

  daysToggle.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-days]");
    if (!btn) return;
    currentDays = parseInt(btn.dataset.days, 10);
    [...daysToggle.children].forEach(b => b.classList.toggle("active", b === btn));
    loadReport();
  });

  resetProgressBtn.addEventListener("click", () => {
    if (!confirm("לאפס את כל הנקודות, הכוכבים והמשחקים במכשיר הזה? אי אפשר לבטל.")) return;
    ZoeProgress.resetAll();
    alert("אופס! ההתקדמות במכשיר הזה אופסה.");
    window.location.href = "index.html";
  });

  clearEventsBtn.addEventListener("click", async () => {
    if (!confirm("למחוק את כל יומן הפעילות בשרת? אי אפשר לבטל.")) return;
    await fetch("/api/parent/clear-events", { method: "POST" });
    loadReport();
  });

  loadReport();
})();
