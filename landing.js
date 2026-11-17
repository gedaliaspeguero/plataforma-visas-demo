// En el sitio público (config.demo.js) agendar y pagar se coordinan por
// WhatsApp: los botones de los servicios abren el chat con el mensaje listo.
const MODO_WHATSAPP = typeof AGENDA_POR_WHATSAPP !== "undefined" && AGENDA_POR_WHATSAPP === true;

const MENSAJES_SERVICIO = {
  orientacion: "Hola, quiero agendar una Orientación Rápida. Mi caso es: ",
  proceso: "Hola, quiero iniciar mi proceso con ustedes. Mi caso es: ",
};

function enlaceWhatsapp(mensaje) {
  return `https://wa.me/${WHATSAPP_NEGOCIO}?text=${encodeURIComponent(mensaje)}`;
}

function serviciosPorWhatsapp() {
  if (!MODO_WHATSAPP) return;
  document.querySelectorAll('a[href^="agendar.html"]').forEach((enlace) => {
    const servicio = new URL(enlace.href).searchParams.get("servicio");
    enlace.href = enlaceWhatsapp(MENSAJES_SERVICIO[servicio] || MENSAJES_SERVICIO.orientacion);
    enlace.target = "_blank";
    enlace.rel = "noopener";
  });
}

function contactoPorWhatsapp() {
  const enlace = document.getElementById("pie-whatsapp");
  if (!MODO_WHATSAPP || !enlace) return;
  enlace.href = enlaceWhatsapp("Hola, tengo una pregunta sobre mi trámite: ");
  enlace.target = "_blank";
  enlace.rel = "noopener";
  enlace.hidden = false;
}

serviciosPorWhatsapp();
contactoPorWhatsapp();

if (window.lucide) lucide.createIcons();
