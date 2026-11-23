let llamadaDaily = null;
let relojReunion = null;

function cargarDaily() {
  if (window.DailyIframe) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://unpkg.com/@daily-co/daily-js";
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// ---------- contador de la cita ----------
//
// La videollamada dura lo que dura la cita y se corta sola al terminar (lo
// hace Daily en el servidor). El contador le muestra a todos cuánto queda y
// avisa cuando faltan 5 minutos, para que nadie se quede a mitad de frase.

const AVISO_FINAL_MS = 5 * 60 * 1000;

function textoDeTiempo(ms) {
  const segundos = Math.max(0, Math.ceil(ms / 1000));
  const minutos = Math.floor(segundos / 60);
  return `${minutos}:${String(segundos % 60).padStart(2, "0")}`;
}

// Un tono corto. Si el navegador no deja sonar, el aviso visual queda igual.
function sonarAviso() {
  try {
    const Contexto = window.AudioContext || window.webkitAudioContext;
    if (!Contexto) return;
    const audio = new Contexto();
    [0, 0.35].forEach((cuando) => {
      const tono = audio.createOscillator();
      const volumen = audio.createGain();
      tono.frequency.value = 880;
      volumen.gain.setValueAtTime(0.0001, audio.currentTime + cuando);
      volumen.gain.exponentialRampToValueAtTime(0.25, audio.currentTime + cuando + 0.02);
      volumen.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + cuando + 0.25);
      tono.connect(volumen).connect(audio.destination);
      tono.start(audio.currentTime + cuando);
      tono.stop(audio.currentTime + cuando + 0.3);
    });
    setTimeout(() => audio.close(), 1500);
  } catch (e) {
    console.warn("No se pudo reproducir el aviso:", e);
  }
}

function detenerRelojReunion() {
  if (!relojReunion) return;
  clearInterval(relojReunion.intervalo);
  relojReunion.barra.remove();
  relojReunion = null;
}

// ¿Ya se cumplió la hora de fin? Se usa también al salir de la llamada, para
// distinguir "se acabó el tiempo" de "la persona colgó".
function reunionTerminoPorTiempo(datos) {
  if (!datos?.termina_en) return false;
  const desfase = datos.ahora ? datos.ahora * 1000 - datos.recibidoEn : 0;
  return Date.now() + desfase >= datos.termina_en * 1000 - 3000;
}

function iniciarRelojReunion(contenedor, datos) {
  detenerRelojReunion();
  if (!datos.termina_en || !contenedor.parentNode) return;
  // Diferencia entre el reloj del servidor y el de este aparato.
  const desfase = datos.ahora ? datos.ahora * 1000 - datos.recibidoEn : 0;

  const barra = document.createElement("div");
  barra.className = "reunion-reloj";
  barra.innerHTML = `<span class="reunion-reloj-texto" role="timer"></span><span class="reunion-reloj-aviso" aria-live="assertive"></span>`;
  contenedor.parentNode.insertBefore(barra, contenedor);
  const texto = barra.querySelector(".reunion-reloj-texto");
  const aviso = barra.querySelector(".reunion-reloj-aviso");
  let avisado = false;

  const pintar = () => {
    const ahora = Date.now() + desfase;
    const paraEmpezar = datos.empieza_en ? datos.empieza_en * 1000 - ahora : 0;
    const paraTerminar = datos.termina_en * 1000 - ahora;

    if (paraTerminar <= 0) {
      barra.classList.add("alerta");
      texto.textContent = "Se terminó el tiempo de la cita";
      aviso.textContent = "";
      // Daily ya sacó a todos; esto es solo por si su aviso no llegó.
      if (paraTerminar < -4000 && llamadaDaily) cerrarReunionDiaria();
      return;
    }
    if (paraEmpezar > 0) {
      texto.textContent = `La cita empieza en ${textoDeTiempo(paraEmpezar)}`;
      return;
    }
    texto.textContent = `Quedan ${textoDeTiempo(paraTerminar)}`;
    if (paraTerminar <= AVISO_FINAL_MS) {
      barra.classList.add("alerta");
      if (!avisado) {
        avisado = true;
        aviso.textContent = "La llamada se cierra sola al llegar a cero.";
        sonarAviso();
      }
    }
  };

  pintar();
  relojReunion = { barra, intervalo: setInterval(pintar, 1000) };
}

// alSalir recibe "tiempo" cuando la llamada terminó porque se cumplió la hora.
async function abrirReunionDiaria(contenedor, datos, alSalir) {
  datos.recibidoEn = datos.recibidoEn || Date.now();
  await cargarDaily();
  await cerrarReunionDiaria();
  const llamada = window.DailyIframe.createFrame(contenedor, {
    showLeaveButton: true,
    iframeStyle: { width: "100%", height: "100%", border: "0", borderRadius: "8px" },
  });
  llamadaDaily = llamada;
  llamada.on("left-meeting", async () => {
    detenerRelojReunion();
    await llamada.destroy();
    if (llamadaDaily === llamada) llamadaDaily = null;
    alSalir?.(reunionTerminoPorTiempo(datos) ? "tiempo" : undefined);
  });
  iniciarRelojReunion(contenedor, datos);
  try {
    await llamada.join({ url: datos.url, token: datos.token });
  } catch (error) {
    detenerRelojReunion();
    throw error;
  }
}

async function cerrarReunionDiaria() {
  detenerRelojReunion();
  if (!llamadaDaily) return;
  const llamada = llamadaDaily;
  llamadaDaily = null;
  await llamada.leave();
  await llamada.destroy();
}
