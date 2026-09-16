// Los dos servicios que se cobran. La evaluación del quiz es gratis y no
// entra aquí: no se agenda ni se paga. Estos ids son los mismos que valida
// visas_crear_cita en la base (migration_006), así que no se cambian solos.
const SERVICIOS = [
  {
    id: "orientacion",
    nombre: "Orientación Rápida",
    // Para meterlo dentro de una frase ("Confirma y paga tu ..."), donde el
    // nombre propio del servicio no encaja bien.
    nombreCorto: "orientación",
    resumen: "Hablas con un asesor y sales sabiendo qué hacer.",
    pasos: [
      "Eliges tu horario y pagas tu orientación",
      "Un asesor confirma tu cita",
      "Llenas tu formulario de datos",
      "Entras a tu reunión virtual con el asesor"
    ]
  },
  {
    id: "proceso",
    nombre: "Iniciar Proceso",
    nombreCorto: "proceso",
    resumen: "Nos encargamos de tu proceso de principio a fin.",
    pasos: [
      "Eliges tu horario y pagas para arrancar tu proceso",
      "Un asesor confirma tu cita",
      "Llenas tu formulario de datos",
      "En tu reunión virtual arrancamos tu expediente"
    ]
  }
];

const SERVICIO_POR_DEFECTO = "orientacion";

// ---------- En qué punto va el proceso de la persona ----------
// Toda solicitud empieza de una de dos formas: desde cero, o continuando algo
// que ya existe. Residencia es el único caso que además distingue la etapa
// exacta, porque cada etapa se identifica con números de caso distintos.

// Formatos reales de los números que entrega el consulado / USCIS.
// Se validan para que la asesora no reciba un número mal copiado.
const FORMATOS_NUMERO_CASO = {
  SDO: { prefijos: ["SDO"], digitos: 10, nombre: "número de caso (SDO)" },
  IOE: { prefijos: ["IOE"], digitos: 10, nombre: "número de recibo (IOE)" },
  USCIS: {
    prefijos: ["EAC", "WAC", "LIN", "SRC", "NBC", "MSC", "YSC", "MCT", "IOE"],
    digitos: 10,
    nombre: "número de recibo de USCIS"
  },
  // IVSCA confirmado por Gedalia el 7 ago 2026 (se había dudado con EVSCA).
  INVOICE: { prefijos: ["IVSCA"], digitos: 11, nombre: "número de invoice" }
};

function ejemploNumeroCaso(clave) {
  const f = FORMATOS_NUMERO_CASO[clave];
  return f ? f.prefijos[0] + "0".repeat(f.digitos) : "";
}

function descripcionFormato(clave) {
  const f = FORMATOS_NUMERO_CASO[clave];
  return `${f.prefijos.join(" o ")} y ${f.digitos} números`;
}

// Devuelve el número ya normalizado (mayúsculas, sin espacios ni guiones) o
// el motivo del rechazo, para poder decirle a la persona qué le falta.
function validarNumeroCaso(valor, clavesAceptadas) {
  const limpio = String(valor ?? "").toUpperCase().replace(/[\s.-]/g, "");
  if (!limpio) return { ok: false, motivo: "vacio" };
  for (const clave of clavesAceptadas) {
    const f = FORMATOS_NUMERO_CASO[clave];
    for (const prefijo of f.prefijos) {
      if (new RegExp(`^${prefijo}\\d{${f.digitos}}$`).test(limpio)) {
        return { ok: true, valor: limpio };
      }
    }
  }
  return { ok: false, motivo: "formato" };
}

const ETAPAS_RESIDENCIA = [
  {
    id: "iniciar-peticion",
    nombre: "Quiero iniciar una petición",
    detalle: "Todavía no hay nada metido, empiezas desde cero.",
    grupos: [
      {
        titulo: "Cuéntanos cómo sería la petición",
        campos: [
          {
            id: "detalle_peticion",
            etiqueta: "Explica brevemente si serías el peticionario o el beneficiario y cuál es el estatus legal del peticionario en Estados Unidos",
            tipo: "parrafo",
            ayuda: "Después del pago te enviaremos el cuestionario formal con todos los datos necesarios."
          }
        ]
      }
    ]
  },
  {
    id: "seguimiento",
    nombre: "Ya tengo una petición y quiero darle seguimiento",
    detalle: "La petición ya está metida y quieres saber cómo va.",
    tarifaEspecial: "revision",
    grupos: [
      {
        titulo: "Datos de quien pide",
        campos: [
          { id: "nombre_peticionario", etiqueta: "Nombre completo del peticionario", tipo: "texto" }
        ]
      },
      {
        titulo: "Datos de quien está siendo pedido",
        campos: [
          { id: "nombre_beneficiario", etiqueta: "Nombre completo del beneficiario", tipo: "texto" }
        ]
      },
      {
        titulo: "El número de tu caso",
        campos: [
          {
            id: "numero_caso", etiqueta: "Tu número de caso o de recibo", tipo: "numero-caso",
            acepta: ["SDO", "USCIS"],
            opcional: true,
            ayuda: "Puedes usar el caso del consulado (SDO) o un recibo de USCIS. Si no lo tienes a mano, puedes continuar y revisarlo con tu asesor."
          }
        ]
      }
    ]
  },
  {
    id: "seis-pasos",
    nombre: "Voy en el proceso de los 6 pasos",
    detalle: "Tu caso ya pasó a la etapa de documentos y pagos.",
    tarifaEspecial: "revision",
    grupos: [
      {
        titulo: "Las personas del caso",
        campos: [
          { id: "nombre_peticionario", etiqueta: "Nombre completo del peticionario", tipo: "texto" },
          { id: "nombre_beneficiario", etiqueta: "Nombre completo del beneficiario", tipo: "texto" }
        ]
      },
      {
        titulo: "Los números de tu caso",
        campos: [
          { id: "numero_caso", etiqueta: "Número de caso", tipo: "numero-caso", acepta: ["SDO"] },
          { id: "numero_invoice", etiqueta: "Número de invoice", tipo: "numero-caso", acepta: ["INVOICE"] }
        ]
      }
    ]
  },
  {
    id: "cita-programada",
    nombre: "Ya tengo cita de residencia",
    detalle: "Tu entrevista en el consulado ya tiene fecha.",
    tarifaEspecial: "revision",
    grupos: [
      {
        titulo: "Las personas del caso",
        campos: [
          { id: "nombre_peticionario", etiqueta: "Nombre completo del peticionario", tipo: "texto" },
          { id: "nombre_beneficiario", etiqueta: "Nombre completo del beneficiario", tipo: "texto" }
        ]
      },
      {
        titulo: "Tu cita en el consulado",
        campos: [
          { id: "numero_caso", etiqueta: "Número de caso", tipo: "numero-caso", acepta: ["SDO"] },
          {
            id: "fecha_cita", etiqueta: "¿Qué día es tu cita?", tipo: "fecha-futura",
            ayuda: "Así tu asesor sabe cuánto tiempo hay para prepararte."
          }
        ]
      }
    ]
  }
];

// Para el resto de las categorías: siempre las dos puertas de entrada.
const ETAPAS_GENERALES = [
  {
    id: "nueva",
    nombre: "Quiero iniciar una solicitud nueva",
    detalle: "Empiezas desde cero.",
    grupos: []
  },
  {
    id: "continuar",
    nombre: "Ya tengo un proceso y quiero continuarlo",
    detalle: "Ya hiciste algo antes y quieres seguir desde ahí.",
    servicioObligatorio: "orientacion",
    tarifaEspecial: "revision",
    mensajeServicio: "Como el proceso ya fue iniciado, primero revisaremos lo que se ha hecho en una consulta de evaluación. Esta revisión puede tener un costo mayor que una consulta regular.",
    grupos: [
      {
        titulo: "¿En qué punto va tu proceso?",
        campos: [
          {
            id: "detalle_proceso",
            etiqueta: "Cuéntanos en pocas palabras qué has hecho y dónde te quedaste",
            tipo: "parrafo",
            ayuda: "Con esto tu asesor llega preparado a la reunión."
          }
        ]
      }
    ]
  }
];

const ETAPA_ORIENTACION_GENERAL = [{
  // Es una clasificación interna del wizard, no una etapa migratoria. Se
  // guarda como null para que los correos no muestren un identificador técnico.
  id: null,
  nombre: "Necesito ayuda para identificar mi trámite",
  detalle: "Un asesor revisará tu situación y te indicará por dónde empezar.",
  servicioObligatorio: "orientacion",
  grupos: [{
    titulo: "Cuéntanos qué necesitas",
    campos: [{
      id: "detalle_proceso",
      etiqueta: "Describe brevemente tu situación o la duda que quieres resolver",
      tipo: "parrafo",
      ayuda: "No hace falta que conozcas el nombre técnico del trámite."
    }]
  }]
}];

function etapasDeCategoria(categoria) {
  if (categoria?.etapas === "residencia") return ETAPAS_RESIDENCIA;
  if (categoria?.etapas === "orientacion-general") return ETAPA_ORIENTACION_GENERAL;
  return ETAPAS_GENERALES;
}

function etapaPorId(categoria, id) {
  return etapasDeCategoria(categoria).find((e) => e.id === id) || null;
}

// Para el panel, que recibe solo el id guardado en la cita y no la categoría.
// Los ids no se repiten entre los dos juegos de etapas, así que basta buscar
// en ambos; si algún día se repitieran, esto devolvería la etapa equivocada.
function nombreEtapa(id) {
  if (!id) return "—";
  const etapa = [...ETAPAS_RESIDENCIA, ...ETAPAS_GENERALES, ...ETAPA_ORIENTACION_GENERAL].find((e) => e.id === id);
  return etapa ? etapa.nombre : id;
}

function servicioPorId(id) {
  return SERVICIOS.find((s) => s.id === id) || null;
}

// Para mostrar. Si llegara un id desconocido se deja en blanco a propósito:
// es preferible no decir nada a etiquetar mal lo que el cliente compró.
function nombreServicio(id) {
  const servicio = servicioPorId(id);
  return servicio ? servicio.nombre : "—";
}

function categoriaOrientacionGeneral(paisId) {
  return {
    id: `orientacion-general-${paisId}`,
    nombre: "No sé cuál trámite elegir",
    resumen: "Cuéntanos tu situación y un asesor te ayuda a identificar el punto de partida",
    casoDirecto: true,
    etapaDirecta: true,
    etapas: "orientacion-general",
    servicioObligatorio: "orientacion",
    mensajeServicio: "Esta ruta agenda una Orientación Rápida para identificar el trámite adecuado. No inicia una solicitud ni predice una aprobación.",
    casos: [{
      id: `orientacion-general-${paisId}`,
      nombre: "Identificar mi trámite",
      resumen: "Consulta para aclarar qué trámite corresponde a tu situación.",
      precios: { orientacion: null, proceso: null },
      visible: true,
      orden: 1
    }]
  };
}

const CATALOGO_DEFAULT = [
  {
    id: "usa",
    nombre: "Estados Unidos",
    categorias: [
      {
        id: "no-inmigrante",
        nombre: "Visa de no inmigrante",
        resumen: "Viajes temporales: turismo, estudio, trabajo religioso, arte o para casarte",
        casos: [
          // B-1 y B-2 se solicitan juntas en una sola aplicación, así que
          // separarlas solo obligaba al cliente a adivinar cuál le tocaba.
          // El viaje por tratamiento médico también es una B-2 y entra aquí.
          {
            id: "b1-b2",
            nombre: "Visa B1/B2 — Solicitud individual",
            resumen: "Turismo, visitas, negocios o tratamiento médico. Primero evaluamos tu caso antes de iniciar la solicitud.",
            servicioObligatorio: "orientacion",
            mensajeServicio: "La solicitud B1/B2 comienza con una consulta de evaluación. En esa cita revisamos tu perfil antes de recomendar el siguiente paso.",
            precios: { orientacion: null, proceso: null }, visible: true, orden: 1
          },
          {
            id: "b1-b2-grupo",
            nombre: "Visa B1/B2 — Cita de grupo",
            resumen: "Para deportistas y grupos de trabajo que viajan juntos por entrenamientos o una actividad común.",
            servicioObligatorio: "orientacion",
            mensajeServicio: "Las citas de grupo comienzan con una consulta de evaluación para revisar a los integrantes y el motivo común del viaje.",
            precios: { orientacion: null, proceso: null }, visible: true, orden: 2
          },
          { id: "f1-estudiante", nombre: "Estudiante", resumen: "Para estudiar en una universidad, colegio o instituto en Estados Unidos.", precios: { orientacion: null, proceso: null }, visible: true, orden: 4 },
          { id: "r1-religioso", nombre: "Trabajo religioso", resumen: "Para trabajar temporalmente en una iglesia u organización religiosa.", precios: { orientacion: null, proceso: null }, visible: true, orden: 5 },
          { id: "o1-artista", nombre: "Artista o talento excepcional", resumen: "Para artistas, deportistas o profesionales con logros reconocidos.", precios: { orientacion: null, proceso: null }, visible: true, orden: 6 },
          { id: "k1-prometido", nombre: "Prometido o prometida de ciudadano", resumen: "Para viajar a casarte con un ciudadano americano y luego pedir tu residencia.", precios: { orientacion: null, proceso: null }, visible: true, orden: 7 }
        ]
      },
      {
        id: "renovacion-visa",
        nombre: "Renovar mi visa",
        resumen: "Tu visa está por vencer o ya venció",
        casos: [
          { id: "renovar-b1-b2", nombre: "Renovar visa B1/B2", resumen: "Renovación de visa para turismo, visitas o negocios.", precios: { orientacion: null, proceso: null }, visible: true, orden: 1 },
          { id: "renovar-estudiante", nombre: "Renovar visa de estudiante", resumen: "Renovación de tu visa para continuar estudios en Estados Unidos.", precios: { orientacion: null, proceso: null }, visible: true, orden: 2 },
          { id: "renovar-trabajo", nombre: "Renovar visa de trabajo", resumen: "Renovación de una visa de trabajo temporal en Estados Unidos.", precios: { orientacion: null, proceso: null }, visible: true, orden: 3 }
        ]
      },
      {
        id: "esta",
        nombre: "Permiso ESTA",
        resumen: "Autorización electrónica para viajeros elegibles que entran a Estados Unidos sin visa",
        casoDirecto: true,
        casos: [
          { id: "esta-estados-unidos", nombre: "Permiso ESTA", resumen: "Solicitud o revisión de una autorización ESTA.", precios: { orientacion: null, proceso: null }, visible: true, orden: 1 }
        ]
      },
      {
        id: "residencia",
        nombre: "Visa de residencia",
        resumen: "Cuando un familiar en Estados Unidos te está pidiendo",
        // Residencia distingue la etapa exacta del proceso, no solo si empieza
        // o continúa: cada etapa se identifica con números de caso distintos.
        etapas: "residencia",
        servicioObligatorio: "orientacion",
        mensajeServicio: "Los trámites de residencia comienzan con una consulta para revisar la etapa y los documentos del caso. El cuestionario formal se envía después del pago.",
        // Y aquí la etapa se pregunta ANTES que el caso: quien ya va por los
        // 6 pasos o ya tiene su cita no llega pensando "quién me pidió", sino
        // "en qué punto estoy". En el resto de categorías es al revés.
        etapaPrimero: true,
        casos: [
          {
            id: "peticion-familiar-nueva",
            nombre: "Petición familiar nueva",
            resumen: "Primero revisamos quién presenta la petición y el estatus migratorio declarado.",
            precios: { orientacion: null, proceso: null }, visible: true, orden: 0
          },
          { id: "peticion-esposo", nombre: "Te pidió tu esposo o esposa", resumen: "Petición familiar de tu cónyuge, ciudadano o residente.", precios: { orientacion: null, proceso: null }, visible: true, orden: 1 },
          { id: "peticion-padres", nombre: "Te pidió tu mamá o papá", resumen: "Petición de un padre o madre ciudadano americano.", precios: { orientacion: null, proceso: null }, visible: true, orden: 2 },
          { id: "peticion-hijo", nombre: "Te pidió tu hijo o hija", resumen: "Petición de un hijo mayor de 21 años, ciudadano americano.", precios: { orientacion: null, proceso: null }, visible: true, orden: 3 },
          { id: "peticion-hermano", nombre: "Te pidió tu hermano o hermana", resumen: "Petición de un hermano ciudadano americano (proceso más largo).", precios: { orientacion: null, proceso: null }, visible: true, orden: 4 }
        ]
      },
      {
        id: "ciudadania-pasaportes",
        nombre: "Ciudadanía y pasaportes",
        resumen: "Trámites de pasaporte americano y ciudadanía para tus hijos",
        casos: [
          { id: "pasaporte-nuevo", nombre: "Solicitar pasaporte nuevo", resumen: "Primera vez que solicitas tu pasaporte americano fuera de Estados Unidos.", precios: { orientacion: null, proceso: null }, visible: true, orden: 1 },
          { id: "pasaporte-renovar", nombre: "Renovar mi pasaporte", resumen: "Tu pasaporte está por vencer o ya venció.", precios: { orientacion: null, proceso: null }, visible: true, orden: 2 },
          { id: "pasaporte-perdido", nombre: "Se me perdió el pasaporte", resumen: "Tu pasaporte se perdió o te lo robaron.", precios: { orientacion: null, proceso: null }, visible: true, orden: 3 },
          { id: "ciudadania-hijos", nombre: "Solicitar la ciudadanía para mis hijos", resumen: "Quieres que tus hijos tengan la ciudadanía americana.", precios: { orientacion: null, proceso: null }, visible: true, orden: 4 }
        ]
      },
      {
        // Va aparte de los demás trámites a propósito: aquí la visa ya no es
        // el problema, lo urgente es adelantar la fecha de la cita.
        id: "citas-urgentes",
        nombre: "Citas urgentes",
        resumen: "Cuando no puedes esperar el tiempo normal de espera",
        casos: [
          { id: "cita-emergencia", nombre: "Necesito una cita urgente", resumen: "Tu situación no puede esperar la fecha que te dieron.", precios: { orientacion: null, proceso: null }, visible: true, orden: 1 }
        ]
      },
      {
        id: "perdon-migratorio",
        nombre: "Perdón migratorio",
        resumen: "Cuando algo en tu historial migratorio te está bloqueando",
        casos: [
          { id: "perdon-migratorio", nombre: "Necesito un perdón migratorio", resumen: "Algo en tu pasado migratorio (una negación, una salida, un caso previo) necesita un perdón especial para poder avanzar.", precios: { orientacion: null, proceso: null }, visible: true, orden: 1 }
        ]
      },
      categoriaOrientacionGeneral("usa")
    ]
  },
  {
    id: "europa",
    nombre: "Europa",
    categorias: [
      {
        id: "visa-schengen",
        nombre: "Visa Schengen",
        resumen: "Para viajes de corta duración a países del espacio Schengen",
        casoDirecto: true,
        casos: [
          { id: "visa-schengen", nombre: "Visa Schengen", resumen: "Inicia una solicitud nueva o continúa un proceso que ya comenzaste.", precios: { orientacion: null, proceso: null }, visible: true, orden: 1 }
        ]
      },
      categoriaOrientacionGeneral("europa")
    ]
  },
  {
    id: "chile",
    nombre: "Chile",
    categorias: [
      {
        id: "turismo",
        nombre: "Turismo",
        resumen: "Visita a Chile por tiempo limitado",
        casos: [
          { id: "chile-1-entrada", nombre: "Turismo, una entrada", resumen: "Visita única a Chile hasta 90 días.", precios: { orientacion: null, proceso: null }, visible: true, orden: 1 },
          { id: "chile-estadia-extendida", nombre: "Quiero quedarme más tiempo", resumen: "Ya estás en Chile y necesitas extender tu estadía de turista.", precios: { orientacion: null, proceso: null }, visible: true, orden: 2 }
        ]
      },
      categoriaOrientacionGeneral("chile")
    ]
  },
  {
    id: "canada",
    nombre: "Canadá",
    categorias: [
      {
        id: "no-inmigrante",
        nombre: "Visas para Canadá",
        resumen: "Turismo temporal o trabajo con un empleador canadiense",
        servicioObligatorio: "orientacion",
        mensajeServicio: "Estos trámites comienzan con una consulta para confirmar requisitos y revisar el punto de partida.",
        casos: [
          { id: "canada-turismo", nombre: "Visa de residencia temporal (turismo)", resumen: "Para visitar Canadá por un período temporal.", precios: { orientacion: null, proceso: null }, visible: true, orden: 1 },
          {
            id: "canada-trabajo",
            nombre: "Visa de trabajo",
            resumen: "Para solicitar la visa cuando ya tienes un empleador canadiense.",
            avisoPrevioPago: "Para contratar este servicio ya debes tener una oferta o contrato de un empleador canadiense. Nuestro trabajo cubre la solicitud de la visa; no conseguimos empleos ni empleadores.",
            precios: { orientacion: null, proceso: null }, visible: true, orden: 2
          }
        ]
      },
      categoriaOrientacionGeneral("canada")
    ]
  }
];

const CATALOGO_STORAGE_KEY = "catalogo_visas_v3";
const CATALOGO_STORAGE_KEY_V2 = "catalogo_visas_v2";
const CATALOGO_STORAGE_KEY_V1 = "catalogo_visas_v1";

function leerCatalogoGuardado(clave) {
  const guardado = localStorage.getItem(clave);
  if (!guardado) return null;
  try {
    const datos = JSON.parse(guardado);
    return Array.isArray(datos) ? datos : null;
  } catch (e) {
    console.warn("Catálogo guardado corrupto, usando el de fábrica.", e);
    return null;
  }
}

// Cuando el catálogo de fábrica cambia (se agregan o quitan casos, o se
// corrige un texto), el guardado del navegador no debe congelar la versión
// vieja: se parte del de fábrica y solo se rescata lo que el admin editó
// (precios, visibilidad y orden), buscando cada caso por su id. Así un caso
// eliminado desaparece y uno nuevo aparece, sin perder los precios puestos.
// Casos que cambiaron de id. Sin esto, al renombrar o fusionar un caso se
// perderían los precios que ya estuvieran configurados para el id viejo, y la
// web quedaría cobrando "por confirmar" sin que nadie se diera cuenta.
// El orden importa: gana el primero que tenga precio.
const IDS_ANTERIORES = {
  "b1-b2": ["b2-turismo", "b1-negocios", "visa-medica"],
  "renovar-b1-b2": ["renovar-visa"],
  "renovar-estudiante": ["renovar-visa"],
  "renovar-trabajo": ["renovar-visa"]
};

function fusionarConDefault(guardado) {
  const porId = new Map();
  guardado.forEach((pais) =>
    (pais.categorias || []).forEach((cat) =>
      (cat.casos || []).forEach((caso) => porId.set(caso.id, caso))
    )
  );

  // Todos los registros guardados que corresponden a este caso: el suyo y los
  // de sus ids anteriores, en orden de prioridad.
  const candidatos = (id) =>
    [id, ...(IDS_ANTERIORES[id] ?? [])].map((clave) => porId.get(clave)).filter(Boolean);

  // Cada precio se busca por separado: al fusionar varios casos en uno, la
  // orientación puede venir de uno y el proceso de otro, y quedarse con un
  // solo registro perdería el precio del otro.
  const precioRescatado = (id, servicioId) => {
    for (const previo of candidatos(id)) {
      const precio = precioDelCaso(previo, servicioId);
      if (precio !== null) return precio;
    }
    return null;
  };

  const base = JSON.parse(JSON.stringify(CATALOGO_DEFAULT));
  base.forEach((pais) =>
    pais.categorias.forEach((cat) => {
      cat.casos.forEach((caso) => {
        const previo = candidatos(caso.id)[0];
        if (!previo) return;
        const previoExacto = porId.get(caso.id);
        caso.precios = {
          orientacion: precioRescatado(caso.id, "orientacion"),
          proceso: precioRescatado(caso.id, "proceso")
        };
        const revisionGuardada = candidatos(caso.id).find(
          (candidato) => candidato.precioRevision !== null && candidato.precioRevision !== undefined
        );
        caso.precioRevision = revisionGuardada ? revisionGuardada.precioRevision : null;
        if (typeof previo.visible === "boolean") caso.visible = previo.visible;
        // Cuando un caso viejo se divide en varios (por ejemplo, las tres
        // renovaciones), sus precios y visibilidad sí se heredan, pero no su
        // orden: copiar el mismo número a todos rompería los botones subir/bajar.
        if (typeof previoExacto?.orden === "number") caso.orden = previoExacto.orden;
      });

      // Los casos nuevos pueden coincidir con un número de orden que el admin
      // ya había asignado. Se conserva el orden relativo y luego se renumera
      // para que cada valor sea único y los botones subir/bajar siempre funcionen.
      [...cat.casos]
        .sort((a, b) => a.orden - b.orden)
        .forEach((caso, indice) => { caso.orden = indice + 1; });
    })
  );
  return base;
}

// Se fusiona SIEMPRE con el catálogo de fábrica, no solo al cambiar de
// versión: el editor de admin solo toca precios, visibilidad y orden, así que
// nada de lo que él edita se pierde, y a cambio cualquier caso que se agregue,
// se quite o se renombre llega solo. Sin esto habría que acordarse de subir la
// versión cada vez que cambia el catálogo, y olvidarlo deja catálogos viejos
// congelados en el navegador de quien ya lo había abierto.
function cargarCatalogo() {
  const guardado =
    leerCatalogoGuardado(CATALOGO_STORAGE_KEY) ||
    leerCatalogoGuardado(CATALOGO_STORAGE_KEY_V2) ||
    leerCatalogoGuardado(CATALOGO_STORAGE_KEY_V1);

  if (!guardado) return JSON.parse(JSON.stringify(CATALOGO_DEFAULT));

  const fusionado = fusionarConDefault(guardado);
  guardarCatalogo(fusionado);
  return fusionado;
}

function guardarCatalogo(catalogo) {
  localStorage.setItem(CATALOGO_STORAGE_KEY, JSON.stringify(catalogo));
}

function restaurarCatalogoDeFabrica() {
  [CATALOGO_STORAGE_KEY, CATALOGO_STORAGE_KEY_V2, CATALOGO_STORAGE_KEY_V1]
    .forEach((clave) => localStorage.removeItem(clave));
  return JSON.parse(JSON.stringify(CATALOGO_DEFAULT));
}

// Un caso puede venir del catálogo viejo guardado en el navegador, así que
// se acepta el formato anterior en vez de devolver undefined y romper.
function precioDelCaso(caso, servicioId, tarifaEspecial = null) {
  if (!caso) return null;
  if (tarifaEspecial === "revision" && servicioId === "orientacion") {
    return caso.precioRevision ?? null;
  }
  if (caso.precios) return caso.precios[servicioId] ?? null;
  return servicioId === "orientacion" ? caso.precioUSD ?? null : null;
}

function formatearPrecio(precioUSD) {
  if (precioUSD === null || precioUSD === undefined) return "Precio por confirmar";
  return `US$${precioUSD.toLocaleString("en-US")}`;
}
