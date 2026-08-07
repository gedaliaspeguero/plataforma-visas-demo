// Si el cliente viene del quiz de evaluación, su resultado llega en la URL
// y viaja pegado a la cita para que la consultora lo vea antes de aceptar.
const parametrosEntrada = new URLSearchParams(window.location.search);

// El servicio llega elegido desde la landing (?servicio=). Si alguien entra
// directo a agendar.html sin elegirlo, se le pregunta como primera pantalla:
// nunca se asume por él, porque cada servicio tiene su propio precio.
const servicioDeLaUrl = servicioPorId(parametrosEntrada.get("servicio"));

const estado = {
  catalogo: cargarCatalogo(),
  servicio: servicioDeLaUrl,
  pais: null,
  categoria: null,
  caso: null,
  // En qué punto va su proceso, y los datos que pide esa etapa. Viajan
  // pegados a la cita para que la asesora llegue con el caso ya buscado.
  etapa: null,
  datosCaso: {},
  grupoActual: 0,
  fecha: null,
  hora: null,
  nombre: (parametrosEntrada.get("nombre") || "").slice(0, 120) || null,
  email: null,
  token: null,
  perfilQuiz: (parametrosEntrada.get("perfil") || "").slice(0, 200) || null
};

// Cuando hay que preguntar el servicio, el wizard tiene un paso más.
const PREGUNTA_SERVICIO = servicioDeLaUrl === null;

function precioActual() {
  return precioDelCaso(estado.caso, estado.servicio.id);
}

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

  // "etapa" y sus pantallas de datos cuentan como un solo paso: son la misma
  // pregunta ("cuál es tu caso") partida en varias pantallas, y si el total
  // cambiara a mitad del camino la barra daría saltos raros.
  const base = {
    paises: 1, categorias: 2, casos: 3, etapa: 4, "caso-datos": 4,
    resumen: 5, fecha: 6, datos: 6, pago: 6
  };
  const totalPasos = PREGUNTA_SERVICIO ? 7 : 6;
  const pasoActual = nombre === "servicio"
    ? 1
    : base[nombre] && base[nombre] + (PREGUNTA_SERVICIO ? 1 : 0);

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
  // Todas las pantallas de datos del caso se llaman igual, así que cuántas
  // quedan en el historial es lo que dice en cuál estamos al retroceder.
  if (anterior === "caso-datos") {
    estado.grupoActual = historial.filter((p) => p === "caso-datos").length - 1;
  }
  pantalla(anterior, false);
}

// ---------- Campos de los datos del caso ----------

const ESTILO_CAMPO =
  "padding:16px 18px; border:1.5px solid var(--gris-claro); border-radius:var(--radio);" +
  " font-size:16px; font-family:inherit; width:100%;";

function dibujarCampo(campo) {
  const caja = document.createElement("div");
  caja.style.display = "flex";
  caja.style.flexDirection = "column";
  caja.style.gap = "8px";

  const etiqueta = document.createElement("label");
  etiqueta.className = "opcion-detalle";
  etiqueta.style.fontWeight = "600";
  etiqueta.textContent = campo.etiqueta;
  etiqueta.setAttribute("for", "campo-" + campo.id);
  caja.appendChild(etiqueta);

  if (campo.tipo === "opcion") {
    const grupo = document.createElement("div");
    grupo.className = "opciones";
    grupo.id = "campo-" + campo.id;
    grupo.setAttribute("role", "radiogroup");
    grupo.setAttribute("aria-label", campo.etiqueta);
    campo.opciones.forEach((op) => {
      const boton = document.createElement("button");
      boton.type = "button";
      boton.className = "opcion";
      boton.dataset.valor = op.valor;
      boton.setAttribute("role", "radio");
      const elegido = estado.datosCaso[campo.id] === op.valor;
      boton.setAttribute("aria-checked", elegido ? "true" : "false");
      if (elegido) boton.classList.add("elegida");
      boton.innerHTML = `<span class="opcion-titulo">${escapeHtml(op.texto)}</span>`;
      boton.onclick = () => {
        grupo.querySelectorAll(".opcion").forEach((b) => {
          b.classList.remove("elegida");
          b.setAttribute("aria-checked", "false");
        });
        boton.classList.add("elegida");
        boton.setAttribute("aria-checked", "true");
        estado.datosCaso[campo.id] = op.valor;
      };
      grupo.appendChild(boton);
    });
    caja.appendChild(grupo);
  } else {
    const entrada = document.createElement(campo.tipo === "parrafo" ? "textarea" : "input");
    entrada.id = "campo-" + campo.id;
    entrada.style.cssText = ESTILO_CAMPO;
    if (campo.tipo === "parrafo") {
      entrada.rows = 4;
    } else if (campo.tipo === "fecha") {
      entrada.type = "date";
      entrada.max = hoyEnSantoDomingo();
    } else {
      entrada.type = "text";
      if (campo.tipo === "numero-caso") {
        entrada.autocapitalize = "characters";
        entrada.spellcheck = false;
        entrada.placeholder = ejemploNumeroCaso(campo.acepta[0]);
      }
    }
    // Se asigna por propiedad, nunca por HTML: el valor puede venir de algo
    // que el usuario escribió y no debe interpretarse como markup.
    entrada.value = estado.datosCaso[campo.id] ?? "";
    caja.appendChild(entrada);
  }

  if (campo.ayuda) {
    const ayuda = document.createElement("p");
    ayuda.className = "opcion-detalle";
    ayuda.style.margin = "0";
    ayuda.textContent = campo.ayuda;
    caja.appendChild(ayuda);
  }
  return caja;
}

function leerCampo(campo) {
  if (campo.tipo === "opcion") {
    const valor = estado.datosCaso[campo.id];
    if (!valor) return { ok: false, mensaje: "Elige una de las dos opciones." };
    return { ok: true, valor };
  }

  const entrada = document.getElementById("campo-" + campo.id);
  const valor = (entrada.value || "").trim();

  if (campo.tipo === "fecha") {
    if (!valor) return { ok: false, mensaje: "Falta la fecha de nacimiento." };
    if (valor > hoyEnSantoDomingo()) {
      return { ok: false, mensaje: "Esa fecha de nacimiento está en el futuro." };
    }
    return { ok: true, valor };
  }

  if (campo.tipo === "numero-caso") {
    const revisado = validarNumeroCaso(valor, campo.acepta);
    if (!revisado.ok) {
      const formatos = campo.acepta.map(descripcionFormato).join(", o ");
      return {
        ok: false,
        mensaje: revisado.motivo === "vacio"
          ? "Falta el número. Debe empezar con " + formatos + "."
          : "Ese número no cuadra. Debe empezar con " + formatos + "."
      };
    }
    return { ok: true, valor: revisado.valor };
  }

  if (campo.tipo === "parrafo") {
    if (valor.length < 10) {
      return { ok: false, mensaje: "Cuéntanos un poco más, con unas pocas palabras basta." };
    }
    return { ok: true, valor: valor.slice(0, 1000) };
  }

  if (valor.length < 2) return { ok: false, mensaje: "Falta completar este dato." };
  return { ok: true, valor: valor.slice(0, 200) };
}

// Solo los números de caso se repiten en el resumen: son lo que la persona
// más fácil copia mal, y lo único que no puede corregir después por su cuenta.
function filasDatosCaso() {
  if (!estado.etapa) return "";
  return estado.etapa.grupos
    .flatMap((g) => g.campos)
    .filter((campo) => campo.tipo === "numero-caso" && estado.datosCaso[campo.id])
    .map(
      (campo) => `
        <div class="resumen-fila">
          <span class="resumen-etiqueta">${escapeHtml(campo.etiqueta)}</span>
          <span class="resumen-valor">${escapeHtml(estado.datosCaso[campo.id])}</span>
        </div>`
    )
    .join("");
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
  servicio() {
    const c = document.getElementById("contenido");
    c.innerHTML = `
      <h1>¿Cómo quieres que te ayudemos?</h1>
      <p class="subtitulo">Elige una. Puedes cambiarla más adelante con el botón Atrás.</p>
      <div class="opciones" id="lista-servicios"></div>
    `;
    const lista = document.getElementById("lista-servicios");
    SERVICIOS.forEach((servicio) => {
      const boton = document.createElement("button");
      boton.className = "opcion";
      boton.innerHTML = `
        <span class="opcion-titulo">${servicio.nombre}</span>
        <span class="opcion-detalle">${servicio.resumen}</span>
      `;
      boton.onclick = () => {
        estado.servicio = servicio;
        pantalla("paises");
      };
      lista.appendChild(boton);
    });
  },

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
        estado.etapa = null;
        estado.datosCaso = {};
        estado.grupoActual = 0;
        pantalla("etapa");
      };
      lista.appendChild(boton);
    });
  },

  etapa() {
    const c = document.getElementById("contenido");
    c.innerHTML = `
      <h1>¿En qué punto está tu caso?</h1>
      <p class="subtitulo">Así tu asesor sabe desde dónde arrancar.</p>
      <div class="opciones" id="lista-etapas"></div>
    `;
    const lista = document.getElementById("lista-etapas");
    etapasDeCategoria(estado.categoria).forEach((etapa) => {
      const boton = document.createElement("button");
      boton.className = "opcion";
      boton.innerHTML = `
        <span class="opcion-titulo">${escapeHtml(etapa.nombre)}</span>
        <span class="opcion-detalle">${escapeHtml(etapa.detalle)}</span>
      `;
      boton.onclick = () => {
        estado.etapa = etapa;
        estado.datosCaso = {};
        estado.grupoActual = 0;
        pantalla(etapa.grupos.length ? "caso-datos" : "resumen");
      };
      lista.appendChild(boton);
    });
  },

  "caso-datos"() {
    const c = document.getElementById("contenido");
    const grupo = estado.etapa.grupos[estado.grupoActual];
    const ultimo = estado.grupoActual === estado.etapa.grupos.length - 1;

    c.innerHTML = `
      <h1>${escapeHtml(grupo.titulo)}</h1>
      <p class="subtitulo">${escapeHtml(estado.etapa.nombre)}</p>
      <div class="opciones" id="lista-campos" style="margin-bottom:20px;"></div>
      <p class="subtitulo" id="error-campos" style="color:var(--acento-oscuro); display:none;"></p>
      <button class="boton-primario" id="btn-continuar">Continuar</button>
    `;

    const lista = document.getElementById("lista-campos");
    grupo.campos.forEach((campo) => lista.appendChild(dibujarCampo(campo)));

    document.getElementById("btn-continuar").onclick = () => {
      const error = document.getElementById("error-campos");
      for (const campo of grupo.campos) {
        const resultado = leerCampo(campo);
        if (!resultado.ok) {
          error.textContent = resultado.mensaje;
          error.style.display = "block";
          return;
        }
        estado.datosCaso[campo.id] = resultado.valor;
      }
      error.style.display = "none";
      if (ultimo) {
        pantalla("resumen");
      } else {
        estado.grupoActual += 1;
        pantalla("caso-datos");
      }
    };
  },

  resumen() {
    const c = document.getElementById("contenido");
    const precio = precioActual();
    const precioConocido = precio !== null && precio !== undefined;
    c.innerHTML = `
      <h1>Así será tu proceso</h1>
      <p class="subtitulo">Revisa que todo esté correcto antes de agendar.</p>
      <div class="resumen-caja">
        <div class="resumen-fila">
          <span class="resumen-etiqueta">Servicio</span>
          <span class="resumen-valor">${estado.servicio.nombre}</span>
        </div>
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
        <div class="resumen-fila">
          <span class="resumen-etiqueta">En qué punto vas</span>
          <span class="resumen-valor">${escapeHtml(estado.etapa.nombre)}</span>
        </div>
        ${filasDatosCaso()}
        <div class="precio-grande">
          <div class="precio-numero">${precioConocido ? formatearPrecio(precio) : "Por confirmar"}</div>
          <div class="precio-nota">${precioConocido
            ? `Precio de ${estado.servicio.nombre}`
            : "Un asesor te confirmará el precio exacto"}</div>
        </div>
      </div>
      <p class="subtitulo" style="margin-bottom:8px; font-weight:600; color:var(--ink);">Estos son los pasos:</p>
      <ol class="pasos-lista">
        ${estado.servicio.pasos.map((p) => `<li>${p}</li>`).join("")}
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
      <p class="subtitulo">${MODO_DEMO_PUBLICA
        ? "Esta es una demostración: los datos no se enviarán ni se guardarán."
        : "Aquí te llegará la confirmación y todos los avisos."}</p>
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
    const precio = precioActual();
    const precioConocido = precio !== null && precio !== undefined;
    c.innerHTML = `
      <h1>${MODO_DEMO_PUBLICA ? "Revisa tu cita de prueba" : `Confirma y paga tu ${estado.servicio.nombreCorto}`}</h1>
      <div class="resumen-caja">
        <div class="resumen-fila">
          <span class="resumen-etiqueta">Servicio</span>
          <span class="resumen-valor">${estado.servicio.nombre}</span>
        </div>
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
          <div class="precio-numero">${precioConocido ? formatearPrecio(precio) : "Por confirmar"}</div>
          <div class="precio-nota">${MODO_DEMO_PUBLICA
            ? "Simulación para conocer cómo funcionará el proceso"
            : "Si no confirmamos tu cita en 24 horas, te devolvemos el 100%"}</div>
        </div>
      </div>
      <p class="aviso-precio">${MODO_DEMO_PUBLICA
        ? "Demo pública: no se cobra, no se crea una cita y no se envían datos"
        : "Pago de prueba — todavía no se cobra dinero real"}</p>
      <p class="subtitulo" id="error-pago" style="color:var(--coral-dark); display:none; margin-top:16px;"></p>
      <button class="boton-primario" id="btn-pagar" style="margin-top:20px;">${MODO_DEMO_PUBLICA
        ? "Completar demostración"
        : "Pagar y confirmar mi cita"}</button>
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
          precio: precio,
          fecha: estado.fecha,
          hora: estado.hora + ":00",
          perfil: estado.perfilQuiz,
          tipoServicio: estado.servicio.id,
          etapa: estado.etapa.id,
          datosCaso: estado.datosCaso,
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
        estado.correoEnviado = MODO_DEMO_PUBLICA ? null : await notificarCita(resultado.token);
        if (!MODO_DEMO_PUBLICA && !estado.correoEnviado) {
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
    if (MODO_DEMO_PUBLICA) {
      c.innerHTML = `
        <h1>¡Demostración completada, ${escapeHtml(estado.nombre)}!</h1>
        <p class="subtitulo">Recorriste el flujo completo de <strong>${escapeHtml(estado.servicio.nombre)}</strong> para <strong>${escapeHtml(estado.caso.nombre)}</strong>.</p>
        <div class="resumen-caja">
          <div class="resumen-fila">
            <span class="resumen-etiqueta">Modo de demostración</span>
            <span class="resumen-valor">Sin cita ni pago real</span>
          </div>
        </div>
        <p class="aviso-precio">No guardamos tus datos ni enviamos correos. Cuando activemos el servicio, aquí recibirás la confirmación y los próximos pasos.</p>
        <a class="boton-primario" href="index.html">Volver al inicio</a>
      `;
      return;
    }
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

pantalla(PREGUNTA_SERVICIO ? "servicio" : "paises");
