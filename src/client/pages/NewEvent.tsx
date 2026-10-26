import { useMemo, useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router";
import { api, ApiError } from "../api";
import { useViewer } from "../components/Shell";
import {
  DEFAULT_TIMEZONE,
  hourLabel,
  shiftDate,
  todayInTimezone,
  TIMEZONES,
  validateEventInput,
  type FieldErrors,
} from "../../lib/slots";

export function NewEventPage() {
  const { pending, user } = useViewer();
  const navigate = useNavigate();
  const today = useMemo(() => todayInTimezone(DEFAULT_TIMEZONE), []);
  const [title, setTitle] = useState("");
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(shiftDate(today, 2));
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(18);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  if (pending) return <p className="px-4 py-16 text-center text-muted">Preparando o formulário…</p>;
  if (!user) return <Navigate to="/entrar?next=/eventos/novo" replace />;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = validateEventInput({ title, timezone, startDate, endDate, startHour, endHour });
    if (!parsed.ok) {
      setErrors(parsed.errors);
      setMessage("Confere os campos antes de abrir a grade.");
      return;
    }
    setErrors({});
    setMessage("");
    setSaving(true);
    try {
      const created = await api<{ id: string }>("/api/events", {
        method: "POST",
        body: JSON.stringify(parsed.value),
      });
      navigate(`/e/${created.id}`);
    } catch (reason) {
      setSaving(false);
      if (reason instanceof ApiError) {
        if (reason.fields) setErrors(reason.fields as FieldErrors);
        setMessage(reason.message);
        return;
      }
      setMessage("Não consegui criar o encontro.");
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-display text-5xl">Novo encontro</h1>
      <p className="mt-2 text-muted">A grade usa blocos de 30 minutos, em até 14 dias.</p>
      <form onSubmit={(event) => void onSubmit(event)} className="card mt-6 grid gap-4 p-5 sm:p-7">
        <label className="field">
          <span>Título</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} placeholder="Almoço de sexta" required />
          {errors.title ? <em className="text-sm font-bold not-italic text-plum-deep">{errors.title}</em> : null}
        </label>
        <label className="field">
          <span>Fuso horário</span>
          <select value={timezone} onChange={(event) => setTimezone(event.target.value)}>
            {TIMEZONES.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.label}
              </option>
            ))}
          </select>
          {errors.timezone ? <em className="text-sm font-bold not-italic text-plum-deep">{errors.timezone}</em> : null}
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="field">
            <span>Do dia</span>
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
            {errors.startDate ? <em className="text-sm font-bold not-italic text-plum-deep">{errors.startDate}</em> : null}
          </label>
          <label className="field">
            <span>Até o dia</span>
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} required />
            {errors.endDate ? <em className="text-sm font-bold not-italic text-plum-deep">{errors.endDate}</em> : null}
          </label>
          <label className="field">
            <span>Das</span>
            <select value={startHour} onChange={(event) => setStartHour(Number(event.target.value))}>
              {Array.from({ length: 24 }, (_, hour) => (
                <option key={hour} value={hour}>
                  {hourLabel(hour)}
                </option>
              ))}
            </select>
            {errors.startHour ? <em className="text-sm font-bold not-italic text-plum-deep">{errors.startHour}</em> : null}
          </label>
          <label className="field">
            <span>Até</span>
            <select value={endHour} onChange={(event) => setEndHour(Number(event.target.value))}>
              {Array.from({ length: 24 }, (_, index) => index + 1).map((hour) => (
                <option key={hour} value={hour}>
                  {hourLabel(hour)}
                </option>
              ))}
            </select>
            {errors.endHour ? <em className="text-sm font-bold not-italic text-plum-deep">{errors.endHour}</em> : null}
          </label>
        </div>
        {message ? <p className="text-sm font-bold text-plum-deep">{message}</p> : null}
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Abrindo a grade…" : "Abrir a grade"}
        </button>
      </form>
    </div>
  );
}
