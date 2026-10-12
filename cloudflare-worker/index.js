const corsHeaders = {
  "Access-Control-Allow-Origin": "https://novo-projecto-keu5.vercel.app",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400"
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function base64url(bytes) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return base64url(bytes);
}

async function hashPassword(password, salt) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 310000,
      hash: "SHA-256"
    },
    key,
    256
  );

  return new Uint8Array(bits);
}

async function hashToken(token, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(token)
  );

  return base64url(new Uint8Array(signature));
}

async function authenticate(request, env) {
  const header = request.headers.get("Authorization") || "";
  const match = header.match(/^Bearer\s+(\S+)$/i);

  if (!match) {
    return null;
  }

  const tokenHash = await hashToken(match[1], env.AUTH_SECRET);

  const result = await env.NEVON_DB.prepare(`
    SELECT
      s.id AS session_id,
      s.user_id,
      u.email,
      u.full_name,
      u.role,
      u.status
    FROM user_sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ?
      AND s.expires_at > ?
      AND u.status = 'active'
    LIMIT 1
  `).bind(tokenHash, new Date().toISOString()).first();

  return result || null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    try {
      if (!env.NEVON_DB) {
        return jsonResponse({
          error: "database_not_configured",
          message: "A base de dados não está configurada."
        }, 503);
      }

      if (!env.AUTH_SECRET || env.AUTH_SECRET.length < 32) {
        return jsonResponse({
          error: "auth_secret_not_configured",
          message: "Configura um AUTH_SECRET forte nos Secrets do Cloudflare."
        }, 503);
      }

      // Página inicial da API
      if (path === "/" && request.method === "GET") {
        return jsonResponse({
          service: "Nevon Pay API",
          version: "1.1.0",
          status: "running"
        });
      }

      // Verificação da API e da base de dados
      if (
        (path === "/health" || path === "/api/v1/health") &&
        request.method === "GET"
      ) {
        const result = await env.NEVON_DB.prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
        ).all();

        return jsonResponse({
          service: "Nevon Pay API",
          status: "ok",
          database: "connected",
          tables: (result.results || []).map(row => row.name)
        });
      }

      // Registar utilizador
      if (
        path === "/api/v1/auth/register" &&
        request.method === "POST"
      ) {
        const body = await request.json();

        const email = String(body.email || "")
          .trim()
          .toLowerCase();

        const fullName = String(body.full_name || "").trim();
        const password = body.password;

        if (
          !email ||
          email.length > 254 ||
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ) {
          return jsonResponse({
            error: "invalid_email",
            message: "Introduz um endereço de email válido."
          }, 400);
        }

        if (
          typeof password !== "string" ||
          password.length < 10 ||
          password.length > 128
        ) {
          return jsonResponse({
            error: "invalid_password",
            message: "A palavra-passe deve ter entre 10 e 128 caracteres."
          }, 400);
        }

        if (fullName.length > 120) {
          return jsonResponse({
            error: "invalid_name",
            message: "O nome não pode ultrapassar 120 caracteres."
          }, 400);
        }

        const existing = await env.NEVON_DB.prepare(
          "SELECT id FROM users WHERE email = ? LIMIT 1"
        ).bind(email).first();

        if (existing) {
          return jsonResponse({
            error: "email_already_registered",
            message: "Este email já está registado."
          }, 409);
        }

        const userId = crypto.randomUUID();

        const salt = crypto.getRandomValues(new Uint8Array(16));
        const passwordHash = await hashPassword(password, salt);

        const storedHash =
          base64url(salt) + ":" + base64url(passwordHash);

        await env.NEVON_DB.batch([
          env.NEVON_DB.prepare(`
            INSERT INTO users (
              id, email, full_name, role, status
            ) VALUES (?, ?, ?, 'customer', 'pending')
          `).bind(userId, email, fullName || null),

          env.NEVON_DB.prepare(`
            INSERT INTO user_credentials (
              user_id, password_hash
            ) VALUES (?, ?)
          `).bind(userId, storedHash)
        ]);

        return jsonResponse({
          success: true,
          message: "Conta criada. Aguarda a ativação antes de iniciar sessão.",
          user: {
            id: userId,
            email,
            full_name: fullName || null,
            role: "customer",
            status: "pending"
          }
        }, 201);
      }

      // Iniciar sessão
      if (
        path === "/api/v1/auth/login" &&
        request.method === "POST"
      ) {
        const body = await request.json();

        const email = String(body.email || "")
          .trim()
          .toLowerCase();

        const password = body.password;

        if (
          !email ||
          typeof password !== "string" ||
          password.length > 128
        ) {
          return jsonResponse({
            error: "invalid_credentials",
            message: "Email ou palavra-passe inválidos."
          }, 400);
        }

        const user = await env.NEVON_DB.prepare(`
          SELECT
            u.id,
            u.email,
            u.full_name,
            u.role,
            u.status,
            c.password_hash
          FROM users u
          JOIN user_credentials c ON c.user_id = u.id
          WHERE u.email = ?
          LIMIT 1
        `).bind(email).first();

        if (!user || !user.password_hash) {
          return jsonResponse({
            error: "invalid_credentials",
            message: "Email ou palavra-passe inválidos."
          }, 401);
        }

        const parts = user.password_hash.split(":");

        if (parts.length !== 2) {
          return jsonResponse({
            error: "authentication_error",
            message: "Não foi possível validar a conta."
          }, 500);
        }

        function decodeBase64url(value) {
          const normalized = value
            .replace(/-/g, "+")
            .replace(/_/g, "/");

          const binary = atob(
            normalized + "=".repeat((4 - normalized.length % 4) % 4)
          );

          return Uint8Array.from(binary, c => c.charCodeAt(0));
        }

        const salt = decodeBase64url(parts[0]);
        const expectedHash = decodeBase64url(parts[1]);
        const actualHash = await hashPassword(password, salt);

        if (
          actualHash.length !== expectedHash.length ||
          !crypto.subtle
        ) {
          return jsonResponse({
            error: "invalid_credentials",
            message: "Email ou palavra-passe inválidos."
          }, 401);
        }

        let difference = 0;

        for (let i = 0; i < actualHash.length; i++) {
          difference |= actualHash[i] ^ expectedHash[i];
        }

        if (difference !== 0) {
          return jsonResponse({
            error: "invalid_credentials",
            message: "Email ou palavra-passe inválidos."
          }, 401);
        }

        if (user.status !== "active") {
          return jsonResponse({
            error: "account_not_active",
            message: "A conta ainda não está ativa."
          }, 403);
        }

        const token = randomToken();
        const tokenHash = await hashToken(token, env.AUTH_SECRET);
        const sessionId = crypto.randomUUID();

        const expiresAt = new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        ).toISOString();

        await env.NEVON_DB.prepare(`
          INSERT INTO user_sessions (
            id, user_id, token_hash, expires_at
          ) VALUES (?, ?, ?, ?)
        `).bind(
          sessionId,
          user.id,
          tokenHash,
          expiresAt
        ).run();

        return jsonResponse({
          success: true,
          message: "Sessão iniciada com sucesso.",
          token,
          token_type: "Bearer",
          expires_at: expiresAt,
          user: {
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            status: user.status
          }
        });
      }

      // Consultar conta autenticada
      if (
        path === "/api/v1/auth/me" &&
        request.method === "GET"
      ) {
        const user = await authenticate(request, env);

        if (!user) {
          return jsonResponse({
            error: "unauthorized",
            message: "Sessão inválida ou expirada."
          }, 401);
        }

        return jsonResponse({
          success: true,
          user: {
            id: user.user_id,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            status: user.status
          }
        });
      }

      // Terminar sessão
      if (
        path === "/api/v1/auth/logout" &&
        request.method === "POST"
      ) {
        const user = await authenticate(request, env);

        if (!user) {
          return jsonResponse({
            error: "unauthorized",
            message: "Sessão inválida ou expirada."
          }, 401);
        }

        await env.NEVON_DB.prepare(
          "DELETE FROM user_sessions WHERE id = ?"
        ).bind(user.session_id).run();

        return jsonResponse({
          success: true,
          message: "Sessão terminada com sucesso."
        });
      }

      return jsonResponse({
        error: "not_found",
        message: "Endpoint não encontrado."
      }, 404);

    } catch (error) {
      console.error("Nevon Pay API error:", error);

      return jsonResponse({
        error: "internal_server_error",
        message: "Ocorreu um erro interno. Tenta novamente."
      }, 500);
    }
  }
};
