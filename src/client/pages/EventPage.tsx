import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { api, ApiError } from "../api";
import { EventBoard, type EventDetails } from "../components/EventBoard";

export function EventPage() {
  const { id } = useParams();
  const [payload, setPayload] = useState<EventDetails | null>(null);
  const [error, setError] = useState("");
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setPayload(null);
    setError("");
    setMissing(false);
    api<EventDetails>(`/api/events/${id}`)
      .then((data) => {
        if (!cancelled) setPayload(data);
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        if (reason instanceof ApiError && reason.status === 404) {
          setMissing(true);
          return;
        }
        setError(reason instanceof ApiError ? reason.message : "Não deu para abrir a grade.");
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (missing) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-display text-4xl">Esse encontro não existe.</h1>
        <p className="mt-3 text-muted">O link pode ter quebrado, ou alguém apagou a grade.</p>
        <Link to="/" className="btn btn-primary mt-6">
          Voltar ao início
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="font-display text-4xl">A grade não abriu.</h1>
        <p className="mt-3 text-muted">{error}</p>
      </div>
    );
  }

  if (!payload) return <p className="px-4 py-16 text-center text-muted">Abrindo a grade…</p>;
  return <EventBoard key={payload.event.id} initial={payload} />;
}
