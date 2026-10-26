export const MAX_RANGE_DAYS = 14;
export const DEFAULT_TIMEZONE = "America/Sao_Paulo";

export const TIMEZONES = [
  { id: "America/Sao_Paulo", label: "Brasília (São Paulo)" },
  { id: "America/Manaus", label: "Manaus" },
  { id: "America/Cuiaba", label: "Cuiabá" },
  { id: "America/Belem", label: "Belém" },
  { id: "America/Fortaleza", label: "Fortaleza" },
  { id: "America/Recife", label: "Recife" },
  { id: "America/Bahia", label: "Salvador" },
  { id: "America/Noronha", label: "Fernando de Noronha" },
  { id: "America/Rio_Branco", label: "Rio Branco" },
  { id: "America/Porto_Velho", label: "Porto Velho" },
  { id: "America/Boa_Vista", label: "Boa Vista" },
  { id: "UTC", label: "UTC" },
] as const;

const TIMEZONE_IDS = new Set<string>(TIMEZONES.map((zone) => zone.id));
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SLOT_PATTERN = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/;

export type EventInput = {
  title: string;
  timezone: string;
  startDate: string;
  endDate: string;
  startHour: number;
  endHour: number;
};

export type FieldErrors = Partial<Record<keyof EventInput, string>>;

export type BestRange = {
  day: string;
  start: string;
  end: string;
  count: number;
  slots: number;
};

export type DayColumn = {
  date: string;
  weekday: string;
  day: string;
  month: string;
};

export function timezoneLabel(id: string): string {
  return TIMEZONES.find((zone) => zone.id === id)?.label ?? id;
}

export function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

export function parseDate(value: string): Date | null {
  if (!DATE_PATTERN.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

export function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function shiftDate(iso: string, days: number): string {
  const date = parseDate(iso);
  if (!date) return iso;
  date.setUTCDate(date.getUTCDate() + days);
  return formatIsoDate(date);
}

export function todayInTimezone(timeZone: string, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function eachDate(start: string, end: string): string[] {
  const first = parseDate(start);
  const last = parseDate(end);
  if (!first || !last || first > last) return [];
  const days: string[] = [];
  const cursor = new Date(first);
  while (cursor <= last && days.length <= MAX_RANGE_DAYS) {
    days.push(formatIsoDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

export function dayColumn(iso: string): DayColumn {
  const date = parseDate(iso);
  if (!date) return { date: iso, weekday: "", day: "", month: "" };
  const weekday = new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    timeZone: "UTC",
  })
    .format(date)
    .replace(".", "");
  const month = new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    timeZone: "UTC",
  })
    .format(date)
    .replace(".", "");
  return { date: iso, weekday, day: String(date.getUTCDate()), month };
}

export function formatDayLong(iso: string): string {
  const column = dayColumn(iso);
  if (!column.weekday) return iso;
  return `${column.weekday}, ${column.day} ${column.month}`;
}

export function buildTimes(startHour: number, endHour: number): string[] {
  const times: string[] = [];
  for (let hour = startHour; hour < endHour; hour += 1) {
    times.push(`${String(hour).padStart(2, "0")}:00`);
    times.push(`${String(hour).padStart(2, "0")}:30`);
  }
  return times;
}

export function slotKey(day: string, time: string): string {
  return `${day}T${time}`;
}

export function buildSlots(input: Pick<EventInput, "startDate" | "endDate" | "startHour" | "endHour">): string[] {
  const slots: string[] = [];
  for (const day of eachDate(input.startDate, input.endDate)) {
    for (const time of buildTimes(input.startHour, input.endHour)) {
      slots.push(slotKey(day, time));
    }
  }
  return slots;
}

export function addMinutes(time: string, minutes: number): string {
  const [hour, minute] = time.split(":").map(Number);
  const total = hour * 60 + minute + minutes;
  const nextHour = Math.floor(total / 60);
  const nextMinute = total % 60;
  return `${String(nextHour).padStart(2, "0")}:${String(nextMinute).padStart(2, "0")}`;
}

export function describeWindow(input: Pick<EventInput, "startDate" | "endDate" | "startHour" | "endHour" | "timezone">): string {
  const dates =
    input.startDate === input.endDate
      ? formatDayLong(input.startDate)
      : `${formatDayLong(input.startDate)} – ${formatDayLong(input.endDate)}`;
  return `${dates} · ${hourLabel(input.startHour)}–${hourLabel(input.endHour)} · ${timezoneLabel(input.timezone)}`;
}

function readHour(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && /^\d{1,2}$/.test(value)) return Number(value);
  return null;
}

export function validateEventInput(input: unknown): { ok: true; value: EventInput } | { ok: false; errors: FieldErrors } {
  const source = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const errors: FieldErrors = {};
  const title = typeof source.title === "string" ? source.title.trim().replace(/\s+/g, " ") : "";
  if (!title) errors.title = "Dá um nome para o encontro.";
  else if (title.length > 80) errors.title = "O título pode ter no máximo 80 caracteres.";

  const timezone = typeof source.timezone === "string" ? source.timezone : "";
  if (!TIMEZONE_IDS.has(timezone)) errors.timezone = "Escolhe um fuso da lista.";

  const startDate = typeof source.startDate === "string" ? source.startDate : "";
  const endDate = typeof source.endDate === "string" ? source.endDate : "";
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (!start) errors.startDate = "Data inicial inválida.";
  if (!end) errors.endDate = "Data final inválida.";
  if (start && end && start > end) errors.endDate = "A data final precisa ser igual ou depois da inicial.";
  if (start && end && start <= end) {
    const span = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
    if (span > MAX_RANGE_DAYS) errors.endDate = `A grade cabe em até ${MAX_RANGE_DAYS} dias.`;
  }

  const startHour = readHour(source.startHour);
  const endHour = readHour(source.endHour);
  if (startHour === null || startHour < 0 || startHour > 23) errors.startHour = "Hora inicial inválida.";
  if (endHour === null || endHour < 1 || endHour > 24) errors.endHour = "Hora final inválida.";
  if (
    startHour !== null &&
    endHour !== null &&
    !errors.startHour &&
    !errors.endHour &&
    startHour >= endHour
  ) {
    errors.endHour = "O fim precisa ser depois do começo.";
  }

  if (Object.keys(errors).length > 0 || startHour === null || endHour === null) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: { title, timezone, startDate, endDate, startHour, endHour },
  };
}

export function filterSlots(input: EventInput, slots: unknown): string[] | null {
  if (!Array.isArray(slots)) return null;
  const allowed = new Set(buildSlots(input));
  const chosen = new Set<string>();
  for (const slot of slots) {
    if (typeof slot !== "string" || !SLOT_PATTERN.test(slot) || !allowed.has(slot)) return null;
    chosen.add(slot);
  }
  return [...chosen].sort();
}

export function bestRanges(counts: Record<string, number>, limit = 4): BestRange[] {
  const keys = Object.keys(counts)
    .filter((key) => (counts[key] ?? 0) > 0)
    .sort();
  const ranges: BestRange[] = [];
  for (const key of keys) {
    const count = counts[key] ?? 0;
    const [day, time] = key.split("T");
    if (!day || !time) continue;
    const last = ranges[ranges.length - 1];
    if (last && last.day === day && last.count === count && last.end === time) {
      last.end = addMinutes(time, 30);
      last.slots += 1;
      continue;
    }
    ranges.push({ day, start: time, end: addMinutes(time, 30), count, slots: 1 });
  }
  return ranges
    .sort(
      (a, b) =>
        b.count - a.count ||
        b.slots - a.slots ||
        a.day.localeCompare(b.day) ||
        a.start.localeCompare(b.start),
    )
    .slice(0, limit);
}

const INK = "#2a2233";
const PAPER = "#fffaf4";
const INK_RGB = [0x2a, 0x22, 0x33] as const;
const PAPER_RGB = [0xff, 0xfa, 0xf4] as const;
const PLUM_RGB = [0x4c, 0x34, 0x8f] as const;

function srgbChannel(value: number): number {
  const channel = value / 255;
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(rgb: readonly number[]): number {
  const [red, green, blue] = rgb.map(srgbChannel);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(a: number, b: number): number {
  const lighter = Math.max(a, b);
  const darker = Math.min(a, b);
  return (lighter + 0.05) / (darker + 0.05);
}

const INK_L = relativeLuminance(INK_RGB);
const PAPER_L = relativeLuminance(PAPER_RGB);

function mixHeat(amount: number): [number, number, number] {
  return [0, 1, 2].map((index) =>
    Math.round(PAPER_RGB[index] + (PLUM_RGB[index] - PAPER_RGB[index]) * amount),
  ) as [number, number, number];
}

function readableHeat(amount: number): { rgb: [number, number, number]; color: string } {
  const rated = (rgb: [number, number, number]) => {
    const luminance = relativeLuminance(rgb);
    const ink = contrastRatio(luminance, INK_L);
    const paper = contrastRatio(luminance, PAPER_L);
    return paper > ink ? { ratio: paper, color: PAPER } : { ratio: ink, color: INK };
  };

  let rgb = mixHeat(amount);
  let best = rated(rgb);
  if (best.ratio >= 4.5) return { rgb, color: best.color };

  // Mid-plum is too light for cream text and too dark for ink. Step away from
  // that valley so the numeral stays at least WCAG AA.
  for (let step = 1; step <= 20; step += 1) {
    const delta = step / 100;
    const candidates = [amount - delta, amount + delta].filter((value) => value >= 0 && value <= 1);
    let chosen: { rgb: [number, number, number]; color: string; ratio: number } | null = null;
    for (const candidate of candidates) {
      const next = mixHeat(candidate);
      const score = rated(next);
      if (!chosen || score.ratio > chosen.ratio) chosen = { rgb: next, color: score.color, ratio: score.ratio };
    }
    if (chosen && chosen.ratio >= 4.5) return { rgb: chosen.rgb, color: chosen.color };
  }

  return { rgb, color: best.color };
}

export function heatColor(count: number, max: number): { background: string; color: string } {
  if (count <= 0 || max <= 0) return { background: PAPER, color: INK };
  const tone = readableHeat(Math.min(1, count / max));
  return {
    background: `rgb(${tone.rgb[0]}, ${tone.rgb[1]}, ${tone.rgb[2]})`,
    color: tone.color,
  };
}

export function peopleLabel(count: number): string {
  return count === 1 ? "1 pessoa" : `${count} pessoas`;
}
