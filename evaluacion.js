// evaluacion.js — el quiz integrado en la plataforma. La matriz de puntos vive
// en scoring.js y se usa solo para ordenar las áreas que conviene revisar.
// Diferencia clave con el quiz original: el CTA principal del resultado ya no
// es WhatsApp sino agendar la consulta, y el resultado viaja pegado a la cita.

const TEXTOS = {
  WHATSAPP_NUMBER: "19142901691",
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
    ctaShare: "Compartir este test",
    shareText: "Hice el test de Tu Viaje Legal 360 para evaluar mi perfil de visa. Pruébalo:",
    whatsappIntro: (name, caseNumber) =>
      `Hola, soy ${name || "un usuario"} y acabo de hacer la evaluación de Tu Viaje Legal 360.\n\nReferencia #${caseNumber}\n\nEste es mi resultado:`,
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

function updateProgressHeader() {
  if (state.step === "question") {
    progressHeader.hidden = false;
    const pct = ((state.questionIndex + 1) / (state.flow.length + 1)) * 100;
    progressFill.style.width = `${pct}%`;
    progressTrack.setAttribute("aria-valuenow", String(state.questionIndex + 1));
    progressTrack.setAttribute("aria-valuemax", String(state.flow.length + 1));
    backBtn.style.visibility = "visible";
  } else if (state.step === "name") {
    progressHeader.hidden = false;
    progressFill.style.width = "100%";
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
    <p class="intro-eyebrow">${t.eyebrow}</p>
    <h1 class="intro-headline">${t.headline}</h1>
    <div class="intro-stat-card">${t.stat}</div>
    <p class="intro-sub">${t.sub}</p>
    <button class="btn-primary" id="startBtn">${t.ctaStart}</button>
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

    card.addEventListener("click", () => {
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
    <h2 class="question-text">${t.headline}</h2>
    <p class="intro-sub" style="margin-bottom:20px;">${t.sub}</p>
    <label class="campo-etiqueta" for="nameInput">Tu nombre <span>(opcional)</span></label>
    <input type="text" class="name-input" id="nameInput" placeholder="${t.placeholder}" value="${state.userName}" autocomplete="name" />
    <button class="btn-primary" id="nameContinueBtn">${t.ctaContinue}</button>
    <button class="skip-btn" id="nameSkipBtn">${t.ctaSkip}</button>
  `;

  const input = el.querySelector("#nameInput");
  el.querySelector("#nameContinueBtn").addEventListener("click", () => {
    state.userName = input.value.trim();
    transitionTo(() => { state.step = "result"; ensureCaseNumber(); });
  });
  el.querySelector("#nameSkipBtn").addEventListener("click", () => {
    state.userName = "";
    transitionTo(() => { state.step = "result"; ensureCaseNumber(); });
  });

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

  el.innerHTML = `
    <p class="question-pillar">Tu resultado</p>
    <p class="case-number">Referencia de evaluación #${state.caseNumber}</p>
    <h2 class="result-band ${result.band}">${t.bandLabels[result.band]}</h2>
    <p class="result-tagline">${t.bandTaglines[result.band]}</p>
    <div class="pillars-chart">${pillarRows}</div>
    <div class="risk-card">${t.nextStep}</div>
    <div class="result-actions">
      <button class="btn-primary" id="agendarBtn">${t.ctaAgendar}</button>
      <button class="btn-secundario-quiz" id="whatsappBtn">${t.ctaWhatsapp}</button>
      <button class="share-btn" id="shareBtn">${t.ctaShare}</button>
    </div>
  `;

  el.querySelector("#agendarBtn").addEventListener("click", () => irAAgendar(result));
  el.querySelector("#whatsappBtn").addEventListener("click", () => openWhatsapp(result));
  el.querySelector("#shareBtn").addEventListener("click", shareTest);

  return el;
}

// CTA principal: el resultado viaja pegado a la cita para que la consultora
// vea el perfil del cliente antes de aceptar el caso.
function irAAgendar(result) {
  const codigo = encodeResultForWhatsapp(result);
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

function openWhatsapp(result) {
  const t = TEXTOS.RESULT;
  const code = encodeResultForWhatsapp(result);
  const message = `${t.whatsappIntro(state.userName, state.caseNumber)}\n\n${code}`;
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
