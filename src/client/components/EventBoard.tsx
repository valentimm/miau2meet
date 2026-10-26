import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
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

function slotFromPoint(x: number, y: number): string | null {
  const stack = document.elementsFromPoint(x, y);
  for (const element of stack) {
    if (!(element instanceof Element)) continue;
    const slot = element.closest<HTMLElement>("[data-slot]")?.dataset.slot;
    if (slot) return slot;
  }
  return null;
}

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
  const [gesture, setGesture] = useState<"paint" | "scroll">("paint");
  const [focusSlot, setFocusSlot] = useState<string | null>(null);
  const dirty = useRef(false);
  const dragging = useRef(false);
  const painted = useRef(false);
  const mode = useRef<"paint" | "erase">("paint");
  const ignoreClick = useRef(false);
  const mineRef = useRef(new Set(initial.mine));
  const saveSeq = useRef(0);
  const gridRef = useRef<HTMLDivElement>(null);

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
  const painting = initial.canEdit && gesture === "paint";

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
    const current = mineRef.current;
    if (nextMode === "paint" && current.has(slot)) return current;
    if (nextMode === "erase" && !current.has(slot)) return current;
    const next = new Set(current);
    if (nextMode === "paint") next.add(slot);
    else next.delete(slot);
    mineRef.current = next;
    dirty.current = true;
    setMine(next);
    return next;
  }

  function onPointerDown(event: PointerEvent<HTMLButtonElement>, slot: string) {
    if (event.button !== 0) return;
    if (!initial.canEdit) {
      setNudge(true);
      return;
    }
    if (gesture === "scroll") return;
    ignoreClick.current = true;
    const nextMode = mineRef.current.has(slot) ? "erase" : "paint";
    mode.current = nextMode;
    paint(slot, nextMode);
    painted.current = true;
    dragging.current = true;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      dragging.current = false;
    }
  }

  function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (!dragging.current) return;
    const slot = slotFromPoint(event.clientX, event.clientY);
    if (slot) paint(slot, mode.current);
  }

  function finishGesture(event: PointerEvent<HTMLButtonElement>) {
    if (!painted.current && !dragging.current) return;
    const shouldSave = painted.current;
    painted.current = false;
    dragging.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (shouldSave) void persist(mineRef.current);
    window.setTimeout(() => {
      ignoreClick.current = false;
    }, 0);
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
    const nextMode = mineRef.current.has(slot) ? "erase" : "paint";
    const next = paint(slot, nextMode);
    void persist(next);
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, dayIndex: number, timeIndex: number) {
    const maxDay = initial.days.length - 1;
    const maxTime = initial.times.length - 1;
    let nextDay = dayIndex;
    let nextTime = timeIndex;
    switch (event.key) {
      case "ArrowRight":
        nextDay += 1;
        break;
      case "ArrowLeft":
        nextDay -= 1;
        break;
      case "ArrowDown":
        nextTime += 1;
        break;
      case "ArrowUp":
        nextTime -= 1;
        break;
      case "Home":
        nextDay = 0;
        if (event.ctrlKey || event.metaKey) nextTime = 0;
        break;
      case "End":
        nextDay = maxDay;
        if (event.ctrlKey || event.metaKey) nextTime = maxTime;
        break;
      default:
        return;
    }
    event.preventDefault();
    nextDay = Math.max(0, Math.min(maxDay, nextDay));
    nextTime = Math.max(0, Math.min(maxTime, nextTime));
    const day = initial.days[nextDay];
    const time = initial.times[nextTime];
    if (!day || !time) return;
    const slot = slotKey(day.date, time);
    setFocusSlot(slot);
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-slot="${CSS.escape(slot)}"]`)?.focus();
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
    status === "saving" ? "Salvando…" : status === "saved" ? "Salvo na grade." : status === "error" ? "Não consegui salvar." : "";

  const help = !initial.canEdit
    ? "A grade está aberta para olhar. Entre para pintar os horários em que você pode."
    : painting
      ? "Arraste o dedo pelos blocos para marcar ou apagar. Para rolar, arraste a faixa dos dias ou das horas, ou toque em Rolar. A marca rosa é o seu horário."
      : "Arraste a grade para ver mais dias e horários. Um toque marca só aquele bloco. Os dias ficam fixos no topo.";

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-bold text-muted">
            organizado por {initial.event.ownerName}
            {initial.isOwner ? " · você organiza" : ""}
          </p>
          <h1 className="break-words font-display text-[2rem] leading-tight sm:text-5xl">{initial.event.title}</h1>
          <p className="mt-2 break-words text-muted">{initial.event.summary}</p>
        </div>
        <div className={`grid gap-2 ${initial.isOwner ? "grid-cols-2" : "grid-cols-1"} sm:flex sm:flex-wrap`}>
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

      <div className="mt-5 flex flex-col gap-3">
        {initial.canEdit ? (
          <div role="group" aria-label="Modo do toque" className="gesture-toggle">
            <button
              type="button"
              className={gesture === "paint" ? "btn btn-primary" : "btn btn-ghost"}
              aria-pressed={gesture === "paint"}
              onClick={() => setGesture("paint")}
            >
              Pintar
            </button>
            <button
              type="button"
              className={gesture === "scroll" ? "btn btn-primary" : "btn btn-ghost"}
              aria-pressed={gesture === "scroll"}
              onClick={() => setGesture("scroll")}
            >
              Rolar
            </button>
          </div>
        ) : (
          <div className={`card px-4 py-4 text-sm leading-relaxed ${nudge ? "ring-2 ring-rose" : ""}`}>
            <p>A grade está aberta para olhar. Entre para pintar os horários em que você pode.</p>
            <Link className="btn btn-primary mt-3 w-full sm:w-auto" to={`/entrar?next=/e/${initial.event.id}`}>
              Entrar para pintar
            </Link>
          </div>
        )}
        <p id="grade-ajuda" className="text-sm leading-relaxed text-muted">
          {help}
        </p>
        <div aria-live="polite">
          {statusLabel ? (
            <p className={`text-sm font-bold ${status === "error" ? "text-plum-deep" : "text-muted"}`} role={status === "error" ? "alert" : undefined}>
              {statusLabel}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className={`card grid-scroll min-w-0 p-2 sm:p-3 ${painting ? "is-painting" : ""}`}>
          <div
            ref={gridRef}
            role="grid"
            aria-readonly={!initial.canEdit}
            aria-label={`Disponibilidade de ${initial.event.title}`}
            aria-describedby="grade-ajuda"
            aria-rowcount={initial.times.length + 1}
            aria-colcount={initial.days.length + 1}
            className="availability"
            style={{
              gridTemplateColumns: `var(--time-col) repeat(${initial.days.length}, minmax(var(--slot-min), 1fr))`,
            }}
          >
            <div role="row" className="grid-row" aria-rowindex={1}>
              <div className="corner" aria-hidden="true" />
              {initial.days.map((day, dayIndex) => (
                <div
                  key={day.date}
                  role="columnheader"
                  aria-colindex={dayIndex + 2}
                  aria-label={formatDayLong(day.date)}
                  className="day-head"
                >
                  <div className="text-xs font-bold uppercase tracking-wide text-muted">{day.weekday}</div>
                  <div className="font-display text-2xl leading-none">{day.day}</div>
                  <div className="text-xs text-muted">{day.month}</div>
                </div>
              ))}
            </div>
            {initial.times.map((time, timeIndex) => (
              <div key={time} role="row" className="grid-row" aria-rowindex={timeIndex + 2}>
                <div role="rowheader" className="time-head" aria-colindex={1}>
                  {time}
                </div>
                {initial.days.map((day, dayIndex) => {
                  const slot = slotKey(day.date, time);
                  const count = counts[slot] ?? 0;
                  const tone = heatColor(count, max);
                  const selected = mine.has(slot);
                  const tabStop = focusSlot ? focusSlot === slot : dayIndex === 0 && timeIndex === 0;
                  const who = count === 0 ? "ninguém" : peopleLabel(count);
                  return (
                    <div key={slot} role="gridcell" aria-colindex={dayIndex + 2} className="slot-cell">
                      <button
                        type="button"
                        data-slot={slot}
                        data-mine={selected ? "true" : "false"}
                        className="slot"
                        style={{ background: tone.background, color: tone.color }}
                        aria-pressed={selected}
                        aria-label={`${formatDayLong(day.date)} ${time}, ${who}${selected ? ", você marcou" : ""}`}
                        tabIndex={tabStop ? 0 : -1}
                        onFocus={() => setFocusSlot(slot)}
                        onKeyDown={(event) => onKeyDown(event, dayIndex, timeIndex)}
                        onPointerDown={(event) => onPointerDown(event, slot)}
                        onPointerMove={onPointerMove}
                        onPointerUp={finishGesture}
                        onPointerCancel={finishGesture}
                        onContextMenu={(event) => event.preventDefault()}
                        onClick={() => onClick(slot)}
                      >
                        {count > 0 ? <span className="slot-count">{count}</span> : null}
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start">
          <section className="card p-4">
            <h2 className="font-bold">Calor da grade</h2>
            <div className="mt-3 h-3 rounded-full bg-gradient-to-r from-paper to-plum-deep" />
            <div className="mt-1 flex justify-between text-sm text-muted">
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
              <p className="mt-1 text-sm leading-relaxed text-muted">Só você, que organiza, vê este ranking.</p>
              {ranges.length === 0 ? (
                <p className="mt-3 text-sm text-muted">Ainda não dá para ranquear. Espera a galera pintar.</p>
              ) : (
                <ol className="mt-3 space-y-2">
                  {ranges.map((range) => (
                    <li key={`${range.day}-${range.start}`} className="rounded-2xl bg-lilac px-3 py-3 text-sm leading-relaxed">
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
                  <li key={person.id} className="flex items-start justify-between gap-3">
                    <span className="min-w-0 flex-1 break-words font-bold">{person.name}</span>
                    <span className="shrink-0 text-muted">
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
