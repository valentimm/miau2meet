import { Hono } from "hono";
import { createAuth } from "./auth";
import { registerEventRoutes } from "./events";

const app = new Hono<{ Bindings: Env }>();

app.get("/api/health", (c) => c.json({ ok: true, name: "miau2meet" }));

app.on(["GET", "POST"], "/api/auth/*", (c) => {
  if (!c.env.BETTER_AUTH_SECRET) {
    return c.json({ error: "Falta o segredo BETTER_AUTH_SECRET no Worker." }, 500);
  }
  return createAuth(c.env, c.req.raw).handler(c.req.raw);
});

registerEventRoutes(app);

app.notFound(async (c) => {
  if (c.req.path.startsWith("/api/")) {
    return c.json({ error: "Não encontrado." }, 404);
  }
  return c.env.ASSETS.fetch(c.req.raw);
});

app.onError((error, c) => {
  console.error(
    JSON.stringify({
      level: "error",
      message: error.message,
      path: c.req.path,
    }),
  );
  return c.json({ error: "Algo deu errado por aqui. Tenta de novo em instantes." }, 500);
});

export default app;
