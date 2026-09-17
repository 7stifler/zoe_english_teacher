/**
 * Shared English narration helper. Fetches natural neural speech from the
 * server (/api/tts, powered by edge-tts) instead of the browser's built-in
 * voices, which default to a male voice on this machine and don't fit
 * Teacher Zoe's character.
 */
const ZoeTTS = (() => {
  let currentAudio = null;
  const cache = new Map(); // text -> object URL, avoids re-fetching repeats in one session

  // Drives the "Zoe is talking" visual (pulsing glow + sound-wave badge on her
  // avatar) via a body class, so any page just needs the right markup/CSS -
  // no per-page wiring needed.
  function setSpeaking(isSpeaking) {
    document.body.classList.toggle("zoe-is-speaking", isSpeaking);
  }

  async function speak(text) {
    if (!text) return;
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    try {
      let url = cache.get(text);
      if (!url) {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (!res.ok) throw new Error("tts request failed");
        const blob = await res.blob();
        url = URL.createObjectURL(blob);
        cache.set(text, url);
      }
      currentAudio = new Audio(url);
      currentAudio.addEventListener("ended", () => setSpeaking(false));
      currentAudio.addEventListener("pause", () => setSpeaking(false));
      setSpeaking(true);
      await currentAudio.play();
    } catch (err) {
      console.warn("ZoeTTS: falling back to browser voice", err);
      speakFallback(text);
    }
  }

  // Fallback only if the server is unreachable - better a robotic voice than silence.
  function speakFallback(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    utter.rate = 0.92;
    utter.onstart = () => setSpeaking(true);
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utter);
  }

  function stop() {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio = null;
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  return { speak, stop };
})();
