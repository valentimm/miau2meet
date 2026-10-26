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

test("keeps an empty cell on the cream paper", () => {
  assert.equal(heatColor(0, 4).background, "#fffaf4");
  assert.notEqual(heatColor(4, 4).background, heatColor(1, 4).background);
});
