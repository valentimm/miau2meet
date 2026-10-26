import assert from "node:assert/strict";
import test from "node:test";
import {
  bestRanges,
  buildSlots,
  filterSlots,
  heatColor,
  validateEventInput,
} from "./slots.ts";

const base = {
  title: "Café com a galera",
  timezone: "America/Sao_Paulo",
  startDate: "2026-10-27",
  endDate: "2026-10-28",
  startHour: 9,
  endHour: 11,
};

test("builds 30-minute slots inside the window", () => {
  const slots = buildSlots(base);
  assert.deepEqual(slots, [
    "2026-10-27T09:00",
    "2026-10-27T09:30",
    "2026-10-27T10:00",
    "2026-10-27T10:30",
    "2026-10-28T09:00",
    "2026-10-28T09:30",
    "2026-10-28T10:00",
    "2026-10-28T10:30",
  ]);
});

test("rejects a range longer than 14 days and an inverted window", () => {
  const longRange = validateEventInput({ ...base, endDate: "2026-11-20" });
  assert.equal(longRange.ok, false);
  if (!longRange.ok) assert.match(longRange.errors.endDate ?? "", /14/);

  const inverted = validateEventInput({ ...base, startHour: 18, endHour: 9 });
  assert.equal(inverted.ok, false);
});

test("drops unknown slots and accepts only the event grid", () => {
  const parsed = validateEventInput(base);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.deepEqual(filterSlots(parsed.value, ["2026-10-27T09:00", "2026-10-27T09:00"]), [
    "2026-10-27T09:00",
  ]);
  assert.equal(filterSlots(parsed.value, ["2026-10-27T08:00"]), null);
  assert.equal(filterSlots(parsed.value, "manhã"), null);
});

test("merges adjacent equal counts and keeps days apart", () => {
  const ranges = bestRanges({
    "2026-10-27T09:00": 3,
    "2026-10-27T09:30": 3,
    "2026-10-27T10:00": 1,
    "2026-10-28T09:00": 3,
  });
  assert.equal(ranges[0]?.count, 3);
  assert.equal(ranges[0]?.start, "09:00");
  assert.equal(ranges[0]?.end, "10:00");
  assert.equal(ranges[0]?.day, "2026-10-27");
  assert.equal(ranges.find((range) => range.count === 1)?.start, "10:00");
  assert.equal(ranges.filter((range) => range.day === "2026-10-28").length, 1);
});

function cssToRgb(color: string): [number, number, number] {
  if (color.startsWith("#")) {
    const value = Number.parseInt(color.slice(1), 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  }
  const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  assert.ok(match, color);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function contrast(foreground: string, background: string): number {
  const channel = (value: number) => {
    const ratio = value / 255;
    return ratio <= 0.04045 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
  };
  const luminance = (color: string) => {
    const [red, green, blue] = cssToRgb(color).map(channel);
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

test("keeps an empty cell on the cream paper", () => {
  assert.equal(heatColor(0, 4).background, "#fffaf4");
  assert.notEqual(heatColor(4, 4).background, heatColor(1, 4).background);
});

test("keeps heat numerals at WCAG AA contrast", () => {
  for (const max of [1, 2, 3, 4, 6, 8, 12]) {
    for (let count = 0; count <= max; count += 1) {
      const tone = heatColor(count, max);
      const ratio = contrast(tone.color, tone.background);
      assert.ok(ratio >= 4.5, `${count}/${max} ${tone.color} on ${tone.background} = ${ratio.toFixed(2)}`);
    }
  }
});
