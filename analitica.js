// Cloudflare Web Analytics: solo cuenta visitas, páginas, origen y dispositivo.
// No usa cookies ni recoge datos personales. Se activa únicamente si la
// configuración define el token (el sitio público lo hace en config.demo.js).
(function () {
  if (typeof CLOUDFLARE_ANALYTICS_TOKEN === "undefined" || !CLOUDFLARE_ANALYTICS_TOKEN) return;
  const script = document.createElement("script");
  script.defer = true;
  script.src = "https://static.cloudflareinsights.com/beacon.min.js";
  script.setAttribute("data-cf-beacon", JSON.stringify({ token: CLOUDFLARE_ANALYTICS_TOKEN }));
  document.head.appendChild(script);
})();
