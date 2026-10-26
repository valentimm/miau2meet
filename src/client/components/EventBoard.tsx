import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { Link, useNavigate } from "react-router";
import { api, ApiError } from "../api";
import { bestRanges, formatDayLong, heatColor, peopleLabel, slotKey } from "../../lib/slots";

export type HeatState = {
  counts: Record<string, number>;
  mine: string[];
  people: { id: string; name: string; count: number }[];
};

export type EventDetails = HeatState & {
  event: {
    id: string;
    title: string;
    timezoneLabel: string;
    summary: string;
    ownerName: string;
  };
  days: { date: string; weekday: string; day: string; month: string }[];
  times: string[];
  isOwner: boolean;
  canEdit: boolean;
};

export function EventBoard({ initial }: { initial: EventDetails }) {
  const navigate = useNavigate();
  const [serverCounts, setServerCounts] = useState(initial.counts);
  const [serverMine, setServerMine] = useState(() => new Set(initial.mine));
  const [mine, setMine] = useState(() => new Set(initial.mine));
  const [people, setPeople] = useState(initial.people);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [copied, setCopied] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [removing, setRemoving] = useState(false);
  const dirty = useRef(false);
  const dragging = useRef(false);
  const mode = useRef<"paint" | "erase">("paint");
  const ignoreClick = useRef(false);
  const mineRef = useRef(new Set(initial.mine));
  const saveSeq = useRef(0);

  const counts = useMemo(() => {
    const next: Record<string, number> = { ...serverCounts };
    const slots = new Set<string>([...serverMine, ...mine]);
    for (const slot of slots) {
      const base = serverCounts[slot] ?? 0;
      const had = serverMine.has(slot) ? 1 : 0;
      const has = mine.has(slot) ? 1 : 0;
      const value = base - had + has;
      if (value > 0) next[slot] = value;
      else delete next[slot];
    }
    return next;
  }, [mine, serverCounts, serverMine]);

  const max = Math.max(1, ...Object.values(counts));
  const ranges = bestRanges(counts);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.hidden || dirty.current) return;
      void refresh(false);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [initial.event.id]);

  async function refresh(forceMine: boolean) {
    const data = await api<EventDetails>(`/api/events/${initial.event.id}`);
    setServerCounts(data.counts);
    setServerMine(new Set(data.mine));
    setPeople(data.people);
    if (forceMine || !dirty.current) {
      const next = new Set(data.mine);
      mineRef.current = next;
      setMine(next);
    }
  }

  async function persist(next: Set<string>) {
    const seq = ++saveSeq.current;
    setStatus("saving");
    try {
      const data = await api<HeatState>(`/api/events/${initial.event.id}/availability`, {
        method: "PUT",
        body: JSON.stringify({ slots: [...next] }),
      });
      if (seq !== saveSeq.current) return;
      const saved = new Set(data.mine);
      setServerCounts(data.counts);
      setServerMine(saved);
      setPeople(data.people);
      const local = [...mineRef.current].sort().join("|");
      const remote = [...saved].sort().join("|");
      if (local === remote) dirty.current = false;
      setStatus("saved");
    } catch (reason) {
      if (seq !== saveSeq.current) return;
      setStatus("error");
      if (reason instanceof ApiError && reason.status === 401) setNudge(true);
    }
  }

  function paint(slot: string, nextMode: "paint" | "erase") {
    const next = new Set(mineRef.current);
    if (nextMode === "paint") next.add(slot);
    else next.delete(slot);
    mineRef.current = next;
    dirty.current = true;
    setMine(next);
    return next;
  }

  function onPointerDown(event: PointerEvent<HTMLButtonElement>, slot: string) {
    if (!initial.canEdit) {
      setNudge(true);
      return;
    }
    if (event.button !== 0) return;
    ignoreClick.current = true;
    const nextMode = mine.has(slot) ? "erase" : "paint";
    mode.current = nextMode;
    paint(slot, nextMode);
    if (event.pointerType === "mouse") {
      dragging.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  }

  function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (!dragging.current) return;
    const element = document.elementFromPoint(event.clientX, event.clientY);
    const slot = element?.closest<HTMLElement>("[data-slot]")?.dataset.slot;
    if (slot) paint(slot, mode.current);
  }

  function onPointerUp() {
    if (!initial.canEdit) return;
    const wasDragging = dragging.current;
    dragging.current = false;
    if (wasDragging || ignoreClick.current) void persist(mineRef.current);
  }

  function onClick(slot: string) {
    if (ignoreClick.current) {
      ignoreClick.current = false;
      return;
    }
    if (!initial.canEdit) {
      setNudge(true);
      return;
    }
    const nextMode = mine.has(slot) ? "erase" : "paint";
    const next = paint(slot, nextMode);
    void persist(next);
  }

  async function copyLink() {
    const url = new URL(`/e/${initial.event.id}`, window.location.origin).toString();
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function removeEvent() {
    if (!window.confirm("Apagar este encontro? A grade some para todo mundo.")) return;
    setRemoving(true);
    try {
      await api(`/api/events/${initial.event.id}`, { method: "DELETE" });
      navigate("/eventos");
    } catch (reason) {
      setRemoving(false);
      setStatus("error");
      if (reason instanceof ApiError) window.alert(reason.message);
    }
  }

  const statusLabel =
    status === "saving" ? "Salvando…" : status === "saved" ? "Salvo na grade" : status === "error" ? "Não consegui salvar" : "Toque ou arraste para pintar";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-muted">
            organizado por {initial.event.ownerName}
            {initial.isOwner ? " · você organiza" : ""}
          </p>
          <h1 className="font-display text-4xl sm:text-5xl">{initial.event.title}</h1>
          <p className="mt-2 text-muted">{initial.event.summary}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" onClick={() => void copyLink()}>
            {copied ? "Link copiado" : "Copiar link"}
          </button>
          {initial.isOwner ? (
            <button type="button" className="btn btn-ghost" onClick={() => void removeEvent()} disabled={removing}>
              Apagar
            </button>
          ) : null}
        </div>
      </header>

      {!initial.canEdit ? (
        <p className={`card mt-5 px-4 py-3 text-sm ${nudge ? "ring-2 ring-rose" : ""}`}>
          A grade está aberta para olhar.{" "}
          <Link className="font-bold text-plum-deep" to={`/entrar?next=/e/${initial.event.id}`}>
            Entre
          </Link>{" "}
          para pintar os horários em que você pode.
        </p>
      ) : (
        <p className="mt-5 text-sm text-muted">
          {statusLabel}. No computador, arraste. No celular, toque em cada bloco. A bolinha rosa é o seu horário.
        </p>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="card overflow-auto p-3 sm:p-4" style={{ touchAction: "pan-y" }}>
          <div
            className="grid gap-1"
            style={{
              gridTemplateColumns: `4.5rem repeat(${initial.days.length}, 4.6rem)`,
              width: "max-content",
              minWidth: "100%",
            }}
          >
            <div className="sticky left-0 top-0 z-20 bg-paper" />
            {initial.days.map((day) => (
              <div key={day.date} className="sticky top-0 z-10 bg-paper/95 px-1 py-2 text-center backdrop-blur">
                <div className="text-[11px] font-bold uppercase tracking-wide text-muted">{day.weekday}</div>
                <div className="font-display text-xl leading-none">{day.day}</div>
                <div className="text-[10px] text-muted">{day.month}</div>
              </div>
            ))}
            {initial.times.map((time) => (
              <div key={time} className="contents">
                <div className="sticky left-0 z-10 flex items-center whitespace-nowrap bg-paper/95 pr-2 text-[11px] font-bold tabular-nums text-muted">
                  {time}
                </div>
                {initial.days.map((day) => {
                  const slot = slotKey(day.date, time);
                  const count = counts[slot] ?? 0;
                  const tone = heatColor(count, max);
                  const selected = mine.has(slot);
                  return (
                    <button
                      key={slot}
                      type="button"
                      data-slot={slot}
                      data-mine={selected ? "true" : "false"}
                      className="slot"
                      style={{ background: tone.background, color: tone.color }}
                      aria-pressed={selected}
                      aria-label={`${formatDayLong(day.date)} ${time}, ${peopleLabel(count)}${selected ? ", você marcou" : ""}`}
                      onPointerDown={(event) => onPointerDown(event, slot)}
                      onPointerMove={onPointerMove}
                      onPointerUp={onPointerUp}
                      onClick={() => onClick(slot)}
                    >
                      {count > 0 ? <span className="text-[11px] font-bold tabular-nums">{count}</span> : null}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <section className="card p-4">
            <h2 className="font-bold">Calor da grade</h2>
            <div className="mt-3 h-3 rounded-full bg-gradient-to-r from-paper to-plum-deep" />
            <div className="mt-1 flex justify-between text-xs text-muted">
              <span>ninguém</span>
              <span>muita gente</span>
            </div>
            <button
              type="button"
              className="btn btn-soft mt-4 w-full"
              disabled={!initial.canEdit || mine.size === 0}
              onClick={() => {
                const next = new Set<string>();
                mineRef.current = next;
                dirty.current = true;
                setMine(next);
                void persist(next);
              }}
            >
              Limpar meus horários
            </button>
          </section>

          {initial.isOwner ? (
            <section className="card p-4">
              <h2 className="font-bold">Melhores horários</h2>
              <p className="mt-1 text-xs text-muted">Só você, que organiza, vê este ranking.</p>
              {ranges.length === 0 ? (
                <p className="mt-3 text-sm text-muted">Ainda não dá para ranquear. Espera a galera pintar.</p>
              ) : (
                <ol className="mt-3 space-y-2">
                  {ranges.map((range) => (
                    <li key={`${range.day}-${range.start}`} className="rounded-2xl bg-lilac px-3 py-2 text-sm">
                      <span className="block font-bold">{formatDayLong(range.day)}</span>
                      <span>
                        {range.start}–{range.end} · {peopleLabel(range.count)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          ) : null}

          <section className="card p-4">
            <h2 className="font-bold">Quem já pintou</h2>
            {people.length === 0 ? (
              <p className="mt-3 text-sm text-muted">Ninguém ainda. O link está aí em cima.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {people.map((person) => (
                  <li key={person.id} className="flex items-center justify-between gap-3">
                    <span className="truncate font-bold">{person.name}</span>
                    <span className="text-muted">
                      {person.count === 1 ? "1 horário" : `${person.count} horários`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
