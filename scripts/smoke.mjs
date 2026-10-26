const base = process.env.SMOKE_URL ?? "http://localhost:8787";

function jar() {
  const cookies = new Map();
  return {
    header() {
      return [...cookies.entries()].map(([key, value]) => `${key}=${value}`).join("; ");
    },
    store(response) {
      const list = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
      for (const cookie of list) {
        const [pair] = cookie.split(";");
        const index = pair.indexOf("=");
        if (index > 0) cookies.set(pair.slice(0, index), pair.slice(index + 1));
      }
    },
  };
}

async function request(session, path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("accept", "application/json");
  headers.set("origin", base);
  if (init.body) headers.set("content-type", "application/json");
  const cookie = session.header();
  if (cookie) headers.set("cookie", cookie);
  const response = await fetch(`${base}${path}`, { ...init, headers });
  session.store(response);
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(`${init.method ?? "GET"} ${path} -> ${response.status} ${text}`);
  }
  return body;
}

const stamp = Date.now();
const ana = jar();
const bia = jar();

await request(ana, "/api/auth/sign-up/email", {
  method: "POST",
  body: JSON.stringify({
    name: "Ana Miau",
    email: `ana-${stamp}@example.com`,
    password: "senha-segura",
  }),
});
const session = await request(ana, "/api/auth/get-session");
if (!session?.user?.email?.includes("ana-")) throw new Error("sessão da Ana não voltou");

const created = await request(ana, "/api/events", {
  method: "POST",
  body: JSON.stringify({
    title: "Café smoke",
    timezone: "America/Sao_Paulo",
    startDate: "2026-11-02",
    endDate: "2026-11-02",
    startHour: 9,
    endHour: 12,
  }),
});

await request(ana, `/api/events/${created.id}/availability`, {
  method: "PUT",
  body: JSON.stringify({ slots: ["2026-11-02T09:00", "2026-11-02T09:30"] }),
});

await request(bia, "/api/auth/sign-up/email", {
  method: "POST",
  body: JSON.stringify({
    name: "Bia Miau",
    email: `bia-${stamp}@example.com`,
    password: "senha-segura",
  }),
});
await request(bia, `/api/events/${created.id}/availability`, {
  method: "PUT",
  body: JSON.stringify({ slots: ["2026-11-02T09:30", "2026-11-02T10:00"] }),
});

const guest = jar();
const event = await request(guest, `/api/events/${created.id}`);
if (event.counts["2026-11-02T09:30"] !== 2) {
  throw new Error(`heatmap esperado 2, veio ${event.counts["2026-11-02T09:30"]}`);
}
if (event.canEdit !== false || event.mine.length !== 0) {
  throw new Error("visitante não deveria editar nem ter horários");
}
if (!event.people.some((person) => person.name === "Ana Miau")) {
  throw new Error("Ana não apareceu na lista");
}

let blocked = false;
try {
  await request(guest, `/api/events/${created.id}/availability`, {
    method: "PUT",
    body: JSON.stringify({ slots: ["2026-11-02T10:30"] }),
  });
} catch (error) {
  blocked = String(error).includes("401");
}
if (!blocked) throw new Error("visitante conseguiu pintar");

const mine = await request(ana, "/api/events");
if (!mine.events.some((item) => item.id === created.id && item.role === "owner")) {
  throw new Error("o encontro não está em meus eventos");
}

console.log(`ok ${created.id} overlap=2`);
