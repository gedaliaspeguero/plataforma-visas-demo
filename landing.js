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

// El versículo bajo el logo: se ve la cita y, al tocarla, el texto.
function versiculoBajoElLogo() {
  const boton = document.getElementById("versiculo");
  const texto = document.getElementById("versiculo-texto");
  if (!boton || !texto) return;
  const mostrar = (abierto) => {
    texto.hidden = !abierto;
    boton.setAttribute("aria-expanded", String(abierto));
  };
  boton.addEventListener("click", (evento) => {
    evento.stopPropagation();
    mostrar(texto.hidden);
  });
  document.addEventListener("click", (evento) => {
    if (!texto.hidden && !texto.contains(evento.target)) mostrar(false);
  });
  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && !texto.hidden) {
      mostrar(false);
      boton.focus();
    }
  });
}

versiculoBajoElLogo();

if (window.lucide) lucide.createIcons();
