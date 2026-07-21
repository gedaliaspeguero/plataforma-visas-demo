const PASOS_PROCESO = [
  "Eliges tu horario y pagas tu consulta",
  "Un consultor confirma tu cita",
  "Llenas tu formulario de datos",
  "Entras a tu reunión virtual con el consultor"
];

// Si el cliente viene del quiz de evaluación, su resultado llega en la URL
// y viaja pegado a la cita para que la consultora lo vea antes de aceptar.
const parametrosEntrada = new URLSearchParams(window.location.search);

const estado = {
  catalogo: cargarCatalogo(),
  pais: null,
  categoria: null,
  caso: null,
  fecha: null,
  hora: null,
  nombre: (parametrosEntrada.get("nombre") || "").slice(0, 120) || null,
  email: null,
  token: null,
  perfilQuiz: (parametrosEntrada.get("perfil") || "").slice(0, 200) || null
};

const historial = [];

function escapeHtml(valor) {
  const div = document.createElement("div");
  div.textContent = valor ?? "";
  return div.innerHTML;
}

function pantalla(nombre, empujarHistorial = true) {
  if (empujarHistorial) historial.push(nombre);
  const raiz = document.getElementById("pantalla");
  raiz.innerHTML = "";

  const totalPasos = 5;
  const pasoActual = { paises: 1, categorias: 2, casos: 3, resumen: 4, fecha: 5, datos: 5, pago: 5 }[nombre];

  if (pasoActual) {
    const progreso = document.createElement("div");
    progreso.className = "progreso";
    for (let i = 1; i <= totalPasos; i++) {
      const barra = document.createElement("div");
      barra.className = "progreso-paso" + (i <= pasoActual ? " activo" : "");
      progreso.appendChild(barra);
    }
    raiz.appendChild(progreso);
  }

  if (pasoActual && historial.length > 1) {
    const volver = document.createElement("button");
    volver.className = "volver";
    volver.textContent = "‹ Atrás";
    volver.onclick = irAtras;
    raiz.appendChild(volver);
  }

  const contenido = document.createElement("div");
  contenido.className = "contenido";
  contenido.id = "contenido";
  raiz.appendChild(contenido);

  render[nombre]();
}

function irAtras() {
  historial.pop();
  const anterior = historial[historial.length - 1];
  pantalla(anterior, false);
}

function opcionesActivas(lista) {
  return lista.filter((o) => o.visible !== false).sort((a, b) => a.orden - b.orden);
}

function categoriaTieneCasosVisibles(categoria) {
  return opcionesActivas(categoria.casos).length > 0;
}

function paisTieneCategoriasVisibles(pais) {
  return pais.categorias.some(categoriaTieneCasosVisibles);
}

const render = {
  paises() {
    const c = document.getElementById("contenido");
    c.innerHTML = `
      <h1>¿Para qué país es tu trámite?</h1>
      <p class="subtitulo">Elige el país al que quieres viajar o donde tienes tu caso.</p>
      <div class="opciones" id="lista-paises"></div>
    `;
    const lista = document.getElementById("lista-paises");
    opcionesActivas(estado.catalogo).filter(paisTieneCategoriasVisibles).forEach((pais) => {
      const boton = document.createElement("button");
      boton.className = "opcion";
      boton.innerHTML = `<span class="opcion-titulo">${pais.nombre}</span>`;
      boton.onclick = () => {
        estado.pais = pais;
        estado.categoria = null;
        estado.caso = null;
        pantalla("categorias");
      };
      lista.appendChild(boton);
    });
  },

  categorias() {
    const c = document.getElementById("contenido");
    c.innerHTML = `
      <h1>¿Cuál es el motivo de tu consulta?</h1>
      <p class="subtitulo">Elige la opción que más se parece a tu caso.</p>
      <div class="opciones" id="lista-categorias"></div>
    `;
    const lista = document.getElementById("lista-categorias");
    opcionesActivas(estado.pais.categorias).filter(categoriaTieneCasosVisibles).forEach((cat) => {
      const boton = document.createElement("button");
      boton.className = "opcion";
      boton.innerHTML = `
        <span class="opcion-titulo">${cat.nombre}</span>
        <span class="opcion-detalle">${cat.resumen}</span>
      `;
      boton.onclick = () => {
        estado.categoria = cat;
        estado.caso = null;
        pantalla("casos");
      };
      lista.appendChild(boton);
    });
  },

  casos() {
    const c = document.getElementById("contenido");
    c.innerHTML = `
      <h1>¿Cuál es tu situación exacta?</h1>
      <p class="subtitulo">Así sabemos con qué consultor conectarte.</p>
      <div class="opciones" id="lista-casos"></div>
    `;
    const lista = document.getElementById("lista-casos");
    opcionesActivas(estado.categoria.casos).forEach((caso) => {
      const boton = document.createElement("button");
      boton.className = "opcion";
      boton.innerHTML = `
        <span class="opcion-titulo">${caso.nombre}</span>
        <span class="opcion-detalle">${caso.resumen}</span>
      `;
      boton.onclick = () => {
        estado.caso = caso;
        pantalla("resumen");
      };
      lista.appendChild(boton);
    });
  },

  resumen() {
    const c = document.getElementById("contenido");
    const precioConocido = estado.caso.precioUSD !== null && estado.caso.precioUSD !== undefined;
    c.innerHTML = `
      <h1>Así será tu proceso</h1>
      <p class="subtitulo">Revisa que todo esté correcto antes de agendar.</p>
      <div class="resumen-caja">
        <div class="resumen-fila">
          <span class="resumen-etiqueta">País</span>
          <span class="resumen-valor">${estado.pais.nombre}</span>
        </div>
        <div class="resumen-fila">
          <span class="resumen-etiqueta">Motivo</span>
          <span class="resumen-valor">${estado.categoria.nombre}</span>
        </div>
        <div class="resumen-fila">
          <span class="resumen-etiqueta">Tu caso</span>
          <span class="resumen-valor">${estado.caso.nombre}</span>
        </div>
        <div class="precio-grande">
          <div class="precio-numero">${precioConocido ? formatearPrecio(estado.caso.precioUSD) : "Por confirmar"}</div>
          <div class="precio-nota">${precioConocido ? "Precio de tu consulta" : "Un consultor te confirmará el precio exacto"}</div>
        </div>
      </div>
      <p class="subtitulo" style="margin-bottom:8px; font-weight:600; color:var(--ink);">Estos son los pasos:</p>
      <ol class="pasos-lista">
        ${PASOS_PROCESO.map((p) => `<li>${p}</li>`).join("")}
      </ol>
      <button class="boton-primario" id="btn-continuar">Continuar con mi cita</button>
    `;
    document.getElementById("btn-continuar").onclick = () => pantalla("fecha");
  },

  async fecha() {
    const c = document.getElementById("contenido");

    if (!SUPABASE_CONFIGURADO) {
      c.innerHTML = `
        <h1>Falta conectar los horarios</h1>
        <p class="subtitulo">Esta parte todavía no tiene el proyecto de Supabase configurado en <code>config.js</code>. Avísale a Gedalia.</p>
      `;
      return;
    }

    c.innerHTML = `
      <h1>¿Qué día te queda bien?</h1>
      <p class="subtitulo">Estos son los horarios que tenemos libres.</p>
      <div id="lista-fechas"><p class="subtitulo">Buscando horarios disponibles…</p></div>
    `;

    const lista = document.getElementById("lista-fechas");
    try {
      const disponibilidad = await obtenerDisponibilidad();
      if (!disponibilidad.dias || disponibilidad.dias.length === 0) {
        lista.innerHTML = `<p class="subtitulo">No hay horarios libres por ahora. Escríbenos y te avisamos apenas se abra un espacio.</p>`;
        return;
      }
      lista.innerHTML = "";
      disponibilidad.dias.forEach((dia) => {
        const bloque = document.createElement("div");
        bloque.className = "resumen-caja";
        bloque.style.marginBottom = "12px";
        bloque.innerHTML = `
          <div class="admin-categoria-titulo" style="margin-bottom:10px;">${nombreDelDia(dia.fecha)}</div>
          <div class="opciones" style="flex-direction:row; flex-wrap:wrap; gap:8px;"></div>
        `;
        const contenedorHoras = bloque.querySelector(".opciones");
        dia.horas.forEach((hora) => {
          const boton = document.createElement("button");
          boton.className = "opcion";
          boton.style.padding = "10px 14px";
          boton.innerHTML = `<span class="opcion-titulo">${hora}</span>`;
          boton.onclick = () => {
            estado.fecha = dia.fecha;
            estado.hora = hora;
            pantalla("datos");
          };
          contenedorHoras.appendChild(boton);
        });
        lista.appendChild(bloque);
      });
    } catch (e) {
      console.error(e);
      lista.innerHTML = `<p class="subtitulo">No pudimos cargar los horarios. Intenta de nuevo en un momento.</p>`;
    }
  },

  datos() {
    const c = document.getElementById("contenido");
    c.innerHTML = `
      <h1>¿A nombre de quién es la cita?</h1>
      <p class="subtitulo">Aquí te llegará la confirmación y todos los avisos.</p>
      <div class="opciones" style="margin-bottom:20px;">
        <input id="input-nombre" type="text" placeholder="Nombre completo"
          style="padding:16px 18px; border:1.5px solid var(--gris-claro); border-radius:var(--radio); font-size:16px; font-family:inherit;" />
        <input id="input-email" type="email" placeholder="Correo electrónico"
          style="padding:16px 18px; border:1.5px solid var(--gris-claro); border-radius:var(--radio); font-size:16px; font-family:inherit;" />
      </div>
      <p class="subtitulo" id="error-datos" style="color:var(--acento-oscuro); display:none;"></p>
      <button class="boton-primario" id="btn-continuar">Continuar</button>
    `;
    // Los valores se asignan por propiedad (no por HTML) porque el nombre
    // puede venir de la URL (?nombre=) y no debe interpretarse como markup.
    document.getElementById("input-nombre").value = estado.nombre ?? "";
    document.getElementById("input-email").value = estado.email ?? "";
    document.getElementById("btn-continuar").onclick = () => {
      const nombre = document.getElementById("input-nombre").value.trim();
      const email = document.getElementById("input-email").value.trim();
      const error = document.getElementById("error-datos");
      const correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!nombre || !correoValido) {
        error.textContent = !nombre ? "Escribe tu nombre completo." : "Escribe un correo válido.";
        error.style.display = "block";
        return;
      }
      estado.nombre = nombre;
      estado.email = email;
      pantalla("pago");
    };
  },

  pago() {
    const c = document.getElementById("contenido");
    const precioConocido = estado.caso.precioUSD !== null && estado.caso.precioUSD !== undefined;
    c.innerHTML = `
      <h1>Confirma y paga tu consulta</h1>
      <div class="resumen-caja">
        <div class="resumen-fila">
          <span class="resumen-etiqueta">Cita</span>
          <span class="resumen-valor">${nombreDelDia(estado.fecha)} · ${estado.hora}</span>
        </div>
        <div class="resumen-fila">
          <span class="resumen-etiqueta">Nombre</span>
          <span class="resumen-valor">${escapeHtml(estado.nombre)}</span>
        </div>
        <div class="resumen-fila">
          <span class="resumen-etiqueta">Correo</span>
          <span class="resumen-valor">${escapeHtml(estado.email)}</span>
        </div>
        <div class="precio-grande">
          <div class="precio-numero">${precioConocido ? formatearPrecio(estado.caso.precioUSD) : "Por confirmar"}</div>
          <div class="precio-nota">Si no confirmamos tu cita en 24 horas, te devolvemos el 100%</div>
        </div>
      </div>
      <p class="aviso-precio">Pago de prueba — todavía no se cobra dinero real</p>
      <p class="subtitulo" id="error-pago" style="color:var(--coral-dark); display:none; margin-top:16px;"></p>
      <button class="boton-primario" id="btn-pagar" style="margin-top:20px;">Pagar y confirmar mi cita</button>
    `;
    document.getElementById("btn-pagar").onclick = async () => {
      const boton = document.getElementById("btn-pagar");
      const error = document.getElementById("error-pago");
      error.style.display = "none";
      boton.disabled = true;
      boton.textContent = "Procesando…";
      try {
        const resultado = await crearCita({
          nombre: estado.nombre,
          email: estado.email,
          paisId: estado.pais.id,
          paisNombre: estado.pais.nombre,
          categoriaId: estado.categoria.id,
          categoriaNombre: estado.categoria.nombre,
          casoId: estado.caso.id,
          casoNombre: estado.caso.nombre,
          precio: estado.caso.precioUSD,
          fecha: estado.fecha,
          hora: estado.hora + ":00",
          perfil: estado.perfilQuiz,
        });
        if (resultado.error === "horario_ocupado") {
          error.textContent = "Justo se ocupó ese horario. Elige otro, por favor.";
          error.style.display = "block";
          boton.disabled = false;
          boton.textContent = "Pagar y confirmar mi cita";
          return;
        }
        if (!resultado.ok) {
          throw new Error(resultado.error || "error_desconocido");
        }
        estado.token = resultado.token;
        estado.correoEnviado = await notificarCita(resultado.token);
        if (!estado.correoEnviado) {
          // Un solo reintento — la cita ya está paga y guardada, esto solo
          // es para no dejar al cliente sin su correo por un fallo pasajero.
          estado.correoEnviado = await notificarCita(resultado.token);
        }
        pantalla("confirmacion");
      } catch (e) {
        console.error(e);
        error.textContent = "No pudimos procesar tu pago. Intenta de nuevo.";
        error.style.display = "block";
        boton.disabled = false;
        boton.textContent = "Pagar y confirmar mi cita";
      }
    };
  },

  confirmacion() {
    const c = document.getElementById("contenido");
    c.innerHTML = `
      <h1>¡Listo, ${escapeHtml(estado.nombre)}!</h1>
      <p class="subtitulo">Tu cita para <strong>${escapeHtml(estado.caso.nombre)}</strong> el ${nombreDelDia(estado.fecha)} a las ${estado.hora} quedó registrada.</p>
      <div class="resumen-caja">
        <div class="resumen-fila">
          <span class="resumen-etiqueta">Qué sigue ahora</span>
        </div>
      </div>
      <ol class="pasos-lista">
        <li>Un consultor va a confirmar tu cita muy pronto</li>
        <li>Te llegará un correo a <strong>${escapeHtml(estado.email)}</strong> con el link para llenar tu formulario</li>
        <li>Ese mismo correo tendrá el acceso a tu reunión virtual</li>
      </ol>
      <p class="subtitulo">Si no te confirmamos en 24 horas, te devolvemos el 100% de tu pago.</p>
      ${estado.correoEnviado === false ? `<p class="aviso-precio">No pudimos confirmar el envío del correo. Tu cita quedó guardada igual — si no te llega en unos minutos, escríbenos.</p>` : ""}
    `;
  }
};

pantalla("paises");
