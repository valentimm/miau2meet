import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router";
import { api, ApiError } from "../api";
import { Paw } from "../components/Paw";
import { useViewer } from "../components/Shell";

type EventCard = {
  id: string;
  title: string;
  summary: string;
  createdAt: string;
  role: "owner" | "guest";
  participants: number;
};

export function EventsPage() {
  const { pending, user } = useViewer();
  const [events, setEvents] = useState<EventCard[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    api<{ events: EventCard[] }>("/api/events")
      .then((data) => {
        if (!cancelled) setEvents(data.events);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof ApiError ? reason.message : "Não deu para carregar.");
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (pending) return <p className="px-4 py-16 text-center text-muted">Abrindo seus encontros…</p>;
  if (!user) return <Navigate to="/entrar?next=/eventos" replace />;

  const owned = events?.filter((event) => event.role === "owner") ?? [];
  const joined = events?.filter((event) => event.role === "guest") ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="break-words font-display text-[2rem] leading-tight sm:text-5xl">Meus eventos</h1>
          <p className="mt-2 text-muted">Os que você organiza e os que você já pintou.</p>
        </div>
        <Link to="/eventos/novo" className="btn btn-primary w-full sm:w-auto">
          Novo encontro
        </Link>
      </div>
      {error ? <p className="mt-6 font-bold text-plum-deep">{error}</p> : null}
      {events === null && !error ? <p className="mt-8 text-muted">Carregando a lista…</p> : null}
      {events?.length === 0 ? (
        <div className="card mt-8 px-6 py-12 text-center">
          <Paw className="mx-auto h-12 w-12 text-plum" />
          <p className="mt-3 font-display text-3xl">Nenhum encontro ainda.</p>
          <p className="mt-2 text-muted">O primeiro miau é seu.</p>
        </div>
      ) : null}
      <EventGroup title="Você organiza" events={owned} />
      <EventGroup title="Onde você respondeu" events={joined} />
    </div>
  );
}

function EventGroup({ title, events }: { title: string; events: EventCard[] }) {
  if (events.length === 0) return null;
  return (
    <section className="mt-8">
      <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-muted">{title}</h2>
      <ul className="mt-3 grid gap-3">
        {events.map((event) => (
          <li key={event.id}>
            <Link
              to={`/e/${event.id}`}
              className="card flex min-h-16 flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="min-w-0">
                <span className="block break-words font-display text-2xl leading-tight">{event.title}</span>
                <span className="mt-1 block break-words text-sm leading-relaxed text-muted">{event.summary}</span>
              </span>
              <span className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
                <span className="rounded-full bg-lilac px-3 py-2 text-sm font-bold text-plum-deep">
                  {event.participants === 1 ? "1 pessoa" : `${event.participants} pessoas`}
                </span>
                <span className="text-sm font-bold text-plum-deep">Abrir</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
