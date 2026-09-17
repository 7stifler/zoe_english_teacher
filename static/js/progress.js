/**
 * Shared points/progress store (localStorage), used by the reading trail,
 * the vocabulary game, and the dashboard summary.
 */
const ZoeProgress = (() => {
  const POINTS_KEY = "zoe-points-v1";
  const READING_KEY = "zoe-reading-progress-v1"; // { [passageId]: { stars: 1-3 } }
  const VOCAB_BEST_KEY = "zoe-vocab-best-v1"; // { [categoryId]: bestScore }
  const SPEAKING_TURNS_KEY = "zoe-speaking-turns-v1";

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      /* storage unavailable - fail silently, app still works this session */
    }
  }

  function getPoints() {
    return parseInt(localStorage.getItem(POINTS_KEY) || "0", 10);
  }
  function addPoints(n) {
    const total = getPoints() + n;
    localStorage.setItem(POINTS_KEY, String(total));
    return total;
  }

  function getReadingProgress() {
    return readJSON(READING_KEY, {});
  }
  function markPassageComplete(passageId, stars) {
    const progress = getReadingProgress();
    const prevStars = (progress[passageId] && progress[passageId].stars) || 0;
    progress[passageId] = { stars: Math.max(prevStars, stars) };
    writeJSON(READING_KEY, progress);
  }
  function isPassageUnlocked(index, passages) {
    if (index === 0) return true;
    const progress = getReadingProgress();
    const prev = passages[index - 1];
    return !!(prev && progress[prev.id]);
  }

  function getVocabBest(categoryId) {
    const map = readJSON(VOCAB_BEST_KEY, {});
    return map[categoryId] || 0;
  }
  function setVocabBest(categoryId, score) {
    const map = readJSON(VOCAB_BEST_KEY, {});
    map[categoryId] = Math.max(map[categoryId] || 0, score);
    writeJSON(VOCAB_BEST_KEY, map);
  }

  function getSpeakingTurns() {
    return parseInt(localStorage.getItem(SPEAKING_TURNS_KEY) || "0", 10);
  }

  function getSummary() {
    const reading = getReadingProgress();
    return {
      points: getPoints(),
      passagesCompleted: Object.keys(reading).length,
      speakingTurns: getSpeakingTurns(),
    };
  }

  return {
    getPoints,
    addPoints,
    getReadingProgress,
    markPassageComplete,
    isPassageUnlocked,
    getVocabBest,
    setVocabBest,
    getSpeakingTurns,
    getSummary,
  };
})();
