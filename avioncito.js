// avioncito.js — la mascota de los videos (el avioncito de hélice con la cola
// roja "360"), dibujada para la web.
//
// Es el mismo dibujo de los reels, pasado de Remotion a SVG puro. Lo que en
// el video se movía cuadro a cuadro (hélice, parpadeo, brillo) aquí lo mueve
// el CSS de avioncito.css, así que el navegador no ejecuta nada por cuadro.
//
// Uso:  elemento.innerHTML = Avioncito.svg({ expresion: "feliz" });
// Expresiones: "feliz", "guino", "sorpresa", "pensando".

const Avioncito = (() => {
  const NAVY = "#1d2246";
  const ROJO = "#c41f27";
  const CUERPO =
    "M 96 124 C 120 100, 180 78, 250 78 C 330 78, 368 110, 368 146 C 368 184, 330 206, 250 206 C 180 206, 124 184, 96 162 Q 84 143 96 124 Z";

  // Cada avioncito necesita ids propios: si dos comparten degradados y uno
  // se quita de la página, el otro se queda sin colores.
  let cuenta = 0;

  function ojo(id, cx, cy, rx, ry, cerrado, mirar, grande) {
    if (cerrado) {
      return `<path d="M ${cx - rx} ${cy + 2} Q ${cx} ${cy - ry * 0.8} ${cx + rx} ${cy + 2}" stroke="${NAVY}" stroke-width="4.5" stroke-linecap="round" fill="none" />`;
    }
    const px = mirar.x * 4;
    const py = mirar.y * 4;
    const escala = grande ? 1.12 : 1;
    return `
      <g transform="translate(${cx} ${cy}) scale(${escala}) translate(${-cx} ${-cy})">
        <g class="av-ojo">
          <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#fff" stroke="${NAVY}" stroke-width="2.2" />
          <ellipse cx="${cx + px + 2}" cy="${cy + py + 2}" rx="${rx * 0.62}" ry="${ry * 0.66}" fill="${NAVY}" />
          <ellipse cx="${cx + px + 2}" cy="${cy + py + 4}" rx="${rx * 0.42}" ry="${ry * 0.45}" fill="url(#${id}-iris)" opacity="0.85" />
          <circle cx="${cx + px - rx * 0.12}" cy="${cy + py - ry * 0.25}" r="${rx * 0.26}" fill="#fff" />
          <circle cx="${cx + px + rx * 0.3}" cy="${cy + py + ry * 0.3}" r="${rx * 0.11}" fill="#fff" opacity="0.9" />
        </g>
      </g>`;
  }

  function boca(expresion) {
    const mx = 316;
    const my = 170;
    if (expresion === "sorpresa") return `<ellipse cx="${mx}" cy="${my + 2}" rx="7" ry="9" fill="${NAVY}" />`;
    if (expresion === "pensando") {
      return `<path d="M ${mx - 9} ${my + 2} Q ${mx} ${my - 2} ${mx + 9} ${my + 3}" stroke="${NAVY}" stroke-width="4" stroke-linecap="round" fill="none" />`;
    }
    return `<path d="M ${mx - 14} ${my - 3} Q ${mx} ${my + 13} ${mx + 14} ${my - 3}" stroke="${NAVY}" stroke-width="4.5" stroke-linecap="round" fill="none" />`;
  }

  // `halo`: el resplandor de colores detrás. Es un degradado, no un
  // desenfoque: los desenfoques animados son lo que más traba en celulares.
  function svg({ expresion = "feliz", halo = true } = {}) {
    const id = `av${++cuenta}`;
    const mirar = expresion === "pensando" ? { x: -0.5, y: -0.8 } : { x: 0.3, y: 0 };

    return `
<svg class="avioncito avioncito-${expresion}" viewBox="0 0 420 280" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="${id}-body" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" /><stop offset="0.55" stop-color="#eef0fb" /><stop offset="1" stop-color="#c9cdea" />
    </linearGradient>
    <linearGradient id="${id}-iri" x1="0" y1="0" x2="400" y2="0" gradientUnits="userSpaceOnUse" spreadMethod="reflect">
      <stop offset="0" stop-color="#7ef0ff" /><stop offset="0.35" stop-color="#a78bff" /><stop offset="0.7" stop-color="#ff8fd2" /><stop offset="1" stop-color="#8affc8" />
    </linearGradient>
    <linearGradient id="${id}-iris" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#5fe3ff" /><stop offset="1" stop-color="#a06bff" />
    </linearGradient>
    <linearGradient id="${id}-wing" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3a4290" /><stop offset="1" stop-color="${NAVY}" />
    </linearGradient>
    <linearGradient id="${id}-fin" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ff4a4f" /><stop offset="1" stop-color="#a8141c" />
    </linearGradient>
    <radialGradient id="${id}-blush">
      <stop offset="0" stop-color="#ff7fb0" stop-opacity="0.8" /><stop offset="1" stop-color="#ff7fb0" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="${id}-disc">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.05" /><stop offset="0.8" stop-color="#bfe9ff" stop-opacity="0.35" /><stop offset="1" stop-color="#d6b8ff" stop-opacity="0" />
    </radialGradient>
    <clipPath id="${id}-clip"><path d="${CUERPO}" /></clipPath>
    <radialGradient id="${id}-halo">
      <stop offset="0" stop-color="#a78bff" stop-opacity="0.55" /><stop offset="0.5" stop-color="#7ef0ff" stop-opacity="0.22" /><stop offset="1" stop-color="#ff8fd2" stop-opacity="0" />
    </radialGradient>
  </defs>

  ${halo ? `<ellipse cx="232" cy="142" rx="210" ry="120" fill="url(#${id}-halo)" />` : ""}

  <path d="M 206 84 L 184 46 Q 180 39 189 39 L 204 41 Q 210 42 214 47 L 250 82 Z" fill="#141838" />
  <path d="M 116 126 L 92 104 Q 88 99 95 99 L 106 100 L 136 118 Z" fill="#141838" />

  <path d="M 108 124 L 84 44 Q 81 35 91 35 L 116 35 Q 124 35 129 42 L 176 98 Z" fill="url(#${id}-fin)" />
  <path d="M 88 41 L 114 41" stroke="#ff9a9d" stroke-width="3" stroke-linecap="round" opacity="0.6" />
  <text x="0" y="0" transform="translate(118 88) rotate(-64)" font-family="Inter, Arial, sans-serif" font-weight="900" font-size="21" fill="#fff" text-anchor="middle" letter-spacing="-0.5">360</text>

  <path d="${CUERPO}" fill="url(#${id}-body)" />
  <g clip-path="url(#${id}-clip)">
    <path d="${CUERPO}" fill="url(#${id}-iri)" opacity="0.28" />
    <path d="M 60 170 C 160 198, 280 202, 390 178" stroke="${ROJO}" stroke-width="8" fill="none" />
    <path d="M 60 182 C 160 210, 280 214, 390 190" stroke="${NAVY}" stroke-width="6" fill="none" />
    <path d="M 60 204 C 160 200, 280 204, 390 190 L 390 240 L 60 240 Z" fill="#8f95c9" opacity="0.35" />
    <path d="M 150 100 C 200 87, 250 85, 300 92" stroke="#fff" stroke-width="9" stroke-linecap="round" fill="none" opacity="0.9" />
  </g>
  <path d="${CUERPO}" fill="none" stroke="url(#${id}-iri)" stroke-width="3" opacity="0.9" />

  <circle cx="168" cy="122" r="8" fill="${NAVY}" /><circle cx="168" cy="122" r="8" fill="url(#${id}-iris)" opacity="0.45" /><circle cx="165.5" cy="119" r="2.6" fill="#fff" opacity="0.9" />
  <circle cx="200" cy="119" r="8" fill="${NAVY}" /><circle cx="200" cy="119" r="8" fill="url(#${id}-iris)" opacity="0.45" /><circle cx="197.5" cy="116" r="2.6" fill="#fff" opacity="0.9" />

  <ellipse cx="280" cy="168" rx="15" ry="9" fill="url(#${id}-blush)" />
  <ellipse cx="354" cy="164" rx="9" ry="7" fill="url(#${id}-blush)" />
  ${ojo(id, 284, 130, 19, 25, false, mirar, expresion === "sorpresa")}
  ${ojo(id, 330, 128, 16, 22, expresion === "guino", mirar, expresion === "sorpresa")}
  ${boca(expresion)}

  <path d="M 196 168 L 160 232 Q 155 242 167 241 L 190 238 Q 200 237 207 227 L 256 174 Z" fill="url(#${id}-wing)" />
  <path d="M 166 234 L 200 174" stroke="#6f79d6" stroke-width="3" stroke-linecap="round" opacity="0.6" />
  <path d="M 164 237 L 198 234" stroke="${ROJO}" stroke-width="4" stroke-linecap="round" />
  <path d="M 110 150 L 76 172 Q 70 178 79 178 L 96 177 Q 104 176 110 171 L 136 156 Z" fill="url(#${id}-wing)" />

  <ellipse cx="384" cy="146" rx="6" ry="60" fill="url(#${id}-disc)" />
  <g class="av-helice">
    <path d="M 381 146 Q 378 106 384 88 Q 390 106 387 146 Z" fill="${NAVY}" opacity="0.85" />
    <path d="M 381 146 Q 378 186 384 204 Q 390 186 387 146 Z" fill="${NAVY}" opacity="0.85" />
  </g>
  <path d="M 364 128 Q 392 130 394 146 Q 392 162 364 164 Z" fill="${ROJO}" />
  <path d="M 368 133 Q 382 135 386 142" stroke="#ff9a9d" stroke-width="2.5" fill="none" stroke-linecap="round" />
</svg>`;
  }

  // El avioncito con su estela de colores detrás de la cola.
  function conEstela(opciones) {
    return `<span class="avion-conjunto"><span class="avion-estela"></span>${svg(opciones)}</span>`;
  }

  return { svg, conEstela };
})();
