# miau2meet

Agenda coletiva no estilo when2meet. Alguém cria o encontro, compartilha o link, e cada pessoa pinta os horários em que pode. O calor da grade mostra onde a galera se encontra. Quem organiza vê os melhores horários.

A interface é em português. O visual é creme e roxo, com patinha só de leve.

Este app roda em **Cloudflare Workers** com **D1** (SQLite). Não usa Neon, Postgres nem banco da Vercel.

## Stack

- React + Vite + Tailwind, servido como asset estático do Worker
- Hono no Worker, rotas em `/api/*`
- Better Auth (e-mail e senha) com o banco D1 nativo
- Drizzle (`drizzle-orm/d1`) para encontros e disponibilidade
- D1 `miau2meet` (`771c02d5-6713-4dea-8ab3-0d96f0c7cc70`), binding `DB`

## Arquivos

```
wrangler.toml                 Worker, binding DB, segredo exigido, observabilidade
migrations/0001_init.sql      Tabelas do Better Auth + event + availability
src/worker/index.ts           Hono: saúde, auth e API
src/worker/auth.ts            Better Auth por request (sem estado global)
src/worker/events.ts          Encontros, grade e heatmap
src/db/schema.ts              Modelo Drizzle (SQLite/D1)
src/db/client.ts              getDb(env.DB) — sem Proxy, sem cache do binding
src/lib/slots.ts              Janela, blocos de 30 min, ranking
src/client/                   UI pt-BR (home, conta, grade, meus eventos)
.dev.vars.example             Segredo local. Copie para .dev.vars
```

`availability.slots` guarda um JSON com os blocos `YYYY-MM-DDTHH:mm` de cada pessoa. O horário é o relógio do fuso do encontro (padrão `America/Sao_Paulo`), não um instante UTC.

## O que o deploy precisa

| Nome | Onde | Valor |
| --- | --- | --- |
| `DB` | binding já no `wrangler.toml` | D1 `miau2meet` |
| `BETTER_AUTH_SECRET` | `wrangler secret put` e `.dev.vars` | `openssl rand -base64 32` (32+ caracteres) |
| `BETTER_AUTH_URL` | `[vars]` no `wrangler.toml` | `https://miau2meet.mvalentim.dev` |

Não há `DATABASE_URL`. O D1 entra pelo binding. Não invente token da Cloudflare neste repositório: `wrangler login` (ou `CLOUDFLARE_API_TOKEN` na sua máquina) fica fora do git.

O domínio `miau2meet.mvalentim.dev` ainda não está ligado. Quando a zona `mvalentim.dev` estiver na Cloudflare, descomente o bloco `[[routes]]` no `wrangler.toml` e rode o deploy de novo. Até lá o Worker responde no `*.workers.dev`. O login usa o host da requisição, então o cookie funciona nos dois endereços.

## Fluxo local

```bash
npm install
cp .dev.vars.example .dev.vars
# edite BETTER_AUTH_SECRET no .dev.vars
npm run db:migrate:local
npm run dev
```

O Vite sobe em <http://localhost:8787> com D1 local (Miniflare, pasta `.wrangler/`).

1. Abra o site e crie uma conta.
2. Em **Novo encontro**, escolha título, dias e horário.
3. Na grade, arraste (ou toque) os blocos em que você pode. O estado muda para “Salvo na grade”.
4. Abra o mesmo link em uma janela anônima: o calor aparece, pintar pede login.
5. Entre com outra conta, pinte um bloco em comum e volte. O número sobe, e quem criou o encontro vê **Melhores horários**.

`npm test` cobre a montagem da grade. Com o dev server no ar, `node scripts/smoke.mjs` faz o fluxo de duas contas contra a API.

## Deploy

```bash
npx wrangler login
npx wrangler secret put BETTER_AUTH_SECRET
npm run db:migrate:remote
npm run deploy
```

`npm run build` só compila (`tsc` + `vite build`) e não precisa de segredo nem de rede. `npm run deploy` gera o bundle e publica com Wrangler. O deploy usa o `wrangler.json` que o Vite escreve em `dist/`, já com os assets.

Migrations remotas aplicam `migrations/*.sql` no D1 `miau2meet`. Rode de novo só quando entrar um arquivo novo. O banco local e o remoto são independentes: migrar um não migra o outro.

Logs e traces estão ligados em `wrangler.toml` (`observability.logs` e `observability.traces`).
