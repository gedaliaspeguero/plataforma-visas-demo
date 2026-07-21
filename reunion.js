let llamadaDaily = null;

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

async function abrirReunionDiaria(contenedor, datos, alSalir) {
  await cargarDaily();
  await cerrarReunionDiaria();
  const llamada = window.DailyIframe.createFrame(contenedor, {
    showLeaveButton: true,
    iframeStyle: { width: "100%", height: "100%", border: "0", borderRadius: "8px" },
  });
  llamadaDaily = llamada;
  llamada.on("left-meeting", async () => {
    await llamada.destroy();
    if (llamadaDaily === llamada) llamadaDaily = null;
    alSalir?.();
  });
  await llamada.join({ url: datos.url, token: datos.token });
}

async function cerrarReunionDiaria() {
  if (!llamadaDaily) return;
  const llamada = llamadaDaily;
  llamadaDaily = null;
  await llamada.leave();
  await llamada.destroy();
}
