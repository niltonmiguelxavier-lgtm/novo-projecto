const corsHeaders = {
  "Access-Control-Allow-Origin": "https://novo-projecto-keu5.vercel.app",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    if (url.pathname === "/") {
      return jsonResponse({
        service: "Nevon Pay API",
        version: "1.0.0",
        status: "running",
        message: "API da Nevon Pay activa."
      });
    }

    if (
      url.pathname === "/health" ||
      url.pathname === "/api/v1/health"
    ) {
      if (!env.NEVON_DB) {
        return jsonResponse({
          service: "Nevon Pay API",
          status: "configuration_required",
          database: "not_connected",
          message: "O binding NEVON_DB não está configurado."
        }, 503);
      }

      try {
        const result = await env.NEVON_DB
          .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
          .all();

        const tables = (result.results || []).map(row => row.name);

        return jsonResponse({
          service: "Nevon Pay API",
          status: "ok",
          database: "connected",
          tables
        });
      } catch (error) {
        console.error("Database health check failed:", error);

        return jsonResponse({
          service: "Nevon Pay API",
          status: "database_error",
          message: "Não foi possível consultar a base de dados."
        }, 503);
      }
    }

    return jsonResponse({
      error: "not_found",
      message: "Endpoint não encontrado."
    }, 404);
  }
};
