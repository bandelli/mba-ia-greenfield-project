import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { formatDuration, formatRelativeTime, resolvePageParam } from "../utils"

describe("formatRelativeTime", () => {
  const NOW = new Date("2026-09-12T12:00:00.000Z")

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("formats a simple past minute offset", () => {
    expect(formatRelativeTime("2026-09-12T11:15:00.000Z")).toBe("45 minutes ago")
  })

  it("formats a simple past day offset", () => {
    expect(formatRelativeTime("2026-09-10T12:00:00.000Z")).toBe("2 days ago")
  })

  it("formats a future offset", () => {
    expect(formatRelativeTime("2026-09-12T12:05:00.000Z")).toBe("in 5 minutes")
  })

  it("bumps 59m59s to '1 hour ago' instead of '60 minutes ago'", () => {
    expect(formatRelativeTime("2026-09-12T11:00:01.000Z")).toBe("1 hour ago")
  })

  it("bumps 6d23h58m to a 1-week offset instead of '7 days ago'", () => {
    // `numeric: "auto"` renders exactly ±1 week as the "last week" idiom
    // rather than "1 week ago" — the bug this guards against is landing on
    // "7 days ago" (the wrong unit), not this wording choice.
    expect(formatRelativeTime("2026-09-05T12:02:00.000Z")).toBe("last week")
  })

  it("does not bump when rounding stays within the selected unit", () => {
    expect(formatRelativeTime("2026-09-12T05:00:00.000Z")).toBe("7 hours ago")
  })
})

describe("formatDuration", () => {
  it("formats sub-hour durations as m:ss", () => {
    expect(formatDuration(860)).toBe("14:20")
  })

  it("pads single-digit seconds", () => {
    expect(formatDuration(65)).toBe("1:05")
  })

  it("formats hour-plus durations as h:mm:ss", () => {
    expect(formatDuration(3922)).toBe("1:05:22")
  })

  it("formats exactly zero as 0:00", () => {
    expect(formatDuration(0)).toBe("0:00")
  })
})

describe("resolvePageParam", () => {
  it("defaults to 1 when undefined", () => {
    expect(resolvePageParam(undefined)).toBe(1)
  })

  it("defaults to 1 for non-numeric input", () => {
    expect(resolvePageParam("abc")).toBe(1)
  })

  it("clamps negative values to 1", () => {
    expect(resolvePageParam("-1")).toBe(1)
  })

  it("clamps zero to 1", () => {
    expect(resolvePageParam("0")).toBe(1)
  })

  it("clamps fractional values to 1", () => {
    expect(resolvePageParam("1.5")).toBe(1)
  })

  it("passes through a valid positive integer", () => {
    expect(resolvePageParam("3")).toBe(3)
  })
})
