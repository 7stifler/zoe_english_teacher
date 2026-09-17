/**
 * Teacher Zoe avatar - inline SVG portrait, reused across all pages.
 * Mood variants: "smile" (default), "listening" (encouraging, mouth open),
 * "thinking" (gentle, closed smile).
 */
const Mentor = (() => {
  function svg(mood = "smile", size = 120) {
    const mouth =
      mood === "listening"
        ? `<ellipse cx="100" cy="126" rx="15" ry="12" fill="#7A2E20"/>
           <path d="M87,126 Q100,136 113,126" fill="#FFFFFF"/>`
        : mood === "thinking"
        ? `<path d="M83,124 Q100,132 117,124" stroke="#7A2E20" stroke-width="4" fill="none" stroke-linecap="round"/>`
        : `<path d="M78,120 Q100,142 122,120 Q118,133 100,133 Q82,133 78,120 Z" fill="#FFFFFF"/>
           <path d="M78,120 Q100,140 122,120" stroke="#7A2E20" stroke-width="3" fill="none" stroke-linecap="round"/>`;

    return `
    <svg viewBox="0 0 200 200" width="${size}" height="${size}" class="zoe-avatar zoe-mood-${mood}" role="img" aria-label="Teacher Zoe">
      <defs>
        <radialGradient id="zoeBg" cx="45%" cy="40%" r="70%">
          <stop offset="0%" stop-color="#FFE28A"/>
          <stop offset="100%" stop-color="#FFC94A"/>
        </radialGradient>
        <linearGradient id="zoeHair" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#6B4029"/>
          <stop offset="100%" stop-color="#4E2E1C"/>
        </linearGradient>
      </defs>

      <circle cx="100" cy="100" r="98" fill="url(#zoeBg)"/>

      <!-- shoulders / cream sweater -->
      <path d="M40,200 Q40,150 100,148 Q160,150 160,200 Z" fill="#FBF3E6"/>
      <path d="M40,200 Q40,150 100,148 Q160,150 160,200" stroke="#EADFC8" stroke-width="2" fill="none"/>
      <circle cx="100" cy="158" r="4" fill="#D8B45A"/>

      <!-- neck -->
      <rect x="88" y="118" width="24" height="26" rx="10" fill="#F3B98C"/>

      <!-- back hair -->
      <path d="M45,115 Q30,60 62,32 Q100,8 138,32 Q170,60 155,118
               Q150,80 130,95 Q135,60 100,48 Q65,60 70,95 Q50,82 45,115 Z" fill="url(#zoeHair)"/>

      <!-- face -->
      <ellipse cx="100" cy="98" rx="52" ry="56" fill="#F7C79C"/>

      <!-- ears + gold hoops -->
      <circle cx="49" cy="100" r="8" fill="#F3B98C"/>
      <circle cx="151" cy="100" r="8" fill="#F3B98C"/>
      <circle cx="49" cy="108" r="6" fill="none" stroke="#E0B23C" stroke-width="3"/>
      <circle cx="151" cy="108" r="6" fill="none" stroke="#E0B23C" stroke-width="3"/>

      <!-- front hair / bangs -->
      <path d="M48,90 Q46,45 100,34 Q154,45 152,90
               Q140,55 100,50 Q60,55 48,90 Z" fill="url(#zoeHair)"/>
      <path d="M52,88 Q60,58 85,50 Q70,68 66,92 Z" fill="url(#zoeHair)"/>
      <path d="M148,88 Q140,58 115,50 Q130,68 134,92 Z" fill="url(#zoeHair)"/>

      <!-- wavy side strands -->
      <path d="M42,95 Q22,120 30,160 Q34,130 50,112 Z" fill="url(#zoeHair)"/>
      <path d="M158,95 Q178,120 170,160 Q166,130 150,112 Z" fill="url(#zoeHair)"/>

      <!-- eyebrows -->
      <path d="M68,80 Q78,73 90,78" stroke="#4E2E1C" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M132,80 Q122,73 110,78" stroke="#4E2E1C" stroke-width="4" fill="none" stroke-linecap="round"/>

      <!-- eyes -->
      <ellipse cx="79" cy="95" rx="12" ry="14" fill="#FFFFFF"/>
      <ellipse cx="121" cy="95" rx="12" ry="14" fill="#FFFFFF"/>
      <circle cx="80" cy="97" r="7.5" fill="#5B3A22"/>
      <circle cx="120" cy="97" r="7.5" fill="#5B3A22"/>
      <circle cx="82.5" cy="93.5" r="2.4" fill="#FFFFFF"/>
      <circle cx="122.5" cy="93.5" r="2.4" fill="#FFFFFF"/>

      <!-- blush -->
      <ellipse cx="66" cy="112" rx="9" ry="6" fill="#F4967A" opacity="0.5"/>
      <ellipse cx="134" cy="112" rx="9" ry="6" fill="#F4967A" opacity="0.5"/>

      <!-- nose -->
      <path d="M97,100 Q95,112 100,114 Q105,112 103,100" stroke="#E0A276" stroke-width="2.5" fill="none" stroke-linecap="round"/>

      <!-- mouth -->
      ${mouth}
    </svg>`;
  }

  function render(targetId, mood = "smile", size = 120) {
    const el = document.getElementById(targetId);
    if (el) el.innerHTML = svg(mood, size);
  }

  return { svg, render };
})();
