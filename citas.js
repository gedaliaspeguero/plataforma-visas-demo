const SUPABASE_CONFIGURADO = !SUPABASE_URL.includes("TU-PROYECTO");

async function llamarRPC(nombreFuncion, parametros) {
  const respuesta = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${nombreFuncion}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(parametros),
  });
  const datos = await respuesta.json();
  if (!respuesta.ok) {
    throw new Error(datos?.message || "Error de conexión");
  }
  return datos;
}

function formatearFechaISO(fecha) {
  return fecha.toISOString().slice(0, 10);
}

async function obtenerDisponibilidad(diasHaciaAdelante = 14) {
  const hoy = new Date();
  const limite = new Date();
  limite.setDate(hoy.getDate() + diasHaciaAdelante);
  return llamarRPC("visas_get_disponibilidad", {
    p_desde: formatearFechaISO(hoy),
    p_hasta: formatearFechaISO(limite),
  });
}

async function crearCita(datos) {
  return llamarRPC("visas_crear_cita", {
    p_nombre: datos.nombre,
    p_email: datos.email,
    p_pais_id: datos.paisId,
    p_pais_nombre: datos.paisNombre,
    p_categoria_id: datos.categoriaId,
    p_categoria_nombre: datos.categoriaNombre,
    p_caso_id: datos.casoId,
    p_caso_nombre: datos.casoNombre,
    p_precio: datos.precio,
    p_fecha: datos.fecha,
    p_hora: datos.hora,
    p_perfil: datos.perfil ?? null,
  });
}

async function obtenerFormulario(token) {
  return llamarRPC("visas_get_formulario_por_token", { p_token: token });
}

async function guardarFormulario(token, formulario) {
  return llamarRPC("visas_guardar_formulario", {
    p_token: token,
    p_formulario: formulario,
  });
}

async function notificarFormularioListo(token) {
  try {
    const respuesta = await fetch(`${SUPABASE_FUNCTIONS_URL}/visas-notificar-formulario-listo`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    });
    return respuesta.ok;
  } catch (e) {
    console.warn("No se pudo avisar que el formulario quedó listo:", e);
    return false;
  }
}

async function avisarFormularioListo(token) {
  let enviado = await notificarFormularioListo(token);
  if (!enviado) enviado = await notificarFormularioListo(token);
  return enviado;
}

async function entrarReunionCliente(token) {
  const respuesta = await fetch(`${SUPABASE_FUNCTIONS_URL}/visas-reunion-daily`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ accion: "cliente", token }),
  });
  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos?.error || "reunion_no_disponible");
  return datos;
}

async function notificarCita(token) {
  try {
    const respuesta = await fetch(`${SUPABASE_FUNCTIONS_URL}/visas-notificar-cita`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    });
    return respuesta.ok;
  } catch (e) {
    console.warn("No se pudo notificar por correo (la cita sí quedó guardada):", e);
    return false;
  }
}

function nombreDelDia(fechaISO) {
  const dias = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const [anio, mes, dia] = fechaISO.split("-").map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const manana = new Date(hoy);
  manana.setDate(hoy.getDate() + 1);
  if (fecha.getTime() === hoy.getTime()) return "Hoy";
  if (fecha.getTime() === manana.getTime()) return "Mañana";
  return `${dias[fecha.getDay()]} ${dia}/${mes}`;
}
