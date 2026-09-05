import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  clampDate,
  dayOfWeek,
  daysBetween,
  daysInMonth,
  daysInclusive,
  endOfMonth,
  endOfWeek,
  endOfYear,
  fromExcelSerial,
  isIsoDate,
  monthLabel,
  parseIso,
  startOfMonth,
  startOfWeek,
  startOfYear,
  toIso,
} from "../src/lib/capyexpense/dates";

describe("isIsoDate", () => {
  it("accepts real calendar days", () => {
    expect(isIsoDate("2026-09-05")).toBe(true);
    expect(isIsoDate("2024-02-29")).toBe(true); // leap year
  });

  it("rejects shapes and impossible days", () => {
    expect(isIsoDate("2026-2-5")).toBe(false);
    expect(isIsoDate("2026-02-31")).toBe(false);
    expect(isIsoDate("2025-02-29")).toBe(false); // not a leap year
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("05/09/2026")).toBe(false);
    expect(isIsoDate(45000)).toBe(false);
    expect(isIsoDate(null)).toBe(false);
  });
});

describe("parse / format round trip", () => {
  it("survives every day of a DST-transition week in both hemispheres", () => {
    // UK springs forward 29 Mar 2026; much of the US on 8 Mar 2026. Parsing at
    // UTC noon means neither can shift the calendar day.
    for (const start of ["2026-03-06", "2026-03-27"]) {
      for (let i = 0; i < 7; i++) {
        const d = addDays(start, i);
        expect(toIso(parseIso(d))).toBe(d);
      }
    }
  });

  it("anchors at noon so a local-time read cannot drift a day", () => {
    expect(new Date(parseIso("2026-09-05")).getUTCHours()).toBe(12);
  });

  it("returns NaN rather than a wrong date for malformed input", () => {
    expect(parseIso("not-a-date")).toBeNaN();
  });
});

describe("addDays", () => {
  it("crosses month and year boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
  });

  it("crosses a leap day", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2028-02-29", 1)).toBe("2028-03-01");
  });
});

describe("addMonths clamping", () => {
  it("clamps to the shorter month instead of overflowing", () => {
    // The comparison logic depends on this: 31 Mar back one month must land in
    // February, not spill into March.
    expect(addMonths("2026-03-31", -1)).toBe("2026-02-28");
    expect(addMonths("2028-03-31", -1)).toBe("2028-02-29");
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2026-05-31", 1)).toBe("2026-06-30");
  });

  it("moves whole years", () => {
    expect(addMonths("2026-09-05", -12)).toBe("2025-09-05");
    expect(addMonths("2026-09-05", 12)).toBe("2027-09-05");
  });

  it("wraps backwards past January", () => {
    expect(addMonths("2026-01-15", -1)).toBe("2025-12-15");
    expect(addMonths("2026-01-15", -13)).toBe("2024-12-15");
  });

  it("keeps a mid-month day untouched", () => {
    expect(addMonths("2026-03-14", -1)).toBe("2026-02-14");
  });
});

describe("week boundaries", () => {
  // 2026-09-05 is a Saturday.
  it("knows the day of week", () => {
    expect(dayOfWeek("2026-09-05")).toBe(6);
    expect(dayOfWeek("2026-09-06")).toBe(0);
  });

  it("starts the week on Monday when asked", () => {
    expect(startOfWeek("2026-09-05", 1)).toBe("2026-08-31");
    expect(endOfWeek("2026-09-05", 1)).toBe("2026-09-06");
  });

  it("starts the week on Sunday when asked", () => {
    expect(startOfWeek("2026-09-05", 0)).toBe("2026-08-30");
    expect(endOfWeek("2026-09-05", 0)).toBe("2026-09-05");
  });

  it("is a no-op on a day that already starts the week", () => {
    expect(startOfWeek("2026-08-31", 1)).toBe("2026-08-31");
    expect(startOfWeek("2026-08-30", 0)).toBe("2026-08-30");
  });

  it("crosses a year boundary", () => {
    // 1 Jan 2027 is a Friday; its Monday is 28 Dec 2026.
    expect(startOfWeek("2027-01-01", 1)).toBe("2026-12-28");
  });
});

describe("month and year boundaries", () => {
  it("finds the edges of a month", () => {
    expect(startOfMonth("2026-09-05")).toBe("2026-09-01");
    expect(endOfMonth("2026-09-05")).toBe("2026-09-30");
    expect(endOfMonth("2026-02-10")).toBe("2026-02-28");
    expect(endOfMonth("2028-02-10")).toBe("2028-02-29");
  });

  it("finds the edges of a year", () => {
    expect(startOfYear("2026-09-05")).toBe("2026-01-01");
    expect(endOfYear("2026-09-05")).toBe("2026-12-31");
  });

  it("counts days in a month", () => {
    expect(daysInMonth(2026, 1)).toBe(28);
    expect(daysInMonth(2028, 1)).toBe(29);
    expect(daysInMonth(2026, 8)).toBe(30);
  });
});

describe("day counting", () => {
  it("measures gaps, signed", () => {
    expect(daysBetween("2026-09-01", "2026-09-05")).toBe(4);
    expect(daysBetween("2026-09-05", "2026-09-01")).toBe(-4);
    expect(daysBetween("2026-09-05", "2026-09-05")).toBe(0);
  });

  it("counts an inclusive span, so a single day is 1", () => {
    expect(daysInclusive("2026-09-05", "2026-09-05")).toBe(1);
    expect(daysInclusive("2026-09-01", "2026-09-30")).toBe(30);
  });

  it("counts across a leap year correctly", () => {
    expect(daysInclusive("2028-01-01", "2028-12-31")).toBe(366);
    expect(daysInclusive("2026-01-01", "2026-12-31")).toBe(365);
  });
});

describe("clampDate", () => {
  it("pins to the window", () => {
    expect(clampDate("2026-09-05", "2026-09-01", "2026-09-30")).toBe("2026-09-05");
    expect(clampDate("2026-08-01", "2026-09-01", "2026-09-30")).toBe("2026-09-01");
    expect(clampDate("2026-10-01", "2026-09-01", "2026-09-30")).toBe("2026-09-30");
  });
});

describe("fromExcelSerial", () => {
  it("handles the 1900 system either side of the phantom leap day", () => {
    // Excel kept Lotus 1-2-3's bug: it thinks 1900 was a leap year.
    expect(fromExcelSerial(1)).toBe("1900-01-01");
    expect(fromExcelSerial(59)).toBe("1900-02-28");
    expect(fromExcelSerial(60)).toBeNull(); // 29 Feb 1900 never existed
    expect(fromExcelSerial(61)).toBe("1900-03-01");
  });

  it("converts a modern serial", () => {
    expect(fromExcelSerial(45000)).toBe("2023-03-15");
    expect(fromExcelSerial(46266)).toBe("2026-09-01");
  });

  it("truncates a serial carrying a time fraction", () => {
    expect(fromExcelSerial(46266.75)).toBe("2026-09-01");
  });

  it("handles the 1904 Mac epoch", () => {
    expect(fromExcelSerial(0, true)).toBe("1904-01-01");
    expect(fromExcelSerial(1, true)).toBe("1904-01-02");
  });

  it("rejects nonsense instead of inventing a date", () => {
    expect(fromExcelSerial(0)).toBeNull();
    expect(fromExcelSerial(-5)).toBeNull();
    expect(fromExcelSerial(Number.NaN)).toBeNull();
  });
});

describe("monthLabel", () => {
  it("gives the mono axis tick", () => {
    expect(monthLabel("2026-09-05")).toBe("SEP");
    expect(monthLabel("2026-01-01")).toBe("JAN");
    expect(monthLabel("2026-12-31")).toBe("DEC");
  });
});
