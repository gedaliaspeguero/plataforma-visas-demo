const MENSAJES_ESTADO = {
  pagada: {
    titulo: "Estamos confirmando tu cita",
    detalle: "Un consultor va a tomar tu caso muy pronto. Si nadie lo confirma en 24 horas, te devolvemos el 100% de tu pago.",
  },
  aceptada: {
    titulo: "¡Tu cita fue confirmada!",
    detalle: "Completa tus datos antes de la reunión para que aprovechemos mejor el tiempo.",
  },
  formulario_listo: {
    titulo: "Ya llenaste tu formulario",
    detalle: "Estamos coordinando tu reunión virtual.",
  },
  reunion_programada: {
    titulo: "Tu reunión está programada",
    detalle: "Entra aquí mismo a la hora de tu cita.",
  },
  completada: {
    titulo: "Tu consulta fue completada",
    detalle: "Gracias por confiar en nosotros.",
  },
  rechazada: {
    titulo: "Esta cita fue rechazada",
    detalle: "Te devolvemos el 100% de tu pago en los próximos días.",
  },
  vencida: {
    titulo: "Nadie pudo confirmar tu cita a tiempo",
    detalle: "Te devolvemos el 100% de tu pago en los próximos días.",
  },
};

async function mostrarEstadoCita() {
  const c = document.getElementById("contenido");
  const token = new URLSearchParams(window.location.search).get("token");

  if (!token) {
    c.innerHTML = `<h1>Falta el código de tu cita</h1><p class="subtitulo">Usa el link que te llegó por correo.</p>`;
    return;
  }
  if (!SUPABASE_CONFIGURADO) {
    c.innerHTML = `<h1>Falta conectar Supabase</h1><p class="subtitulo">Revisa <code>config.js</code>.</p>`;
    return;
  }

  try {
    const resultado = await llamarRPC("visas_get_cita_por_token", { p_token: token });
    if (!resultado.ok) {
      c.innerHTML = `<h1>No encontramos esa cita</h1><p class="subtitulo">Revisa el link o escríbenos.</p>`;
      return;
    }
    const info = MENSAJES_ESTADO[resultado.estado] ?? { titulo: "Estado desconocido", detalle: "" };
    const precio = resultado.precio_usd != null ? formatearPrecio(resultado.precio_usd) : "Por confirmar";
    c.innerHTML = `
      <h1>${info.titulo}</h1>
      <p class="subtitulo">${info.detalle}</p>
      <div class="resumen-caja">
        <div class="resumen-fila"><span class="resumen-etiqueta">Nombre</span><span class="resumen-valor">${escapeHtmlSimple(resultado.cliente_nombre)}</span></div>
        <div class="resumen-fila"><span class="resumen-etiqueta">Caso</span><span class="resumen-valor">${escapeHtmlSimple(resultado.caso_nombre)}</span></div>
        <div class="resumen-fila"><span class="resumen-etiqueta">Fecha</span><span class="resumen-valor">${resultado.fecha} · ${resultado.hora?.slice(0, 5)}</span></div>
        <div class="resumen-fila"><span class="resumen-etiqueta">Precio</span><span class="resumen-valor">${precio}</span></div>
      </div>
      ${resultado.estado === "aceptada" || resultado.estado === "formulario_listo" ? `<button class="boton-primario" id="btn-formulario">${resultado.estado === "formulario_listo" ? "Ver mi formulario" : "Llenar mi formulario"}</button>` : ""}
      ${resultado.estado === "reunion_programada" ? `<button class="boton-primario" id="btn-reunion">Entrar a mi reunión</button>` : ""}
    `;
    const botonFormulario = document.getElementById("btn-formulario");
    if (botonFormulario) botonFormulario.onclick = () => mostrarFormulario(token);
    const botonReunion = document.getElementById("btn-reunion");
    if (botonReunion) botonReunion.onclick = () => abrirReunionCliente(token);
  } catch (e) {
    console.error(e);
    c.innerHTML = `<h1>No pudimos cargar tu cita</h1><p class="subtitulo">Intenta de nuevo en un momento.</p>`;
  }
}

async function abrirReunionCliente(token) {
  const c = document.getElementById("contenido");
  c.innerHTML = `<p class="subtitulo">Preparando tu reunión…</p>`;
  try {
    const datos = await entrarReunionCliente(token);
    c.innerHTML = `<div class="reunion-encabezado"><button class="volver" id="btn-salir-reunion">Salir de la reunión</button><h1>Tu reunión</h1></div><div class="reunion-diaria" id="reunion-diaria"></div>`;
    document.getElementById("btn-salir-reunion").onclick = async () => {
      await cerrarReunionDiaria();
      mostrarEstadoCita();
    };
    await abrirReunionDiaria(document.getElementById("reunion-diaria"), datos, mostrarEstadoCita);
  } catch (e) {
    console.error(e);
    c.innerHTML = `<h1>La reunión todavía no está disponible</h1><p class="subtitulo">Intenta entrar de nuevo cerca de la hora de tu cita.</p><button class="boton-secundario" id="btn-volver-estado">Volver</button>`;
    document.getElementById("btn-volver-estado").onclick = mostrarEstadoCita;
  }
}

function campoTexto(id, etiqueta, valor = "", tipo = "text") {
  return `<label class="campo-formulario" for="${id}"><span>${etiqueta}</span><input id="${id}" type="${tipo}" value="${escapeHtmlSimple(valor)}" /></label>`;
}

function areaTexto(id, etiqueta, valor = "") {
  return `<label class="campo-formulario" for="${id}"><span>${etiqueta}</span><textarea id="${id}" rows="3">${escapeHtmlSimple(valor)}</textarea></label>`;
}

function opcionSiNo(id, etiqueta, valor) {
  return `<fieldset class="campo-formulario"><legend>${etiqueta}</legend><div class="opciones-linea"><label><input type="radio" name="${id}" value="si" ${valor === true ? "checked" : ""} /> Sí</label><label><input type="radio" name="${id}" value="no" ${valor === false ? "checked" : ""} /> No</label></div></fieldset>`;
}

async function mostrarFormulario(token) {
  const c = document.getElementById("contenido");
  c.innerHTML = `<p class="subtitulo">Cargando formulario…</p>`;
  try {
    const resultado = await obtenerFormulario(token);
    if (!resultado.ok) {
      c.innerHTML = `<h1>Este formulario no está disponible</h1><p class="subtitulo">Vuelve a revisar el estado de tu cita.</p>`;
      return;
    }
    const f = resultado.formulario || {};
    c.innerHTML = `
      <button class="volver" id="btn-volver-estado">Volver</button>
      <h1>Cuéntanos sobre tu caso</h1>
      <p class="subtitulo">Esta información la verá tu consultora para preparar la reunión.</p>
      <form id="formulario-cita" class="formulario-cita">
        <h2>Información personal</h2>
        ${campoTexto("nombre", "Nombre completo", f.nombre || resultado.cliente_nombre)}
        ${areaTexto("direccion", "Dirección", f.direccion)}
        ${campoTexto("telefono", "Teléfono", f.telefono, "tel")}
        ${campoTexto("correo", "Correo", f.correo)}
        ${campoTexto("edad", "Edad", f.edad ?? "", "number")}
        ${campoTexto("estado-civil", "Estado civil", f.estado_civil)}
        ${campoTexto("pais-nacimiento", "País de nacimiento", f.pais_nacimiento)}
        ${campoTexto("pais-residencia", "País donde resides", f.pais_residencia)}
        ${campoTexto("estatus-migratorio", "Estatus migratorio actual", f.estatus_migratorio)}
        ${campoTexto("como-nos-conocio", "¿Desde dónde nos contactaste?", f.como_nos_conocio)}
        <h2>Familia</h2>
        ${opcionSiNo("tiene-hijos", "¿Tienes hijos?", f.tiene_hijos)}
        <div id="datos-hijos" ${f.tiene_hijos ? "" : "hidden"}>
          ${campoTexto("cantidad-hijos", "¿Cuántos hijos tienes?", f.cantidad_hijos ?? "", "number")}
          ${opcionSiNo("incluye-hijos", "¿Los incluyes en este caso?", f.incluye_hijos)}
        </div>
        ${areaTexto("familiares-usa", "Familiares en Estados Unidos", f.familiares_usa)}
        <h2>Trabajo y estudios</h2>
        ${areaTexto("trabajo", "¿A qué te dedicas?", f.trabajo)}
        ${opcionSiNo("es-empresario", "¿Eres empresario/a?", f.es_empresario)}
        <div id="datos-empresa" ${f.es_empresario ? "" : "hidden"}>${opcionSiNo("empresa-registrada", "¿Tu empresa está registrada?", f.empresa_registrada)}</div>
        ${campoTexto("nivel-profesional", "Nivel de formación (universitario, técnico u otro)", f.nivel_profesional)}
        ${campoTexto("profesion", "Profesión o especialidad", f.profesion)}
        ${opcionSiNo("haciendo-especialidad", "¿Estás haciendo una especialidad?", f.haciendo_especialidad)}
        <div id="datos-especialidad" ${f.haciendo_especialidad ? "" : "hidden"}>${campoTexto("especialidad", "¿Cuál especialidad?", f.especialidad)}</div>
        ${campoTexto("ingresos", "Ingresos mensuales aproximados", f.ingresos)}
        <p class="subtitulo" id="error-formulario" hidden></p>
        <button class="boton-primario" type="submit">Enviar formulario</button>
      </form>
    `;
    document.getElementById("btn-volver-estado").onclick = mostrarEstadoCita;
    configurarVisibilidadFormulario();
    document.getElementById("formulario-cita").onsubmit = (evento) => enviarFormulario(evento, token);
  } catch (e) {
    console.error(e);
    c.innerHTML = `<h1>No pudimos cargar el formulario</h1><p class="subtitulo">Intenta de nuevo en un momento.</p>`;
  }
}

function leerSiNo(nombre) {
  const opcion = document.querySelector(`input[name="${nombre}"]:checked`);
  return opcion ? opcion.value === "si" : null;
}

function configurarVisibilidadFormulario() {
  const alternar = (nombre, destino) => {
    document.querySelectorAll(`input[name="${nombre}"]`).forEach((input) => {
      input.onchange = () => { document.getElementById(destino).hidden = input.value !== "si"; };
    });
  };
  alternar("tiene-hijos", "datos-hijos");
  alternar("es-empresario", "datos-empresa");
  alternar("haciendo-especialidad", "datos-especialidad");
}

async function enviarFormulario(evento, token) {
  evento.preventDefault();
  const error = document.getElementById("error-formulario");
  const boton = evento.currentTarget.querySelector("button[type=submit]");
  const valor = (id) => document.getElementById(id).value.trim();
  const tieneHijos = leerSiNo("tiene-hijos");
  const esEmpresario = leerSiNo("es-empresario");
  const haciendoEspecialidad = leerSiNo("haciendo-especialidad");
  const edad = valor("edad");
  const formulario = {
    nombre: valor("nombre"), direccion: valor("direccion"), telefono: valor("telefono"), correo: valor("correo"),
    edad: edad === "" ? null : Number(edad), estado_civil: valor("estado-civil"), pais_nacimiento: valor("pais-nacimiento"),
    pais_residencia: valor("pais-residencia"), estatus_migratorio: valor("estatus-migratorio"), como_nos_conocio: valor("como-nos-conocio"),
    tiene_hijos: tieneHijos, trabajo: valor("trabajo"), es_empresario: esEmpresario,
    nivel_profesional: valor("nivel-profesional"), profesion: valor("profesion"), haciendo_especialidad: haciendoEspecialidad,
    ingresos: valor("ingresos"), familiares_usa: valor("familiares-usa"),
  };
  if (tieneHijos) {
    formulario.cantidad_hijos = Number(valor("cantidad-hijos"));
    formulario.incluye_hijos = leerSiNo("incluye-hijos");
  }
  if (esEmpresario) formulario.empresa_registrada = leerSiNo("empresa-registrada");
  if (haciendoEspecialidad) formulario.especialidad = valor("especialidad");

  error.hidden = true;
  boton.disabled = true;
  boton.textContent = "Enviando…";
  try {
    const resultado = await guardarFormulario(token, formulario);
    if (!resultado.ok) throw new Error(resultado.error || "datos_incompletos");
    await avisarFormularioListo(resultado.token);
    mostrarEstadoCita();
  } catch (e) {
    console.error(e);
    error.textContent = "Revisa que hayas completado todos los campos requeridos.";
    error.hidden = false;
    boton.disabled = false;
    boton.textContent = "Enviar formulario";
  }
}

function escapeHtmlSimple(valor) {
  const div = document.createElement("div");
  div.textContent = valor ?? "";
  return div.innerHTML;
}

mostrarEstadoCita();
