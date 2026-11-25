// expediente.js — "Mi expediente": lo que ve el cliente que ya inició su proceso.
//
// Sin contraseña: pone su correo, le llega un enlace de un solo uso y el
// navegador guarda una sesión de 30 días. Todo pasa por la Edge Function
// visas-expediente, que revisa la sesión en cada pedido.

const CLAVE_SESION = "tvl-expediente-sesion";
const FUNCION = `${SUPABASE_FUNCTIONS_URL}/visas-expediente`;
const contenido = document.getElementById("exp-contenido");

const ESTADOS_PEDIDO = {
  pendiente: { texto: "Falta", clase: "falta" },
  entregado: { texto: "Enviado, en revisión", clase: "revision" },
  completado: { texto: "Listo", clase: "listo" },
};

function escapar(texto) {
  return String(texto ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function leerSesion() {
  try { return localStorage.getItem(CLAVE_SESION); } catch (e) { return null; }
}
function guardarSesion(valor) {
  try { valor ? localStorage.setItem(CLAVE_SESION, valor) : localStorage.removeItem(CLAVE_SESION); } catch (e) { /* sin memoria: pedirá el enlace otra vez */ }
}

async function llamar(cuerpo) {
  const respuesta = await fetch(FUNCION, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
  return respuesta.json().catch(() => ({ error: "error_interno" }));
}

function fechaBonita(iso) {
  const [a, m, d] = String(iso).split("-").map(Number);
  return new Intl.DateTimeFormat("es-DO", { weekday: "long", day: "numeric", month: "long" }).format(new Date(a, m - 1, d));
}
function horaBonita(hora) {
  const [h, m] = String(hora).split(":").map(Number);
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h >= 12 ? "PM" : "AM"}`;
}
function dinero(monto, moneda) {
  return `${moneda === "USD" ? "US$" : "RD$"}${Number(monto || 0).toLocaleString("es-DO")}`;
}

// ---------- entrar ----------

function pantallaCorreo(aviso = "") {
  contenido.innerHTML = `
    <h1>Mi expediente</h1>
    <p class="subtitulo">Pon el correo que usaste con nosotros y te enviamos un enlace para entrar. No necesitas contraseña.</p>
    ${aviso ? `<p class="exp-aviso">${aviso}</p>` : ""}
    <form id="exp-form" class="exp-form" novalidate>
      <label class="campo-formulario"><span>Tu correo</span>
        <input id="exp-email" type="email" inputmode="email" autocomplete="email" placeholder="nombre@correo.com" required /></label>
      <p class="exp-error" id="exp-error" role="alert" hidden></p>
      <button class="boton-primario" type="submit">Enviarme el enlace</button>
    </form>
    <p class="exp-privacidad">Tu expediente solo lo ven tú y tu asesora. Los documentos se guardan cifrados y nunca quedan en un enlace público.</p>
  `;
  const form = document.getElementById("exp-form");
  form.onsubmit = async (evento) => {
    evento.preventDefault();
    const email = document.getElementById("exp-email").value.trim();
    const error = document.getElementById("exp-error");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      error.textContent = "Escribe un correo válido.";
      error.hidden = false;
      return;
    }
    const boton = form.querySelector("button");
    boton.disabled = true;
    boton.textContent = "Enviando…";
    await llamar({ accion: "pedir_enlace", email });
    contenido.innerHTML = `
      <h1>Revisa tu correo</h1>
      <p class="subtitulo">Si <b>${escapar(email)}</b> tiene un expediente con nosotros, te llegó un enlace para entrar. Sirve una sola vez y por 30 minutos.</p>
      <p class="exp-privacidad">¿No te llegó? Mira en correo no deseado. Si sigue sin llegar, puede que tu expediente esté con otro correo: escríbenos por WhatsApp.</p>
      <button class="boton-secundario" id="exp-otra-vez">Probar con otro correo</button>
    `;
    document.getElementById("exp-otra-vez").onclick = () => pantallaCorreo();
  };
}

async function entrarConEnlace(token) {
  history.replaceState(null, "", location.pathname);
  contenido.innerHTML = `<p class="subtitulo">Abriendo tu expediente…</p>`;
  const r = await llamar({ accion: "entrar", token });
  if (r.ok && r.sesion) {
    guardarSesion(r.sesion);
    return cargar();
  }
  pantallaCorreo("Ese enlace ya se usó o venció. Pide uno nuevo aquí abajo.");
}

// ---------- ver ----------

async function cargar() {
  const sesion = leerSesion();
  if (!sesion) return pantallaCorreo();
  const r = await llamar({ accion: "ver", sesion });
  if (!r.ok) {
    guardarSesion(null);
    return pantallaCorreo(r.error === "sesion_vencida" ? "Tu sesión venció. Pide un enlace nuevo." : "");
  }
  pintar(r);
}

function pintar(d) {
  const exp = d.expediente;
  const claves = Object.keys(d.etapas).filter((k) => k !== "cerrado");
  const actual = exp.etapa === "cerrado" ? claves.length : claves.indexOf(exp.etapa);
  const pendientes = d.pedidos.filter((p) => p.estado === "pendiente");
  const otros = d.pedidos.filter((p) => p.estado !== "pendiente");
  const pagos = d.citas.filter((c) => c.servicio === "proceso" && c.total);

  contenido.innerHTML = `
    <div class="exp-cabeza">
      <div>
        <p class="exp-numero">Expediente ${escapar(exp.numero)}</p>
        <h1>Hola, ${escapar(String(exp.nombre).split(" ")[0])}</h1>
      </div>
      <button class="exp-salir" id="exp-salir">Salir</button>
    </div>

    <section class="exp-bloque">
      <h2>En qué va tu caso</h2>
      ${exp.etapa === "cerrado" ? `<p class="exp-cerrado">Tu caso está cerrado. Si necesitas algo, escríbenos.</p>` : ""}
      <ol class="exp-etapas">
        ${claves.map((k, i) => `<li class="${i < actual ? "hecha" : i === actual ? "actual" : ""}"><span>${escapar(d.etapas[k])}</span></li>`).join("")}
      </ol>
    </section>

    <section class="exp-bloque">
      <h2>Lo que tu asesora necesita ${pendientes.length ? `<span class="exp-cuenta">${pendientes.length}</span>` : ""}</h2>
      ${pendientes.length ? pendientes.map(tarjetaPedido).join("") : `<p class="exp-vacio">Por ahora no te falta nada. Te avisamos por correo si necesitamos algo.</p>`}
      ${otros.length ? `<details class="exp-otros"><summary>Enviados y listos (${otros.length})</summary>${otros.map(tarjetaPedido).join("")}</details>` : ""}
    </section>

    <section class="exp-bloque">
      <h2>Tus documentos</h2>
      ${d.documentos.length ? `<ul class="exp-docs">${d.documentos.map((doc) => `
        <li>
          <button class="exp-doc" data-doc="${doc.id}">
            <span class="exp-doc-icono">${doc.tipo === "application/pdf" ? "PDF" : "IMG"}</span>
            <span class="exp-doc-nombre">${escapar(doc.nombre)}</span>
            <small>${doc.subido_por === "asesora" ? "Te lo envió tu asesora" : "Lo enviaste tú"} · ${new Date(doc.created_at).toLocaleDateString("es-DO")}</small>
          </button>
        </li>`).join("")}</ul>` : `<p class="exp-vacio">Todavía no hay documentos.</p>`}
      <label class="boton-secundario exp-subir-libre">Enviar otro documento
        <input type="file" accept="application/pdf,image/*" data-subir="" hidden /></label>
    </section>

    ${pagos.length ? `
    <section class="exp-bloque">
      <h2>Tus pagos</h2>
      ${pagos.map((c) => {
        const falta = Math.max(0, Number(c.total) - Number(c.pagado || 0));
        return `<div class="exp-pago"><span>${escapar(c.tramite)}</span><b>${dinero(c.pagado, c.moneda)} de ${dinero(c.total, c.moneda)}</b>${falta ? `<small>Falta ${dinero(falta, c.moneda)}. El trámite se envía cuando el pago esté completo.</small>` : `<small>Pago completo</small>`}</div>`;
      }).join("")}
    </section>` : ""}

    ${d.citas.length ? `
    <section class="exp-bloque">
      <h2>Tus citas</h2>
      ${d.citas.map((c) => `<a class="exp-cita" href="${escapar(c.enlace)}"><span>${escapar(fechaBonita(c.fecha).replace(/^./, (l) => l.toUpperCase()))} · ${horaBonita(c.hora)}</span><small>${c.servicio === "proceso" ? "Iniciar Proceso" : "Orientación"} · ${escapar(c.tramite)}${c.estado === "cancelada" ? " · cancelada" : ""}</small></a>`).join("")}
    </section>` : ""}

    <p class="exp-privacidad">Tu expediente solo lo ven tú y tu equipo de asesoras. Los documentos se guardan cifrados y cada vez que abres uno se crea un enlace que caduca en minutos.</p>
  `;

  document.getElementById("exp-salir").onclick = async () => {
    await llamar({ accion: "salir", sesion: leerSesion() });
    guardarSesion(null);
    pantallaCorreo("Saliste de tu expediente.");
  };
  contenido.querySelectorAll("[data-doc]").forEach((b) => { b.onclick = () => abrirDocumento(b); });
  contenido.querySelectorAll("input[data-subir]").forEach((input) => {
    input.onchange = () => subir(input, input.dataset.subir || null);
  });
}

function tarjetaPedido(p) {
  const estado = ESTADOS_PEDIDO[p.estado] || ESTADOS_PEDIDO.pendiente;
  return `
    <div class="exp-pedido ${estado.clase}">
      <div class="exp-pedido-fila"><b>${escapar(p.titulo)}</b><span class="exp-chip ${estado.clase}">${estado.texto}</span></div>
      ${p.detalle ? `<p>${escapar(p.detalle)}</p>` : ""}
      ${p.estado !== "completado" ? `<label class="${p.estado === "pendiente" ? "boton-primario" : "boton-secundario"} exp-subir">${p.estado === "pendiente" ? "Enviar documento" : "Enviar otro"}
        <input type="file" accept="application/pdf,image/*" data-subir="${p.id}" hidden /></label>` : ""}
    </div>`;
}

async function abrirDocumento(boton) {
  // La ventana se abre en el mismo toque: si se abre después de esperar, el celular la bloquea.
  const ventana = window.open("", "_blank");
  const r = await llamar({ accion: "abrir_documento", sesion: leerSesion(), documento_id: boton.dataset.doc });
  if (r.ok && r.url) {
    if (ventana) ventana.location = r.url; else location.href = r.url;
  } else {
    if (ventana) ventana.close();
    alert("No pudimos abrir ese documento. Inténtalo de nuevo.");
  }
}

const ERRORES_SUBIDA = {
  tipo_no_permitido: "Solo se pueden enviar PDF o fotos (JPG, PNG, HEIC).",
  archivo_muy_grande: "El archivo pesa más de 10 MB. Prueba con una foto más liviana o un PDF más pequeño.",
  sesion_vencida: "Tu sesión venció. Vuelve a entrar con tu correo.",
  demasiados_documentos: "Tu expediente ya tiene muchos documentos. Escríbele a tu asesora por WhatsApp.",
};

async function subir(input, pedidoId) {
  const archivo = input.files?.[0];
  if (!archivo) return;
  const etiqueta = input.closest("label");
  const textoOriginal = etiqueta.firstChild.textContent;
  const avisar = (texto) => { etiqueta.firstChild.textContent = texto; };
  const tipo = archivo.type || (/\.heic$/i.test(archivo.name) ? "image/heic" : "");
  const sesion = leerSesion();
  etiqueta.classList.add("subiendo");
  avisar("Enviando…");
  try {
    const pedido = await llamar({ accion: "subir", sesion, nombre: archivo.name, tipo, tamano: archivo.size, pedido_id: pedidoId });
    if (!pedido.ok) throw new Error(pedido.error || "error_interno");
    const subida = await fetch(pedido.url, { method: "PUT", headers: { "Content-Type": tipo, "x-upsert": "false" }, body: archivo });
    if (!subida.ok) throw new Error("subida_fallida");
    const listo = await llamar({ accion: "confirmar", sesion, ruta: pedido.ruta, nombre: archivo.name, tipo, tamano: archivo.size, pedido_id: pedidoId });
    if (!listo.ok) throw new Error(listo.error || "error_interno");
    await cargar();
  } catch (e) {
    console.error(e);
    etiqueta.classList.remove("subiendo");
    avisar(textoOriginal);
    input.value = "";
    alert(ERRORES_SUBIDA[e.message] || "No se pudo enviar el documento. Revisa tu conexión e inténtalo de nuevo.");
  }
}

// ---------- arranque ----------

function arrancar() {
  const entrada = /[#&]entrar=([0-9a-f]{64})/.exec(location.hash);
  if (entrada) entrarConEnlace(entrada[1]);
  else cargar();
}

// Si la página ya estaba abierta y se toca otro enlace de entrada, también entra.
window.addEventListener("hashchange", () => { if (/entrar=/.test(location.hash)) arrancar(); });
arrancar();
