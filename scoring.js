// scoring.js — el corazón del producto: preguntas, matriz de puntos, flags y banda final.
//
// CÓMO AJUSTAR PESOS:
// - Cada opción tiene un campo `points`. Súbelo o bájalo según qué tanto quieras
//   premiar/castigar esa respuesta.
// - El máximo teórico de cada pilar (suma de los puntos más altos de cada pregunta
//   de ese pilar) está anotado en PILLAR_MAX. Si cambias puntos, actualiza PILLAR_MAX
//   para que las barras de resultado y el % por pilar sigan siendo correctos.
// - Los 4 pilares deben sumar 100 puntos máximo entre todos (30 + 25 + 20 + 25 = 100)
//   para que el score final quede en escala 0-100. Si cambias el máximo de un pilar,
//   ajusta los demás para que la suma total siga dando 100.
// - Las bandas finales (FUERTE / MEDIO / RIESGO) se definen en BANDS más abajo.

const PILLARS = {
  economico: { key: "economico", label: "Vínculos económicos", weightLabel: "30%" },
  laboral: { key: "laboral", label: "Vínculos laborales", weightLabel: "25%" },
  familiar: { key: "familiar", label: "Vínculos familiares/sociales", weightLabel: "20%" },
  historial: { key: "historial", label: "Historial migratorio", weightLabel: "25%" },
};

// Máximo de puntos alcanzable por pilar (debe sumar 100 entre los 4).
const PILLAR_MAX = {
  economico: 30,
  laboral: 25,
  familiar: 20,
  historial: 25,
};

// Bandas de resultado final, sobre 100 puntos.
const BANDS = [
  { id: "fuerte", min: 70, max: 100, code: "F" },
  { id: "medio", min: 40, max: 69, code: "M" },
  { id: "riesgo", min: 0, max: 39, code: "R" },
];

function getBand(totalScore) {
  return BANDS.find((b) => totalScore >= b.min && totalScore <= b.max) || BANDS[BANDS.length - 1];
}

// "Probabilidad de aprobación" para marketing — no es un cálculo actuarial ni legal,
// es una traducción directa del score (0-100) a un número más persuasivo para la
// pantalla de resultado. Se limita entre MIN y MAX para nunca mostrar un 0% (lee
// como "imposible") ni un 100% (lee como "garantizado"), lo cual sería una promesa
// que no podemos respaldar. Ajusta estos dos números si quieres correr el rango.
const APPROVAL_PCT_MIN = 12;
const APPROVAL_PCT_MAX = 94;

function computeApprovalPercentage(totalScore) {
  return Math.round(Math.min(APPROVAL_PCT_MAX, Math.max(APPROVAL_PCT_MIN, totalScore)));
}

// Clasifica un pilar individual en fuerte/medio/riesgo según su % dentro de su
// propio máximo — mismos cortes que las bandas generales (70/40), así el color
// y el texto de cada pilar son consistentes con el resultado global.
function getPillarTier(score, max) {
  const pct = (score / max) * 100;
  if (pct >= 70) return "fuerte";
  if (pct >= 40) return "medio";
  return "riesgo";
}

// Cada pregunta: id, pilar, texto, tipo (single|multi), opciones con puntos.
// `capPoints` (solo en multiselect) limita la suma máxima de esa pregunta aunque
// se marquen varias opciones que sumarían más — evita que una sola pregunta
// domine el pilar completo.
const QUESTIONS = [
  // ---------- PILAR 1 — Vínculos económicos (máx 30) ----------
  {
    id: "q1_propiedad",
    pillar: "economico",
    type: "multi",
    text: "¿Tienes propiedad a tu nombre en RD?",
    capPoints: 12,
    options: [
      { value: "casa", label: "Casa o apartamento", points: 8 },
      { value: "vehiculo", label: "Vehículo", points: 4 },
      { value: "terreno_negocio", label: "Terreno o negocio", points: 5 },
      { value: "ninguna", label: "Ninguna", points: 0, exclusive: true },
    ],
  },
  {
    id: "q2_ingreso",
    pillar: "economico",
    type: "single",
    text: "¿Tu ingreso mensual aproximado?",
    options: [
      { value: "menos_30k", label: "Menos de RD$30,000", points: 2 },
      { value: "30_60k", label: "RD$30,000 – 60,000", points: 6 },
      { value: "60_120k", label: "RD$60,000 – 120,000", points: 10 },
      { value: "mas_120k", label: "Más de RD$120,000", points: 12 },
    ],
  },
  {
    id: "q3_cuenta",
    pillar: "economico",
    type: "single",
    text: "¿Tienes cuenta bancaria con movimiento regular de 6+ meses?",
    options: [
      { value: "si", label: "Sí", points: 6 },
      { value: "menos_6m", label: "Menos de 6 meses", points: 3 },
      { value: "no", label: "No", points: 0 },
    ],
  },

  // ---------- PILAR 2 — Vínculos laborales (máx 25) ----------
  {
    id: "q4_situacion",
    pillar: "laboral",
    type: "multi",
    text: "¿Cuál es tu situación laboral?",
    // Multiselect porque hay gente con más de una fuente de ingresos (ej. empleado
    // formal que además tiene un negocio). capPoints = el máximo de una sola opción
    // (empleado formal, 10) para que combinar respuestas nunca dispare el pilar por
    // encima de PILLAR_MAX.laboral.
    capPoints: 10,
    options: [
      { value: "empleado", label: "Empleado formal", points: 10 },
      { value: "cuenta_propia", label: "Cuenta propia / negocio", points: 8 },
      { value: "informal", label: "Informal", points: 4 },
      { value: "estudiante", label: "Estudiante", points: 5 },
      { value: "no_trabajo", label: "No trabajo", points: 0, exclusive: true },
    ],
  },
  {
    id: "q5_tiempo",
    pillar: "laboral",
    type: "single",
    text: "¿Cuánto tiempo tienes en tu empleo o negocio actual?",
    options: [
      { value: "menos_1", label: "Menos de 1 año", points: 2 },
      { value: "1_3", label: "1 – 3 años", points: 5 },
      { value: "mas_3", label: "3+ años", points: 8 },
      { value: "na", label: "No aplica", points: 0 },
    ],
  },
  {
    id: "q6_documentar",
    pillar: "laboral",
    type: "single",
    text: "¿Puedes obtener carta de trabajo o demostrar ingresos con documentos?",
    options: [
      { value: "si_facil", label: "Sí, fácilmente", points: 7 },
      { value: "con_esfuerzo", label: "Con esfuerzo", points: 3 },
      { value: "no", label: "No", points: 0 },
    ],
  },

  // ---------- PILAR 3 — Vínculos familiares/sociales (máx 20) ----------
  {
    id: "q7_hijos",
    pillar: "familiar",
    type: "single",
    text: "¿Tienes hijos menores que se quedarían en RD?",
    options: [
      { value: "si", label: "Sí", points: 8 },
      { value: "no_hijos", label: "No tengo hijos", points: 3 },
      { value: "extranjero", label: "Mis hijos viven en el extranjero (no en RD)", points: 2 },
      { value: "viajarian", label: "Viajarían conmigo", points: 0 },
    ],
  },
  {
    id: "q8_civil",
    pillar: "familiar",
    type: "single",
    text: "¿Cuál es tu estado civil?",
    options: [
      { value: "casado", label: "Casado/a", points: 7 },
      { value: "union_libre", label: "Unión libre", points: 4 },
      { value: "soltero", label: "Soltero/a", points: 2 },
    ],
  },
  {
    id: "q9_familia_eeuu",
    pillar: "familiar",
    type: "single",
    text: "¿Tienes familiares directos viviendo en EEUU?",
    // Nota de scoring: familia en EEUU NO es negativo automático — "sí con estatus"
    // y "no" puntúan igual. "Sí sin estatus" resta poco pero activa un flag educativo.
    options: [
      { value: "si_estatus", label: "Sí, con estatus legal", points: 5 },
      { value: "si_sin_estatus", label: "Sí, sin estatus", points: 3 },
      { value: "no", label: "No", points: 5 },
    ],
  },

  // ---------- PILAR 4 — Historial migratorio (máx 25) ----------
  {
    id: "q10_negacion",
    pillar: "historial",
    type: "single",
    text: "¿Te han negado una visa americana antes?",
    options: [
      { value: "aprobada_antes", label: "No, me la aprobaron antes", points: 10 },
      { value: "nunca_aplicado", label: "Nunca he aplicado", points: 7 },
      { value: "una_vez", label: "Sí, una vez", points: 3 },
      { value: "mas_de_una", label: "Sí, más de una vez", points: 0 },
    ],
  },
  {
    id: "q11_viajes",
    pillar: "historial",
    type: "single",
    text: "¿Has viajado fuera de RD?",
    options: [
      { value: "eeuu", label: "Sí, a EEUU", points: 8 },
      { value: "otros_con_visa", label: "Sí, a otros países con visa (Schengen/Canadá)", points: 6 },
      { value: "sin_visa", label: "Sí, solo a países sin visa", points: 3 },
      { value: "nunca", label: "Nunca", points: 1 },
    ],
  },
  {
    id: "q12_edad",
    pillar: "historial",
    type: "single",
    text: "¿Cuál es tu edad?",
    options: [
      { value: "18_24", label: "18 – 24", points: 3 },
      { value: "25_34", label: "25 – 34", points: 6 },
      { value: "35_49", label: "35 – 49", points: 7 },
      { value: "50_mas", label: "50+", points: 5 },
    ],
  },
];

// Preguntas de seguimiento (follow-up): se insertan dinámicamente justo después de
// la pregunta padre SOLO si la respuesta activa el `trigger`. Cada persona ve un
// flujo distinto según sus respuestas — eso le da más veracidad al test.
// No suman puntos directo (para no romper el presupuesto de 100 pts entre pilares),
// pero pueden alimentar flags con más contexto (ver computeFlags). Para agregar una
// nueva, solo añade un objeto más a este array — app.js las maneja genéricamente.
const FOLLOW_UPS = [
  {
    afterQuestionId: "q9_familia_eeuu",
    trigger: (value) => value === "si_estatus" || value === "si_sin_estatus",
    question: {
      id: "q9b_tiempo_familia",
      parentId: "q9_familia_eeuu",
      pillar: "familiar",
      type: "single",
      text: "¿Cuánto tiempo tiene tu familiar viviendo en EEUU?",
      options: [
        { value: "menos_2", label: "Menos de 2 años" },
        { value: "2_5", label: "2 – 5 años" },
        { value: "mas_5", label: "Más de 5 años" },
      ],
    },
  },
];

// Flags: no suman/restan puntos — se usan para el mensaje de WhatsApp (mini-CRM)
// y podrían usarse a futuro para personalizar el routing del reporte pago.
function computeFlags(answers) {
  const flags = [];

  if (answers.q10_negacion === "mas_de_una") flags.push({ code: "NEG", label: "Negado más de una vez" });
  else if (answers.q10_negacion === "una_vez") flags.push({ code: "NEG1", label: "Negado una vez" });

  const sinPropiedad =
    !answers.q1_propiedad ||
    answers.q1_propiedad.length === 0 ||
    (answers.q1_propiedad.length === 1 && answers.q1_propiedad[0] === "ninguna");
  if (answers.q12_edad === "18_24" && answers.q8_civil === "soltero" && sinPropiedad) {
    flags.push({ code: "JS", label: "Joven, soltero/a y sin propiedad" });
  }

  if (answers.q9_familia_eeuu === "si_sin_estatus") {
    flags.push({ code: "FSE", label: "Familiar en EEUU sin estatus legal" });
  }

  const familiaEnEeuu = answers.q9_familia_eeuu === "si_estatus" || answers.q9_familia_eeuu === "si_sin_estatus";
  if (familiaEnEeuu && answers.q9b_tiempo_familia === "mas_5") {
    flags.push({ code: "FAM5", label: "Familiar en EEUU establecido hace más de 5 años" });
  }

  const tieneCuentaPropia = Array.isArray(answers.q4_situacion) && answers.q4_situacion.includes("cuenta_propia");
  if (tieneCuentaPropia && answers.q6_documentar === "no") {
    flags.push({ code: "CPSD", label: "Cuenta propia sin poder documentar ingresos" });
  }

  const sinHijosEnRD = answers.q7_hijos === "no_hijos" || answers.q7_hijos === "extranjero";
  if (sinHijosEnRD && answers.q8_civil === "soltero") {
    flags.push({ code: "SVF", label: "Vínculo familiar débil (sin hijos en RD y soltero/a)" });
  }

  return flags;
}

function scorePillar(pillarKey, answers) {
  const questions = QUESTIONS.filter((q) => q.pillar === pillarKey);
  let total = 0;

  questions.forEach((q) => {
    const answer = answers[q.id];
    if (answer === undefined || answer === null) return;

    if (q.type === "multi") {
      const selected = Array.isArray(answer) ? answer : [];
      let sum = 0;
      selected.forEach((value) => {
        const opt = q.options.find((o) => o.value === value);
        if (opt) sum += opt.points;
      });
      if (typeof q.capPoints === "number") sum = Math.min(sum, q.capPoints);
      total += sum;
    } else {
      const opt = q.options.find((o) => o.value === answer);
      if (opt) total += opt.points;
    }
  });

  return total;
}

// Punto de entrada principal: recibe el objeto de respuestas { [questionId]: value }
// y devuelve el resultado completo listo para pintar en pantalla y mandar por WhatsApp.
function computeResult(answers) {
  const pillarScores = {};
  Object.keys(PILLARS).forEach((key) => {
    pillarScores[key] = scorePillar(key, answers);
  });

  const total = Object.values(pillarScores).reduce((a, b) => a + b, 0);
  const band = getBand(total);
  const flags = computeFlags(answers);
  const approvalPercentage = computeApprovalPercentage(total);

  return {
    total,
    band: band.id,
    bandCode: band.code,
    pillarScores,
    pillarMax: PILLAR_MAX,
    flags,
    approvalPercentage,
  };
}

// Código compacto para el mensaje de WhatsApp, ej: "VC:M|E:18|L:12|F:15|H:9|FLAGS:NEG,SP"
function encodeResultForWhatsapp(result) {
  const { bandCode, pillarScores, flags } = result;
  const flagCodes = flags.map((f) => f.code).join(",") || "NINGUNO";
  return `VC:${bandCode}|E:${pillarScores.economico}|L:${pillarScores.laboral}|F:${pillarScores.familiar}|H:${pillarScores.historial}|FLAGS:${flagCodes}`;
}
