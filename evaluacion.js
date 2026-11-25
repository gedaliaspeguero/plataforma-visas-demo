// evaluacion.js — el quiz integrado en la plataforma. La matriz de puntos vive
// en scoring.js y se usa solo para ordenar las áreas que conviene revisar.
// El CTA principal del resultado depende del sitio: en el público (agenda por
// WhatsApp) envía el resultado por chat; en el privado abre el agendador y el
// resultado viaja pegado a la cita.

// En el sitio público (config.demo.js) se agenda por WhatsApp: el resultado
// se envía por chat en vez de abrir el agendador.
const MODO_WHATSAPP = typeof AGENDA_POR_WHATSAPP !== "undefined" && AGENDA_POR_WHATSAPP === true;
// El panel privado de las asesoras: el resultado del test le llega por WhatsApp
// como un enlace azul a esta página, que lo abre ya explicado.
const ENLACE_PANEL = "https://tuviajelegal-app.gedaliaspeguero.workers.dev/panel.html";

const TEXTOS = {
  WHATSAPP_NUMBER: typeof WHATSAPP_NEGOCIO !== "undefined" ? WHATSAPP_NEGOCIO : "18098620377",
  BRAND_NAME: "Tu Viaje Legal 360",

  INTRO: {
    eyebrow: "Visa B1/B2 para Estados Unidos — gratis",
    headline: "Descubre qué conviene revisar antes de solicitar tu visa.",
    stat: "Esta evaluación organiza la información inicial de tu perfil. La decisión final siempre corresponde al consulado.",
    sub: "12 preguntas rápidas para identificar qué información tienes clara y qué conviene revisar con un asesor. Sin compromiso.",
    ctaStart: "Evaluar mi perfil gratis — 2 minutos",
  },

  NAME_CAPTURE: {
    headline: "¿Cómo te llamas?",
    sub: "Para personalizar tu evaluación. Es opcional.",
    placeholder: "Tu nombre",
    ctaContinue: "Continuar",
    ctaSkip: "Saltar este paso",
  },

  RESULT: {
    pillarTierNote: {
      fuerte: "La información que diste en esta área está bastante clara.",
      medio: "Hay información de esta área que conviene revisar.",
      riesgo: "Esta área merece una revisión cuidadosa antes de avanzar.",
    },
    bandLabels: {
      fuerte: "Tienes una buena base para orientarte",
      medio: "Hay varios puntos que conviene aclarar",
      riesgo: "Conviene revisar tu situación antes de avanzar",
    },
    bandTaglines: {
      fuerte: "Tus respuestas permiten identificar un punto de partida. Un asesor puede confirmar qué aplica realmente a tu caso.",
      medio: "Tus respuestas dejan algunas áreas abiertas. Revisarlas antes de solicitar puede ayudarte a tomar mejores decisiones.",
      riesgo: "Tus respuestas necesitan contexto profesional antes de decidir el siguiente paso o pagar tasas oficiales.",
    },
    nextStep: "Siguiente paso recomendado: revisa estas áreas con un asesor antes de tomar decisiones sobre tu solicitud.",
    ctaAgendar: "Agendar mi consulta con un experto",
    ctaWhatsapp: "Prefiero escribir por WhatsApp",
    ctaWhatsappPrincipal: "Hablar con un asesor por WhatsApp",
    ctaShare: "Compartir este test",
    shareText: "Hice el test de Tu Viaje Legal 360 para evaluar mi perfil de visa. Pruébalo:",
    whatsappIntro: (name) =>
      `Hola${name ? `, soy ${name}` : ""}. Acabo de hacer la evaluación gratis de Tu Viaje Legal 360 y quiero hablar con un asesor.`,
  },

  FOOTER_DISCLAIMER:
    "Esta evaluación es orientativa y educativa. No constituye asesoría legal ni migratoria, y no predice ni garantiza la decisión consular.",
};

const state = {
  step: "intro", // intro | question | name | result
  questionIndex: 0,
  answers: {},
  userName: "",
  caseNumber: null,
  flow: [...QUESTIONS],
};

let isTransitioning = false;

function ensureCaseNumber() {
  if (!state.caseNumber) {
    state.caseNumber = String(Math.floor(100000 + Math.random() * 900000));
  }
}

const stage = document.getElementById("screenStage");
const progressHeader = document.getElementById("progressHeader");
const progressTrack = document.getElementById("progressTrack");
const progressFill = document.getElementById("progressFill");
const backBtn = document.getElementById("backBtn");

document.getElementById("footerDisclaimer").textContent = TEXTOS.FOOTER_DISCLAIMER;

// ---------- El cielo y el avioncito (la parte divertida) ----------

const MENOS_MOVIMIENTO = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const COLORES_FIESTA = ["#7ef0ff", "#a78bff", "#ff8fd2", "#8affc8", "#ffd166", "#ff5a5f"];
const progresoAvion = document.getElementById("progresoAvion");
progresoAvion.innerHTML = Avioncito.svg({ halo: false });

function escapar(texto) {
  return String(texto ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Estrellas y nubes repartidas al azar: cada visita el cielo es distinto.
(function pintarCielo() {
  const cielo = document.getElementById("estrellas");
  if (!cielo) return;
  let html = "";
  for (let i = 0; i < 28; i++) {
    const tam = (1.5 + Math.random() * 2.5).toFixed(1);
    html += `<span class="estrella" style="left:${(Math.random() * 100).toFixed(2)}%;top:${(Math.random() * 100).toFixed(2)}%;width:${tam}px;height:${tam}px;animation-delay:${(Math.random() * 3).toFixed(2)}s;animation-duration:${(2.2 + Math.random() * 2.6).toFixed(2)}s"></span>`;
  }
  for (let i = 0; i < 3; i++) {
    html += `<span class="nube" style="top:${12 + i * 28}%;width:${110 + i * 40}px;animation-duration:${38 + i * 14}s;animation-delay:-${i * 15}s"></span>`;
  }
  cielo.innerHTML = html;
})();

// El avioncito que acompaña: entra volando, flota y dice algo.
function guia(texto, expresion = "feliz", grande = false) {
  return `
    <div class="guia${grande ? " guia-grande" : ""}">
      <div class="guia-avion av-entrando"><div class="av-flotando">${Avioncito.conEstela({ expresion })}</div></div>
      ${texto ? `<p class="globo">${texto}</p>` : ""}
    </div>`;
}

// Chispitas de colores donde la persona tocó.
function chispas(x, y, cantidad = 12) {
  if (MENOS_MOVIMIENTO) return;
  for (let i = 0; i < cantidad; i++) {
    const c = document.createElement("span");
    const angulo = (Math.PI * 2 * i) / cantidad + Math.random() * 0.5;
    const distancia = 40 + Math.random() * 50;
    c.className = "chispa";
    c.style.left = `${x - 4}px`;
    c.style.top = `${y - 4}px`;
    c.style.background = COLORES_FIESTA[i % COLORES_FIESTA.length];
    c.style.setProperty("--dx", `${Math.cos(angulo) * distancia}px`);
    c.style.setProperty("--dy", `${Math.sin(angulo) * distancia}px`);
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 700);
  }
}

function confeti(cantidad) {
  if (MENOS_MOVIMIENTO) return;
  for (let i = 0; i < cantidad; i++) {
    const c = document.createElement("span");
    const dura = 2.2 + Math.random() * 1.8;
    c.className = "confeti";
    c.style.left = `${Math.random() * 100}vw`;
    c.style.background = COLORES_FIESTA[i % COLORES_FIESTA.length];
    c.style.animationDuration = `${dura}s`;
    c.style.animationDelay = `${Math.random() * 0.6}s`;
    c.style.setProperty("--dx", `${(Math.random() - 0.5) * 160}px`);
    c.style.setProperty("--giro", `${360 + Math.random() * 720}deg`);
    document.body.appendChild(c);
    setTimeout(() => c.remove(), (dura + 0.8) * 1000);
  }
}

backBtn.addEventListener("click", goBack);

function goBack() {
  if (state.step === "question") {
    if (state.questionIndex === 0) {
      transitionTo(() => { state.step = "intro"; });
    } else {
      transitionTo(() => { state.questionIndex -= 1; });
    }
  } else if (state.step === "name") {
    transitionTo(() => {
      state.step = "question";
      state.questionIndex = state.flow.length - 1;
    });
  }
}

function transitionTo(mutate) {
  if (isTransitioning) return;
  const current = stage.querySelector(".screen");
  if (current) {
    isTransitioning = true;
    current.classList.add("exiting");
    setTimeout(() => {
      mutate();
      render();
      isTransitioning = false;
    }, 150);
  } else {
    mutate();
    render();
  }
}

function render() {
  stage.innerHTML = "";
  updateProgressHeader();

  if (state.step === "intro") stage.appendChild(renderIntro());
  else if (state.step === "question") stage.appendChild(renderQuestion());
  else if (state.step === "name") stage.appendChild(renderNameCapture());
  else if (state.step === "revisando") stage.appendChild(renderRevisando());
  else if (state.step === "result") stage.appendChild(renderResult());

  window.scrollTo(0, 0);
  requestAnimationFrame(() => {
    const titulo = stage.querySelector("h1, h2");
    if (titulo) {
      titulo.tabIndex = -1;
      titulo.focus({ preventScroll: true });
    }
  });
}

function moverAvionDelProgreso(pct) {
  const antes = progresoAvion.style.left;
  progresoAvion.style.left = `${pct}%`;
  if (antes && antes !== progresoAvion.style.left) {
    progresoAvion.classList.remove("saltando");
    void progresoAvion.offsetWidth;
    progresoAvion.classList.add("saltando");
  }
}

function updateProgressHeader() {
  if (state.step === "question") {
    progressHeader.hidden = false;
    const pct = ((state.questionIndex + 1) / (state.flow.length + 1)) * 100;
    progressFill.style.width = `${pct}%`;
    moverAvionDelProgreso(pct);
    progressTrack.setAttribute("aria-valuenow", String(state.questionIndex + 1));
    progressTrack.setAttribute("aria-valuemax", String(state.flow.length + 1));
    backBtn.style.visibility = "visible";
  } else if (state.step === "name") {
    progressHeader.hidden = false;
    progressFill.style.width = "100%";
    moverAvionDelProgreso(100);
    progressTrack.setAttribute("aria-valuenow", String(state.flow.length + 1));
    progressTrack.setAttribute("aria-valuemax", String(state.flow.length + 1));
    backBtn.style.visibility = "visible";
  } else {
    progressHeader.hidden = true;
  }
}

// ---------- Intro ----------
function renderIntro() {
  const el = document.createElement("div");
  el.className = "screen";
  const t = TEXTOS.INTRO;
  el.innerHTML = `
    ${guia("¡Hola! Soy tu copiloto. Son 2 minutitos y despegamos.", "feliz", true)}
    <p class="intro-eyebrow">${t.eyebrow}</p>
    <h1 class="intro-headline">${t.headline}</h1>
    <div class="intro-stat-card">${t.stat}</div>
    <p class="intro-sub">${t.sub}</p>
    <button class="btn-primary btn-estrella" id="startBtn">${t.ctaStart}</button>
  `;
  el.querySelector("#startBtn").addEventListener("click", () => {
    transitionTo(() => {
      state.step = "question";
      state.questionIndex = 0;
      state.flow = [...QUESTIONS];
    });
  });
  return el;
}

// ---------- Pregunta ----------
function renderQuestion() {
  const q = state.flow[state.questionIndex];
  const el = document.createElement("div");
  el.className = "screen";

  const pillarLabel = PILLARS[q.pillar].label;
  const currentAnswer = state.answers[q.id];

  el.innerHTML = `
    <p class="question-pillar">${pillarLabel}</p>
    <h2 class="question-text">${q.text}</h2>
    ${q.type === "multi" ? '<p class="multi-hint">Puedes elegir varias opciones</p>' : ""}
    <div class="options-list" id="optionsList"></div>
    ${q.type === "multi" ? '<button class="btn-primary continue-btn" id="continueBtn">Continuar</button>' : ""}
  `;

  const list = el.querySelector("#optionsList");
  q.options.forEach((opt) => {
    const card = document.createElement("button");
    card.className = "option-card";
    card.type = "button";
    const isSelected =
      q.type === "multi"
        ? Array.isArray(currentAnswer) && currentAnswer.includes(opt.value)
        : currentAnswer === opt.value;
    if (isSelected) card.classList.add("selected");
    card.setAttribute("aria-label", opt.label);
    if (q.type === "multi") card.setAttribute("aria-pressed", isSelected ? "true" : "false");
    card.innerHTML = `<span>${opt.label}</span><span class="option-check">✓</span>`;

    card.addEventListener("click", (evento) => {
      const caja = card.getBoundingClientRect();
      chispas(evento.clientX || caja.left + caja.width / 2, evento.clientY || caja.top + caja.height / 2);
      if (q.type === "multi") {
        handleMultiSelect(q, opt, card, list);
      } else {
        state.answers[q.id] = opt.value;
        syncFollowUpsFor(q);
        goToNextQuestion();
      }
    });

    list.appendChild(card);
  });

  if (q.type === "multi") {
    el.querySelector("#continueBtn").addEventListener("click", () => handleMultiContinue(q, list));
  }

  return el;
}

function handleMultiSelect(question, opt, cardEl, listEl) {
  const current = Array.isArray(state.answers[question.id]) ? [...state.answers[question.id]] : [];

  if (opt.exclusive) {
    state.answers[question.id] = current.includes(opt.value) ? [] : [opt.value];
  } else {
    const withoutExclusive = current.filter((v) => {
      const o = question.options.find((o) => o.value === v);
      return !(o && o.exclusive);
    });
    const idx = withoutExclusive.indexOf(opt.value);
    if (idx >= 0) withoutExclusive.splice(idx, 1);
    else withoutExclusive.push(opt.value);
    state.answers[question.id] = withoutExclusive;
  }

  const selected = state.answers[question.id];
  Array.from(listEl.children).forEach((child, i) => {
    const isSel = selected.includes(question.options[i].value);
    child.classList.toggle("selected", isSel);
    child.setAttribute("aria-pressed", isSel ? "true" : "false");
  });
}

function handleMultiContinue(question, listEl) {
  const answer = state.answers[question.id];
  if (!Array.isArray(answer) || answer.length === 0) {
    listEl.classList.add("shake");
    setTimeout(() => listEl.classList.remove("shake"), 320);
    return;
  }
  syncFollowUpsFor(question);
  goToNextQuestion();
}

function syncFollowUpsFor(question) {
  const rule = FOLLOW_UPS.find((f) => f.afterQuestionId === question.id);
  if (!rule) return;

  const existingIdx = state.flow.findIndex((q) => q.id === rule.question.id);
  if (existingIdx !== -1) {
    state.flow.splice(existingIdx, 1);
    delete state.answers[rule.question.id];
  }

  const answer = state.answers[question.id];
  const matches = Array.isArray(answer) ? answer.some((v) => rule.trigger(v)) : rule.trigger(answer);
  if (matches) {
    const parentIdx = state.flow.findIndex((q) => q.id === question.id);
    state.flow.splice(parentIdx + 1, 0, rule.question);
  }
}

function goToNextQuestion() {
  transitionTo(() => {
    if (state.questionIndex < state.flow.length - 1) {
      state.questionIndex += 1;
    } else {
      state.step = "name";
    }
  });
}

// ---------- Nombre ----------
function renderNameCapture() {
  const el = document.createElement("div");
  el.className = "screen";
  const t = TEXTOS.NAME_CAPTURE;
  el.innerHTML = `
    ${guia("¡Ya casi aterrizamos!", "guino")}
    <h2 class="question-text">${t.headline}</h2>
    <p class="intro-sub" style="margin-bottom:20px;">${t.sub}</p>
    <label class="campo-etiqueta" for="nameInput">Tu nombre <span>(opcional)</span></label>
    <input type="text" class="name-input" id="nameInput" placeholder="${t.placeholder}" value="${escapar(state.userName)}" autocomplete="name" maxlength="60" />
    <button class="btn-primary" id="nameContinueBtn">${t.ctaContinue}</button>
    <button class="skip-btn" id="nameSkipBtn">${t.ctaSkip}</button>
  `;

  const input = el.querySelector("#nameInput");
  el.querySelector("#nameContinueBtn").addEventListener("click", () => {
    state.userName = input.value.trim();
    irAlResultado();
  });
  el.querySelector("#nameSkipBtn").addEventListener("click", () => {
    state.userName = "";
    irAlResultado();
  });

  return el;
}

// ---------- Revisando: el avioncito da una vuelta mientras "calcula" ----------
function irAlResultado() {
  transitionTo(() => {
    ensureCaseNumber();
    state.step = MENOS_MOVIMIENTO ? "result" : "revisando";
  });
  if (MENOS_MOVIMIENTO) return;
  setTimeout(() => {
    if (state.step !== "revisando") return;
    state.step = "result";
    render();
  }, 2100);
}

function renderRevisando() {
  const el = document.createElement("div");
  el.className = "screen revisando";
  el.innerHTML = `
    <div class="revisando-pista" aria-hidden="true">
      <div class="revisando-giro">${Avioncito.conEstela({ expresion: "pensando", halo: false })}</div>
    </div>
    <p role="status">Revisando tus respuestas<span>.</span><span>.</span><span>.</span></p>
  `;
  return el;
}

// ---------- Resultado ----------
function renderResult() {
  const result = computeResult(state.answers);
  const el = document.createElement("div");
  el.className = "screen";
  const t = TEXTOS.RESULT;

  const pillarRows = Object.keys(PILLARS)
    .map((key) => {
      const pillar = PILLARS[key];
      const score = result.pillarScores[key];
      const max = result.pillarMax[key];
      const tier = getPillarTier(score, max);
      return `
        <div class="pillar-row pillar-summary ${tier}">
          <div class="pillar-row-label"><span>${pillar.label}</span><span>${tier === "fuerte" ? "Claro" : "Por revisar"}</span></div>
          <p class="pillar-tier-note ${tier}">${t.pillarTierNote[tier]}</p>
        </div>
      `;
    })
    .join("");

  const expresion = { fuerte: "feliz", medio: "guino", riesgo: "pensando" }[result.band] || "feliz";
  el.innerHTML = `
    <div class="resultado-avion av-entrando"><div class="av-flotando">${Avioncito.conEstela({ expresion })}</div></div>
    <article class="pase">
      <div class="pase-cabeza"><strong>Pase de evaluación</strong><span>Tu Viaje Legal 360</span></div>
      <div class="pase-datos">
        <div class="pase-dato"><small>Pasajero</small><b>${escapar(state.userName) || "Viajero"}</b></div>
        <div class="pase-dato"><small>Referencia</small><b>#${state.caseNumber}</b></div>
        <div class="pase-dato"><small>Destino</small><b>Estados Unidos</b></div>
        <div class="pase-dato"><small>Visa</small><b>B1/B2</b></div>
      </div>
      <div class="pase-corte" aria-hidden="true"><i></i><i></i></div>
      <div class="pase-cuerpo">
        <h2 class="result-band ${result.band}">${t.bandLabels[result.band]}</h2>
        <p class="result-tagline">${t.bandTaglines[result.band]}</p>
        <div class="pillars-chart">${pillarRows}</div>
        <div class="risk-card">${t.nextStep}</div>
      </div>
    </article>
    <div class="result-actions">
      ${MODO_WHATSAPP
        ? `<button class="btn-primary" id="whatsappBtn">${t.ctaWhatsappPrincipal}</button>`
        : `<button class="btn-primary" id="agendarBtn">${t.ctaAgendar}</button>
      <button class="btn-secundario-quiz" id="whatsappBtn">${t.ctaWhatsapp}</button>`}
      <button class="share-btn" id="shareBtn">${t.ctaShare}</button>
    </div>
  `;

  el.querySelector("#agendarBtn")?.addEventListener("click", () => irAAgendar(result));
  el.querySelector("#whatsappBtn").addEventListener("click", () => openWhatsapp(result));
  el.querySelector("#shareBtn").addEventListener("click", shareTest);

  // Fiesta al llegar: más confeti mientras mejor salió.
  const cantidad = { fuerte: 90, medio: 45, riesgo: 0 }[result.band] || 0;
  if (cantidad) setTimeout(() => confeti(cantidad), 500);

  return el;
}

// CTA principal: el resultado viaja pegado a la cita para que la consultora
// vea el perfil del cliente antes de aceptar el caso.
function irAAgendar(result) {
  const codigo = `${encodeResultForWhatsapp(result)} r=${encodeAnswersForAdvisor(state.answers)}`;
  try {
    sessionStorage.setItem("perfil_quiz_pendiente", codigo);
    sessionStorage.setItem("nombre_quiz_pendiente", state.userName || "");
  } catch (e) {
    // El recorrido sigue funcionando aunque el navegador bloquee sessionStorage.
  }
  const params = new URLSearchParams();
  params.set("servicio", "orientacion");
  params.set("pais", "usa");
  params.set("categoria", "no-inmigrante");
  params.set("caso", "b1-b2");
  params.set("origen", "evaluacion");
  window.location.href = `agendar.html?${params.toString()}`;
}

// El cliente ve su resultado en palabras (lo mismo que mostró la pantalla);
// el código compacto va al final solo para la asesora.
function mensajeWhatsappDelResultado(result) {
  const t = TEXTOS.RESULT;
  const areas = Object.keys(PILLARS).map((key) => {
    const tier = getPillarTier(result.pillarScores[key], result.pillarMax[key]);
    return `• ${PILLARS[key].label}: ${tier === "fuerte" ? "Claro" : "Por revisar"}`;
  });
  return [
    t.whatsappIntro(state.userName),
    "",
    `Mi resultado: ${t.bandLabels[result.band]}`,
    ...areas,
    "",
    `Referencia #${state.caseNumber}`,
    `Detalle para el asesor: ${ENLACE_PANEL}?perfil=${encodeURIComponent(encodeResultForWhatsapp(result))}&r=${encodeAnswersForAdvisor(state.answers)}`,
  ].join("\n");
}

function openWhatsapp(result) {
  const message = mensajeWhatsappDelResultado(result);
  const url = `https://wa.me/${TEXTOS.WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}

async function shareTest() {
  const t = TEXTOS.RESULT;
  const shareData = {
    title: TEXTOS.BRAND_NAME,
    text: t.shareText,
    url: window.location.href,
  };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
    } catch (e) {
      // usuario canceló el share — no hacer nada
    }
  } else {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert("Link copiado. ¡Compártelo!");
    } catch (e) {
      alert(window.location.href);
    }
  }
}

render();
