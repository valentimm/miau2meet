import { betterAuth } from "better-auth";

const PRODUCTION_ORIGIN = "https://miau2meet.mvalentim.dev";

export function createAuth(env: Env, request: Request) {
  const origin = new URL(request.url).origin;
  const trusted = new Set([origin, PRODUCTION_ORIGIN, env.BETTER_AUTH_URL]);
  return betterAuth({
    appName: "miau2meet",
    baseURL: origin,
    secret: env.BETTER_AUTH_SECRET,
    database: env.DB,
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      autoSignIn: true,
    },
    trustedOrigins: [...trusted].filter((value): value is string => Boolean(value)),
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
      },
    },
    advanced: {
      useSecureCookies: origin.startsWith("https://"),
    },
  });
}

export type AppAuth = ReturnType<typeof createAuth>;

export async function readSession(env: Env, request: Request) {
  if (!env.BETTER_AUTH_SECRET) return null;
  const session = await createAuth(env, request).api.getSession({
    headers: request.headers,
  });
  return session?.user ?? null;
}
