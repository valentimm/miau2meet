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
    <div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
      <h1 className="break-words font-display text-[2rem] leading-tight sm:text-5xl">Novo encontro</h1>
      <p className="mt-2 text-muted">A grade usa blocos de 30 minutos, em até 14 dias.</p>
      <form onSubmit={(event) => void onSubmit(event)} className="card mt-6 grid min-w-0 gap-4 p-4 sm:p-7">
        <label className="field">
          <span>Título</span>
          <input
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={80}
            placeholder="Almoço de sexta"
            required
            autoComplete="off"
            autoCapitalize="sentences"
            enterKeyHint="next"
            inputMode="text"
            aria-invalid={errors.title ? true : undefined}
            aria-describedby={errors.title ? "erro-titulo" : undefined}
          />
          {errors.title ? (
            <em id="erro-titulo" role="alert" className="text-sm font-bold not-italic text-plum-deep">
              {errors.title}
            </em>
          ) : null}
        </label>
        <label className="field">
          <span>Fuso horário</span>
          <select
            name="timezone"
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
            aria-invalid={errors.timezone ? true : undefined}
            aria-describedby={errors.timezone ? "erro-fuso" : undefined}
          >
            {TIMEZONES.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.label}
              </option>
            ))}
          </select>
          {errors.timezone ? (
            <em id="erro-fuso" role="alert" className="text-sm font-bold not-italic text-plum-deep">
              {errors.timezone}
            </em>
          ) : null}
        </label>
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          <label className="field">
            <span>Do dia</span>
            <input
              name="startDate"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              required
              autoComplete="off"
              aria-invalid={errors.startDate ? true : undefined}
              aria-describedby={errors.startDate ? "erro-inicio" : undefined}
            />
            {errors.startDate ? (
              <em id="erro-inicio" role="alert" className="text-sm font-bold not-italic text-plum-deep">
                {errors.startDate}
              </em>
            ) : null}
          </label>
          <label className="field">
            <span>Até o dia</span>
            <input
              name="endDate"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              required
              autoComplete="off"
              aria-invalid={errors.endDate ? true : undefined}
              aria-describedby={errors.endDate ? "erro-fim" : undefined}
            />
            {errors.endDate ? (
              <em id="erro-fim" role="alert" className="text-sm font-bold not-italic text-plum-deep">
                {errors.endDate}
              </em>
            ) : null}
          </label>
          <label className="field">
            <span>Das</span>
            <select
              name="startHour"
              value={startHour}
              onChange={(event) => setStartHour(Number(event.target.value))}
              aria-invalid={errors.startHour ? true : undefined}
              aria-describedby={errors.startHour ? "erro-hora-inicio" : undefined}
            >
              {Array.from({ length: 24 }, (_, hour) => (
                <option key={hour} value={hour}>
                  {hourLabel(hour)}
                </option>
              ))}
            </select>
            {errors.startHour ? (
              <em id="erro-hora-inicio" role="alert" className="text-sm font-bold not-italic text-plum-deep">
                {errors.startHour}
              </em>
            ) : null}
          </label>
          <label className="field">
            <span>Até</span>
            <select
              name="endHour"
              value={endHour}
              onChange={(event) => setEndHour(Number(event.target.value))}
              aria-invalid={errors.endHour ? true : undefined}
              aria-describedby={errors.endHour ? "erro-hora-fim" : undefined}
            >
              {Array.from({ length: 24 }, (_, index) => index + 1).map((hour) => (
                <option key={hour} value={hour}>
                  {hourLabel(hour)}
                </option>
              ))}
            </select>
            {errors.endHour ? (
              <em id="erro-hora-fim" role="alert" className="text-sm font-bold not-italic text-plum-deep">
                {errors.endHour}
              </em>
            ) : null}
          </label>
        </div>
        {message ? (
          <p role="alert" className="text-sm font-bold leading-relaxed text-plum-deep">
            {message}
          </p>
        ) : null}
        <button type="submit" className="btn btn-primary w-full" disabled={saving} aria-busy={saving}>
          {saving ? "Abrindo a grade…" : "Abrir a grade"}
        </button>
      </form>
    </div>
  );
}
