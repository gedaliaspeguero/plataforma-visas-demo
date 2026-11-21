// Entrada de invitado a la reunión. A propósito no pide ni muestra nada de
// la cita: quien tiene este enlace solo puede entrar a la videollamada.
const tokenInvitado = new URLSearchParams(window.location.search).get("invitado");

function pantallaInicial() {
  const c = document.getElementById("contenido");
  if (!tokenInvitado) {
    c.innerHTML = `
      <h1>Enlace incompleto</h1>
      <p class="subtitulo">Pídele a quien te invitó que te vuelva a enviar el enlace completo.</p>
    `;
    return;
  }
  c.innerHTML = `
    <h1>Te invitaron a una reunión</h1>
    <p class="subtitulo">Puedes entrar desde una hora antes de la cita. Te vamos a pedir permiso para usar tu cámara y tu micrófono.</p>
    <button class="boton-primario" id="btn-entrar">Entrar a la reunión</button>
  `;
  document.getElementById("btn-entrar").onclick = entrar;
}

async function entrar() {
  const c = document.getElementById("contenido");
  c.innerHTML = `<p class="subtitulo">Conectando…</p>`;
  try {
    const datos = await entrarReunionInvitado(tokenInvitado);
    c.innerHTML = `
      <div class="reunion-encabezado">
        <button class="volver" id="btn-salir">Salir de la reunión</button>
        <h1>La reunión</h1>
      </div>
      <div class="reunion-diaria" id="reunion-diaria"></div>
    `;
    document.getElementById("btn-salir").onclick = async () => {
      await cerrarReunionDiaria();
      pantallaInicial();
    };
    await abrirReunionDiaria(document.getElementById("reunion-diaria"), datos, pantallaInicial);
  } catch (e) {
    console.error(e);
    mostrarError(String(e.message));
  }
}

// Cada fallo necesita su propio mensaje: decirle "intenta más cerca de la
// hora" a alguien cuya reunión YA terminó lo deja esperando algo que nunca
// va a pasar.
const MENSAJES_ERROR = {
  reunion_finalizada: {
    titulo: "Esta reunión ya terminó",
    detalle: "El enlace dejó de servir. Si necesitas otra reunión, escríbele a la persona que te invitó.",
    reintentar: false
  },
  invitado_ya_conectado: {
    titulo: "Ya hay alguien usando esta invitación",
    detalle: "Solo puede entrar una persona invitada a la vez. Si eras tú y se te cerró, espera un momento y vuelve a intentar.",
    reintentar: true
  },
  no_pudimos_preparar_sala: {
    titulo: "No pudimos abrir la reunión",
    detalle: "Fue un problema momentáneo de nuestro lado. Vuelve a intentar en unos segundos.",
    reintentar: true
  },
  reunion_no_disponible: {
    titulo: "La reunión todavía no está disponible",
    detalle: "Se abre una hora antes de la cita. Si ya pasó esa hora, pídele el enlace de nuevo a quien te invitó.",
    reintentar: true
  }
};

function mostrarError(codigo) {
  const c = document.getElementById("contenido");
  const info = MENSAJES_ERROR[codigo] ?? {
    titulo: "No pudimos conectarte",
    detalle: "Revisa tu conexión a internet y vuelve a intentar.",
    reintentar: true
  };
  c.innerHTML = `
    <h1>${info.titulo}</h1>
    <p class="subtitulo">${info.detalle}</p>
    ${info.reintentar ? `<button class="boton-primario" id="btn-reintentar">Intentar de nuevo</button>` : ""}
  `;
  const reintentar = document.getElementById("btn-reintentar");
  if (reintentar) reintentar.onclick = entrar;
}

pantallaInicial();
