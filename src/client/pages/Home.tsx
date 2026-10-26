import { Link } from "react-router";
import { Paw } from "../components/Paw";
import { useViewer } from "../components/Shell";
import { heatColor } from "../../lib/slots";

const PREVIEW = [
  [0, 1, 2, 3, 1],
  [1, 2, 4, 4, 2],
  [0, 2, 4, 3, 1],
  [1, 1, 3, 2, 0],
  [2, 3, 4, 4, 2],
  [1, 2, 2, 3, 1],
];

export function HomePage() {
  const { user } = useViewer();
  const createHref = user ? "/eventos/novo" : "/cadastrar?next=/eventos/novo";

  return (
    <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-8 sm:py-12 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
      <section className="min-w-0">
        <p className="mb-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-sm font-bold text-plum-deep">
          <Paw className="h-4 w-4 shrink-0" />
          agenda coletiva, sem planilha
        </p>
        <h1 className="text-balance font-display text-[2.35rem] leading-[1.08] tracking-tight text-ink min-[400px]:text-5xl sm:text-6xl">
          O horário em que a galera pode.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
          Cria um encontro, manda o link e deixa cada pessoa pintar a grade. O calor mostra onde as
          agendas se encontram — quem organiza vê os melhores horários.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link to={createHref} className="btn btn-primary w-full sm:w-auto">
            Criar encontro
          </Link>
          <a href="#como-funciona" className="btn btn-ghost w-full sm:w-auto">
            Ver como funciona
          </a>
        </div>
        <ol id="como-funciona" className="mt-12 grid gap-4 sm:grid-cols-3">
          {[
            ["1", "Crie", "Título, dias e a janela de horário. O fuso começa em Brasília."],
            ["2", "Compartilhe", "O link abre para todo mundo. Pintar a grade pede login."],
            ["3", "Leia o calor", "Quanto mais gente livre, mais roxo. O ranking fica com quem organiza."],
          ].map(([step, title, copy]) => (
            <li key={step} className="card p-4">
              <span className="font-display text-2xl text-plum">{step}</span>
              <h2 className="mt-1 font-bold">{title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">{copy}</p>
            </li>
          ))}
        </ol>
      </section>
      <aside className="relative min-w-0">
        <Paw className="pointer-events-none absolute -top-6 right-2 hidden h-24 w-24 text-plum/15 sm:block" />
        <div className="card relative overflow-hidden p-4 sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-muted">exemplo</p>
              <h2 className="font-display text-2xl leading-tight">café da sexta</h2>
            </div>
            <span className="shrink-0 rounded-full bg-lilac px-3 py-2 text-sm font-bold text-plum-deep">4 pessoas</span>
          </div>
          <div
            className="grid gap-1.5"
            style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}
            aria-hidden="true"
          >
            {PREVIEW.flatMap((row, rowIndex) =>
              row.map((count, column) => {
                const tone = heatColor(count, 4);
                return (
                  <div
                    key={`${rowIndex}-${column}`}
                    className="flex h-11 items-center justify-center rounded-lg text-sm font-bold"
                    style={{ background: tone.background, color: tone.color }}
                  >
                    {count > 0 ? count : ""}
                  </div>
                );
              }),
            )}
          </div>
          <p className="mt-4 text-sm text-muted">
            O número é quantas pessoas podem naquele bloco de 30 minutos.
          </p>
        </div>
      </aside>
    </div>
  );
}
