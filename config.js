// Configuración de Supabase — proyecto NumbersPro (compartido con las
// demás apps, tablas con prefijo visas_). Reemplaza estos dos valores
// por los reales del dashboard de Supabase (Project Settings → API).
// El anon key NO es secreto: está diseñado para exponerse en el cliente,
// la seguridad real vive en las políticas RLS y las funciones del schema.sql.

const SUPABASE_URL = "https://ldkkpbnehxkurccivzps.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxka2twYm5laHhrdXJjY2l2enBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4NzgzNTEsImV4cCI6MjA5ODQ1NDM1MX0.VRHJ5zPhJvbhBNyJo1fq2WV1_JN-_KBlaDWkEFTSMvg";

// URL base de las Edge Functions de Supabase. Se arma sola a partir de
// SUPABASE_URL, no hace falta tocarla.
const SUPABASE_FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;
