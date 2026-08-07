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

function servicioPorId(id) {
  return SERVICIOS.find((s) => s.id === id) || null;
}

// Para mostrar. Si llegara un id desconocido se deja en blanco a propósito:
// es preferible no decir nada a etiquetar mal lo que el cliente compró.
function nombreServicio(id) {
  const servicio = servicioPorId(id);
  return servicio ? servicio.nombre : "—";
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
          { id: "b2-turismo", nombre: "Turismo o visita familiar", resumen: "Para pasear o visitar a tu familia en Estados Unidos por un tiempo corto.", precios: { orientacion: null, proceso: null }, visible: true, orden: 1 },
          { id: "b1-negocios", nombre: "Viaje de negocios", resumen: "Para reuniones, conferencias o trámites de trabajo sin ser empleado allá.", precios: { orientacion: null, proceso: null }, visible: true, orden: 2 },
          { id: "f1-estudiante", nombre: "Estudiante", resumen: "Para estudiar en una universidad, colegio o instituto en Estados Unidos.", precios: { orientacion: null, proceso: null }, visible: true, orden: 3 },
          { id: "r1-religioso", nombre: "Trabajo religioso", resumen: "Para trabajar temporalmente en una iglesia u organización religiosa.", precios: { orientacion: null, proceso: null }, visible: true, orden: 4 },
          { id: "o1-artista", nombre: "Artista o talento excepcional", resumen: "Para artistas, deportistas o profesionales con logros reconocidos.", precios: { orientacion: null, proceso: null }, visible: true, orden: 5 },
          { id: "k1-prometido", nombre: "Prometido o prometida de ciudadano", resumen: "Para viajar a casarte con un ciudadano americano y luego pedir tu residencia.", precios: { orientacion: null, proceso: null }, visible: true, orden: 6 }
        ]
      },
      {
        id: "residencia",
        nombre: "Visa de residencia",
        resumen: "Cuando un familiar en Estados Unidos te está pidiendo",
        casos: [
          { id: "peticion-esposo", nombre: "Te pidió tu esposo o esposa", resumen: "Petición familiar de tu cónyuge, ciudadano o residente.", precios: { orientacion: null, proceso: null }, visible: true, orden: 1 },
          { id: "peticion-padres", nombre: "Te pidió tu mamá o papá", resumen: "Petición de un padre o madre ciudadano americano.", precios: { orientacion: null, proceso: null }, visible: true, orden: 2 },
          { id: "peticion-hijo", nombre: "Te pidió tu hijo o hija", resumen: "Petición de un hijo mayor de 21 años, ciudadano americano.", precios: { orientacion: null, proceso: null }, visible: true, orden: 3 },
          { id: "peticion-hermano", nombre: "Te pidió tu hermano o hermana", resumen: "Petición de un hermano ciudadano americano (proceso más largo).", precios: { orientacion: null, proceso: null }, visible: true, orden: 4 },
          { id: "retomar-caso", nombre: "Quiero retomar mi caso", resumen: "Ya tenías un caso de residencia abierto y quieres continuarlo.", precios: { orientacion: null, proceso: null }, visible: true, orden: 5 },
          { id: "cambiar-caso", nombre: "Quiero cambiar mi caso", resumen: "Tu situación cambió y necesitas ajustar tu solicitud.", precios: { orientacion: null, proceso: null }, visible: true, orden: 6 }
        ]
      },
      {
        id: "ciudadania-pasaportes",
        nombre: "Ciudadanía y pasaportes",
        resumen: "Trámites de pasaporte americano y ciudadanía para tus hijos",
        casos: [
          { id: "pasaporte-nuevo", nombre: "Sacar pasaporte nuevo", resumen: "Primera vez que solicitas tu pasaporte americano fuera de Estados Unidos.", precios: { orientacion: null, proceso: null }, visible: true, orden: 1 },
          { id: "pasaporte-renovar", nombre: "Renovar mi pasaporte", resumen: "Tu pasaporte está por vencer o ya venció.", precios: { orientacion: null, proceso: null }, visible: true, orden: 2 },
          { id: "pasaporte-perdido", nombre: "Se me perdió el pasaporte", resumen: "Tu pasaporte se perdió o te lo robaron.", precios: { orientacion: null, proceso: null }, visible: true, orden: 3 },
          { id: "ciudadania-hijos", nombre: "Sacar la ciudadanía a mis hijos", resumen: "Quieres que tus hijos tengan la ciudadanía americana.", precios: { orientacion: null, proceso: null }, visible: true, orden: 4 }
        ]
      },
      {
        id: "medico-emergencia",
        nombre: "Médico y emergencia",
        resumen: "Tratamiento médico o una cita urgente",
        casos: [
          { id: "visa-medica", nombre: "Viaje por tratamiento médico", resumen: "Para recibir tratamiento médico en Estados Unidos.", precios: { orientacion: null, proceso: null }, visible: true, orden: 1 },
          { id: "cita-emergencia", nombre: "Necesito una cita urgente", resumen: "Tu situación no puede esperar el tiempo normal de espera.", precios: { orientacion: null, proceso: null }, visible: true, orden: 2 }
        ]
      },
      {
        id: "perdon-migratorio",
        nombre: "Perdón migratorio",
        resumen: "Cuando algo en tu historial migratorio te está bloqueando",
        casos: [
          { id: "perdon-migratorio", nombre: "Necesito un perdón migratorio", resumen: "Algo en tu pasado migratorio (una negación, una salida, un caso previo) necesita un perdón especial para poder avanzar.", precios: { orientacion: null, proceso: null }, visible: true, orden: 1 }
        ]
      }
    ]
  },
  {
    id: "europa",
    nombre: "Europa",
    categorias: [
      {
        id: "esta",
        nombre: "Permiso ESTA",
        resumen: "Para ciudadanos europeos que quieren entrar a Estados Unidos",
        casos: [
          { id: "esta-turismo", nombre: "Turismo o negocios", resumen: "Permiso electrónico para entrar a Estados Unidos hasta 90 días, sin visa.", precios: { orientacion: null, proceso: null }, visible: true, orden: 1 }
        ]
      }
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
      }
    ]
  },
  {
    id: "canada",
    nombre: "Canadá",
    categorias: [
      {
        id: "no-inmigrante",
        nombre: "Visitas y trabajo",
        resumen: "Turismo, estadías más largas o trabajo en Canadá",
        casos: [
          { id: "canada-turismo", nombre: "Turismo", resumen: "Visita a Canadá por tiempo corto (hasta 6 meses).", precios: { orientacion: null, proceso: null }, visible: true, orden: 1 },
          { id: "canada-residencia-temporal", nombre: "Residencia temporal", resumen: "Para quedarte en Canadá por un período más largo sin ser residente permanente.", precios: { orientacion: null, proceso: null }, visible: true, orden: 2 },
          { id: "canada-trabajo", nombre: "Visa de trabajo", resumen: "Para trabajar legalmente para un empleador en Canadá.", precios: { orientacion: null, proceso: null }, visible: true, orden: 3 },
          { id: "canada-residencia-permanente", nombre: "Residencia permanente o ciudadanía", resumen: "Para quedarte a vivir en Canadá de forma definitiva.", precios: { orientacion: null, proceso: null }, visible: true, orden: 4 }
        ]
      }
    ]
  }
];

const CATALOGO_STORAGE_KEY = "catalogo_visas_v2";
const CATALOGO_STORAGE_KEY_V1 = "catalogo_visas_v1";

// La versión 1 guardaba un solo `precioUSD` por caso, porque solo se vendía
// la consulta 1 a 1. Ese precio es el de la Orientación Rápida de hoy; el de
// Iniciar Proceso queda por confirmar hasta que lo llenen en el editor.
function migrarCasoV1(caso) {
  if (caso.precios) return caso;
  const { precioUSD, ...resto } = caso;
  return {
    ...resto,
    precios: {
      orientacion: precioUSD ?? null,
      proceso: null
    }
  };
}

function migrarCatalogoV1(catalogo) {
  return catalogo.map((pais) => ({
    ...pais,
    categorias: (pais.categorias || []).map((cat) => ({
      ...cat,
      casos: (cat.casos || []).map(migrarCasoV1)
    }))
  }));
}

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

function cargarCatalogo() {
  const v2 = leerCatalogoGuardado(CATALOGO_STORAGE_KEY);
  if (v2) return v2;

  const v1 = leerCatalogoGuardado(CATALOGO_STORAGE_KEY_V1);
  if (v1) {
    const migrado = migrarCatalogoV1(v1);
    guardarCatalogo(migrado);
    return migrado;
  }

  return JSON.parse(JSON.stringify(CATALOGO_DEFAULT));
}

function guardarCatalogo(catalogo) {
  localStorage.setItem(CATALOGO_STORAGE_KEY, JSON.stringify(catalogo));
}

function restaurarCatalogoDeFabrica() {
  localStorage.removeItem(CATALOGO_STORAGE_KEY);
  localStorage.removeItem(CATALOGO_STORAGE_KEY_V1);
  return JSON.parse(JSON.stringify(CATALOGO_DEFAULT));
}

// Un caso puede venir del catálogo viejo guardado en el navegador, así que
// se acepta el formato anterior en vez de devolver undefined y romper.
function precioDelCaso(caso, servicioId) {
  if (!caso) return null;
  if (caso.precios) return caso.precios[servicioId] ?? null;
  return servicioId === "orientacion" ? caso.precioUSD ?? null : null;
}

function formatearPrecio(precioUSD) {
  if (precioUSD === null || precioUSD === undefined) return "Precio por confirmar";
  return `US$${precioUSD.toLocaleString("en-US")}`;
}
