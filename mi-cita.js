const MENSAJES_ESTADO = {
  pagada: {
    titulo: "Estamos confirmando tu cita",
    detalle: "Un asesor va a confirmar tu cita muy pronto. Si tienes alguna duda, escríbenos por WhatsApp.",
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
    titulo: "No pudimos confirmar esta cita",
    detalle: "Escríbenos por WhatsApp y buscamos otro horario para ti.",
  },
  vencida: {
    titulo: "Esta cita no se llegó a confirmar",
    detalle: "Escríbenos por WhatsApp y buscamos otro horario para ti.",
  },
};

// Lo que cambia cuando la cita se acordó por WhatsApp: no hubo reserva ni
// pago en la web, así que no aplican los textos de espera ni de reembolso.
function mensajeDeEstado(cita) {
  if (cita.cancelada) {
    return { titulo: "Esta cita fue cancelada", detalle: "Si quieres reprogramarla o tienes alguna duda, escríbenos por WhatsApp." };
  }
  const acordada = cita.origen === "whatsapp" || cita.por_solicitud === true;
  if (acordada && ["aceptada", "formulario_listo"].includes(cita.estado)) {
    return cita.modalidad === "whatsapp"
      ? { titulo: "¡Tu cita está confirmada!", detalle: "Tu asesor te llamará por WhatsApp a la hora de tu cita." }
      : { titulo: "¡Tu cita está confirmada!", detalle: "Estamos preparando tu videollamada. Vuelve a abrir este enlace cerca de la hora de tu cita." };
  }
  if (acordada && cita.estado === "reunion_programada") {
    if (citaYaTermino(cita)) {
      return { titulo: "La hora de tu cita ya pasó", detalle: "Si no pudiste conectarte, escríbenos por WhatsApp para reprogramarla." };
    }
    return { titulo: "¡Tu cita está confirmada!", detalle: "Entra aquí mismo a tu videollamada. El botón funciona desde una hora antes de tu cita." };
  }
  return MENSAJES_ESTADO[cita.estado] ?? { titulo: "Estado desconocido", detalle: "" };
}

// ---------- solicitud hecha en la web: esperando el pago ----------

function dineroCliente(monto, moneda) {
  return `${moneda === "USD" ? "US$" : "RD$"}${Number(monto).toLocaleString("es-DO")}`;
}

// "hoy a las 5:30 PM" / "mañana a las 9:28 AM" / "el lunes 30 a las 11:30 AM"
function momentoCercano(iso) {
  const fecha = new Date(iso);
  const dia = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santo_Domingo" }).format(d);
  const hora = new Intl.DateTimeFormat("es-DO", { timeZone: "America/Santo_Domingo", hour: "numeric", minute: "2-digit", hour12: true })
    .format(fecha).replace(/\s*a\.\s*m\./i, " AM").replace(/\s*p\.\s*m\./i, " PM");
  const manana = new Date(Date.now() + 24 * 60 * 60 * 1000);
  if (dia(fecha) === dia(new Date())) return `hoy a las ${hora}`;
  if (dia(fecha) === dia(manana)) return `mañana a las ${hora}`;
  return `el ${fechaLargaCliente(dia(fecha))} a las ${hora}`;
}

function enlaceWhatsapp(texto) {
  return `https://wa.me/${WHATSAPP_NEGOCIO}?text=${encodeURIComponent(texto)}`;
}

function tarjetaDeCuenta(cuenta) {
  const fila = (etiqueta, valor, copiar) => valor ? `
    <div class="resumen-fila">
      <span class="resumen-etiqueta">${etiqueta}</span>
      <span class="resumen-valor">${escapeHtmlSimple(valor)}${copiar ? ` <button class="pago-copiar" data-copiar="${escapeHtmlSimple(valor).replace(/"/g, "&quot;")}">Copiar</button>` : ""}</span>
    </div>` : "";
  return `
    <div class="resumen-caja pago-cuenta">
      <div class="pago-cuenta-titulo">${cuenta.moneda === "USD" ? "Para pagar en dólares" : "Para pagar en pesos"}</div>
      ${fila("Banco", cuenta.banco)}
      ${fila("Tipo de cuenta", cuenta.tipo)}
      ${fila("Número", cuenta.numero, true)}
      ${fila("A nombre de", cuenta.titular)}
      ${cuenta.cedula ? `
      <div class="resumen-fila pago-cedula">
        <span class="resumen-etiqueta">Cédula del titular</span>
        <span class="resumen-valor">
          <button class="pago-copiar" data-mostrar-cedula>Mostrar cédula</button>
          <span data-cedula hidden>${escapeHtmlSimple(cuenta.cedula)} <button class="pago-copiar" data-copiar="${escapeHtmlSimple(cuenta.cedula).replace(/"/g, "&quot;")}">Copiar</button></span>
        </span>
      </div>
      <p class="pago-cedula-nota">Solo te la pide tu banco si transfieres desde otro banco.</p>` : ""}
    </div>`;
}

// Devuelve true si se encargó de pintar la página.
function mostrarSolicitud(c, cita) {
  if (!cita.por_solicitud || !["pagada", "vencida", "rechazada"].includes(cita.estado)) return false;
  const cuando = `${fechaLargaCliente(cita.fecha)} a las ${formatearHora12(cita.hora)}`;
  const otraVez = `<a class="boton-primario" href="agendar.html">Elegir otro horario</a>`;
  const ayuda = `<a class="boton-secundario" href="${enlaceWhatsapp(`Hola, soy ${cita.cliente_nombre}. Pedí una cita para el ${cuando} y necesito ayuda.`)}" target="_blank" rel="noopener">Escribirnos por WhatsApp</a>`;

  if (cita.estado === "vencida") {
    c.innerHTML = `
      <h1>Se venció el tiempo para confirmar</h1>
      <p class="subtitulo">No recibimos tu pago a tiempo y el horario del ${cuando} quedó libre otra vez. Si ya pagaste, escríbenos y lo resolvemos.</p>
      ${otraVez}${ayuda}`;
    return true;
  }
  if (cita.estado === "rechazada") {
    c.innerHTML = `
      <h1>No pudimos confirmar tu cita</h1>
      <p class="subtitulo">${escapeHtmlSimple(cita.motivo_rechazo || "No se recibió el pago")}. El horario del ${cuando} quedó libre. Si crees que es un error, escríbenos.</p>
      ${otraVez}${ayuda}`;
    return true;
  }

  const esProceso = cita.tipo_servicio === "proceso";
  const monto = cita.pago_ahora != null ? dineroCliente(cita.pago_ahora, cita.pago_moneda) : null;
  // Si ya se sabe en qué moneda paga, solo se le enseña esa cuenta: ver una
  // cuenta en dólares al lado de un monto en pesos confunde.
  const todas = cita.cuentas || [];
  const deSuMoneda = todas.filter((cuenta) => cuenta.moneda === cita.pago_moneda);
  const cuentas = monto && deSuMoneda.length ? deSuMoneda : todas;
  const comprobante = `Hola, soy ${cita.cliente_nombre}. Pedí una cita para el ${cuando} (${cita.caso_nombre}). Aquí va mi comprobante de pago.`;
  const sinMonto = `Hola, soy ${cita.cliente_nombre}. Pedí una cita para el ${cuando} (${cita.caso_nombre}). ¿Cuánto debo transferir?`;

  c.innerHTML = `
    <h1>Tu horario está apartado</h1>
    <p class="subtitulo">Te lo guardamos hasta <strong>${momentoCercano(cita.vence_en)}</strong>. Tu cita queda confirmada cuando verifiquemos tu pago.</p>
    <div class="resumen-caja">
      ${filaResumen("Nombre", cita.cliente_nombre)}
      ${filaResumen("Trámite", cita.caso_nombre)}
      ${filaResumen("Día", fechaLargaCliente(cita.fecha))}
      ${filaResumen("Hora", `${formatearHora12(cita.hora)} (hora de República Dominicana)`)}
      ${filaResumen("Duración", `${textoDuracionCita(cita)}, por videollamada`)}
      <div class="precio-grande">
        <div class="precio-numero${monto ? "" : " precio-texto"}">${monto ?? "El precio dependerá de tu situación"}</div>
        <div class="precio-nota">${monto
          ? (esProceso ? `Es el 50% para iniciar. El total es ${dineroCliente(cita.pago_total, cita.pago_moneda)}.` : "Es lo que debes transferir")
          : "Escríbenos por WhatsApp y te decimos el monto"}</div>
      </div>
    </div>
    ${esProceso ? "" : `<p class="pago-nota">Si después haces el proceso completo con nosotros, lo que pagues por esta consulta se te descuenta del total.</p>`}
    <h2 class="pago-titulo">1. Haz la transferencia</h2>
    ${cuentas.length ? cuentas.map(tarjetaDeCuenta).join("") : `<p class="subtitulo">Te enviamos los datos de la cuenta por WhatsApp.</p>`}
    <h2 class="pago-titulo">2. Envíanos el comprobante</h2>
    <a class="boton-primario" href="${enlaceWhatsapp(monto ? comprobante : sinMonto)}" target="_blank" rel="noopener">${monto ? "Enviar comprobante por WhatsApp" : "Preguntar el monto por WhatsApp"}</a>
    <p class="subtitulo" style="margin-top:14px;">Guarda este enlace: aquí mismo verás tu cita confirmada y entrarás a la videollamada. Los pagos no tienen devolución, pero puedes reprogramar tu cita hasta 3 meses después.</p>
  `;
  // La cédula no sale a la vista: aparece solo si la persona la pide.
  c.querySelectorAll("[data-mostrar-cedula]").forEach((boton) => {
    boton.onclick = () => {
      boton.hidden = true;
      boton.parentElement.querySelector("[data-cedula]").hidden = false;
    };
  });
  c.querySelectorAll("[data-copiar]").forEach((boton) => {
    boton.onclick = async () => {
      try {
        await navigator.clipboard.writeText(boton.dataset.copiar);
        boton.textContent = "Copiado ✓";
      } catch (e) {
        boton.textContent = "Cópialo a mano";
      }
      setTimeout(() => { boton.textContent = "Copiar"; }, 2000);
    };
  });
  return true;
}

// La videollamada dura lo que dura la cita y se cierra sola al terminar.
function duracionDeCita(cita) {
  return Number(cita.duracion_min) === 30 ? 30 : 60;
}

function textoDuracionCita(cita) {
  return duracionDeCita(cita) === 30 ? "30 minutos" : "1 hora";
}

// Santo Domingo no cambia de hora: siempre va 4 horas detrás de UTC.
function citaYaTermino(cita) {
  const inicio = new Date(`${cita.fecha}T${String(cita.hora).slice(0, 5)}:00-04:00`).getTime();
  return Date.now() >= inicio + duracionDeCita(cita) * 60 * 1000;
}

function fechaLargaCliente(fechaISO) {
  const dias = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const [anio, mes, dia] = String(fechaISO).split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia, 12));
  return `${dias[fecha.getUTCDay()]} ${dia} de ${meses[mes - 1]}`;
}

function filaResumen(etiqueta, valor) {
  return `<div class="resumen-fila"><span class="resumen-etiqueta">${etiqueta}</span><span class="resumen-valor">${escapeHtmlSimple(valor)}</span></div>`;
}

async function mostrarEstadoCita() {
  const c = document.getElementById("contenido");
  const token = new URLSearchParams(window.location.search).get("token");

  if (!token) {
    c.innerHTML = `<h1>Falta el código de tu cita</h1><p class="subtitulo">Abre el enlace completo que te enviamos por WhatsApp.</p>`;
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
    if (mostrarSolicitud(c, resultado)) return;
    const info = mensajeDeEstado(resultado);
    // Una cita pedida en la web y ya aceptada se ve igual que una acordada
    // por WhatsApp: mismas reglas, misma videollamada.
    const porWhatsapp = resultado.origen === "whatsapp" || resultado.por_solicitud === true;
    const precio = resultado.precio_usd != null ? formatearPrecio(resultado.precio_usd) : "Por confirmar";
    // El servidor dice si hay formulario que llenar; el respaldo cubre una
    // base que todavía no tenga ese dato.
    const formularioDisponible = resultado.formulario_disponible
      ?? (resultado.estado === "aceptada" || resultado.estado === "formulario_listo");
    const formularioEnviado = resultado.formulario_enviado ?? resultado.estado === "formulario_listo";
    const puedeEntrar = resultado.estado === "reunion_programada" && !resultado.cancelada && !citaYaTermino(resultado);
    const esVideo = resultado.modalidad !== "whatsapp";
    // Reglas que las asesoras quieren que el cliente tenga a la vista.
    const reglas = porWhatsapp && !resultado.cancelada && resultado.estado !== "completada"
      ? `<p class="subtitulo" style="margin-top:14px;">${esVideo ? "La videollamada se cierra sola cuando termina el tiempo de tu cita: conéctate puntual. " : ""}Puedes reprogramar tu cita hasta 3 meses después de la fecha original. Los pagos no tienen devolución.</p>`
      : "";
    const contacto = typeof WHATSAPP_NEGOCIO !== "undefined" && WHATSAPP_NEGOCIO
      ? `<p class="subtitulo" style="margin-top:22px;">¿Necesitas cambiar tu cita o tienes una duda? <a href="https://wa.me/${WHATSAPP_NEGOCIO}" target="_blank" rel="noopener">Escríbenos por WhatsApp</a>.</p>`
      : "";
    c.innerHTML = `
      <h1>${info.titulo}</h1>
      <p class="subtitulo">${info.detalle}</p>
      <div class="resumen-caja">
        ${filaResumen("Nombre", resultado.cliente_nombre)}
        ${filaResumen("Servicio", nombreServicio(resultado.tipo_servicio))}
        ${filaResumen("Trámite", resultado.caso_nombre)}
        ${filaResumen("Día", fechaLargaCliente(resultado.fecha))}
        ${filaResumen("Hora", `${formatearHora12(resultado.hora)} (hora de República Dominicana)`)}
        ${porWhatsapp ? filaResumen("Duración", textoDuracionCita(resultado)) : ""}
        ${["aceptada", "formulario_listo", "reunion_programada"].includes(resultado.estado) && !resultado.cancelada ? filaResumen("Con", "Una asesora") : ""}
        ${porWhatsapp ? filaResumen("Modalidad", resultado.modalidad === "whatsapp" ? "Llamada de WhatsApp" : "Videollamada") : filaResumen("Precio", precio)}
      </div>
      ${puedeEntrar ? `<button class="boton-primario" id="btn-reunion">Entrar a mi videollamada</button>` : ""}
      ${formularioDisponible ? `<button class="${puedeEntrar ? "boton-secundario" : "boton-primario"}" id="btn-formulario">${formularioEnviado ? "Ver mi formulario" : "Llenar mi formulario"}</button>` : ""}
      ${puedeEntrar && resultado.invitado_token ? `
        <button class="boton-secundario" id="btn-invitar">Invitar a otra persona</button>
        <div id="caja-invitado" style="display:none; margin-top:16px;">
          <p class="subtitulo">Comparte este enlace con la persona que quieres que entre contigo. Solo sirve para entrar a la reunión: no muestra tus datos ni tu formulario.</p>
          <input id="enlace-invitado" type="text" readonly
            style="width:100%; padding:14px 16px; border:1.5px solid var(--border); border-radius:8px; font-size:14px; font-family:inherit;" />
          <button class="boton-secundario" id="btn-copiar" style="margin-top:10px;">Copiar el enlace</button>
        </div>` : ""}
      ${reglas}
      ${contacto}
    `;
    const botonFormulario = document.getElementById("btn-formulario");
    if (botonFormulario) botonFormulario.onclick = () => mostrarFormulario(token);
    const botonReunion = document.getElementById("btn-reunion");
    if (botonReunion) botonReunion.onclick = () => abrirReunionCliente(token);
    prepararInvitacion(resultado.invitado_token);
  } catch (e) {
    console.error(e);
    c.innerHTML = `<h1>No pudimos cargar tu cita</h1><p class="subtitulo">Intenta de nuevo en un momento.</p>`;
  }
}

function prepararInvitacion(invitadoToken) {
  const boton = document.getElementById("btn-invitar");
  if (!boton || !invitadoToken) return;
  const caja = document.getElementById("caja-invitado");
  const campo = document.getElementById("enlace-invitado");
  // Por propiedad, no por HTML: el enlace lleva un token y no debe
  // interpretarse como markup.
  campo.value = enlaceDeInvitado(invitadoToken);

  boton.onclick = () => {
    caja.style.display = "block";
    boton.style.display = "none";
    campo.focus();
    campo.select();
  };

  document.getElementById("btn-copiar").onclick = async () => {
    const copiar = document.getElementById("btn-copiar");
    campo.select();
    try {
      await navigator.clipboard.writeText(campo.value);
      copiar.textContent = "¡Copiado!";
    } catch (e) {
      // Sin permiso de portapapeles (o navegador viejo): el enlace queda
      // seleccionado. En celular no existe Ctrl+C, así que se explica el
      // gesto táctil, que es de donde viene casi todo el tráfico.
      copiar.textContent = "Mantén pulsado el enlace y elige Copiar";
    }
    setTimeout(() => { copiar.textContent = "Copiar el enlace"; }, 2500);
  };
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
    await abrirReunionDiaria(document.getElementById("reunion-diaria"), datos, (motivo) => {
      if (motivo === "tiempo") mostrarFinDeCita();
      else mostrarEstadoCita();
    });
  } catch (e) {
    console.error(e);
    if (String(e.message) === "reunion_finalizada") { mostrarFinDeCita(); return; }
    c.innerHTML = `<h1>La reunión todavía no está disponible</h1><p class="subtitulo">Intenta entrar de nuevo cerca de la hora de tu cita.</p><button class="boton-secundario" id="btn-volver-estado">Volver</button>`;
    document.getElementById("btn-volver-estado").onclick = mostrarEstadoCita;
  }
}

// Cuando la llamada se corta porque se cumplió la hora.
function mostrarFinDeCita() {
  const c = document.getElementById("contenido");
  const contacto = typeof WHATSAPP_NEGOCIO !== "undefined" && WHATSAPP_NEGOCIO
    ? ` <a href="https://wa.me/${WHATSAPP_NEGOCIO}" target="_blank" rel="noopener">Escríbenos por WhatsApp</a> si te quedó alguna duda.`
    : "";
  c.innerHTML = `<h1>Se terminó el tiempo de tu cita</h1><p class="subtitulo">La videollamada se cerró porque llegó la hora de fin. Gracias por conectarte.${contacto}</p><button class="boton-secundario" id="btn-volver-estado">Ver mi cita</button>`;
  document.getElementById("btn-volver-estado").onclick = mostrarEstadoCita;
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
