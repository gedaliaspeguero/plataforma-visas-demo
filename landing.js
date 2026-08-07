// La demo pública se ve igual que el sitio real, así que hay que decirlo:
// alguien que llegue por el dominio podría llenar todo el wizard creyendo que
// agendó. El wizard ya lo avisa al pagar, pero mejor decirlo desde la entrada.
function avisarSiEsDemo() {
  const esDemo = typeof DEMO_PUBLICA !== "undefined" && DEMO_PUBLICA === true;
  if (!esDemo) return;

  const aviso = document.createElement("p");
  aviso.className = "aviso-demo";
  aviso.setAttribute("role", "status");
  aviso.textContent =
    "Sitio en construcción: puedes recorrerlo completo, pero todavía no se agendan citas reales.";
  document.body.prepend(aviso);
}

avisarSiEsDemo();

if (window.lucide) lucide.createIcons();
