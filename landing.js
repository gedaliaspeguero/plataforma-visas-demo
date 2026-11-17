// En el sitio público (config.demo.js) agendar y pagar se coordinan por
// WhatsApp: los servicios llevan al agendador, que termina enviando el caso
// por WhatsApp, y el pie ofrece un contacto directo para preguntas.
const MODO_WHATSAPP = typeof AGENDA_POR_WHATSAPP !== "undefined" && AGENDA_POR_WHATSAPP === true;

function enlaceWhatsapp(mensaje) {
  return `https://wa.me/${WHATSAPP_NEGOCIO}?text=${encodeURIComponent(mensaje)}`;
}

function contactoPorWhatsapp() {
  const enlace = document.getElementById("pie-whatsapp");
  if (!MODO_WHATSAPP || !enlace) return;
  enlace.href = enlaceWhatsapp("Hola, tengo una pregunta sobre mi trámite: ");
  enlace.target = "_blank";
  enlace.rel = "noopener";
  enlace.hidden = false;
}

contactoPorWhatsapp();

if (window.lucide) lucide.createIcons();
