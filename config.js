// Configuración exclusiva del sitio público. No conecta con Supabase ni
// permite crear citas o enviar correos reales.
const DEMO_PUBLICA = true;
const SUPABASE_URL = "https://demo.invalid";
const SUPABASE_ANON_KEY = "demo";
const SUPABASE_FUNCTIONS_URL = "https://demo.invalid/functions/v1";

// Lanzamiento "a la antigua": mientras no haya pago con tarjeta, agendar y
// pagar se coordina por WhatsApp. Con esto encendido, los botones de los
// servicios y el resultado del test abren WhatsApp, y agendar.html no se usa.
const AGENDA_POR_WHATSAPP = true;
// WhatsApp oficial del negocio. Formato: código de país + número, sin "+" ni
// espacios.
const WHATSAPP_NEGOCIO = "18098620377";
