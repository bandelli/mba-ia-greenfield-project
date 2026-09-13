import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "display",
            "h1",
            "h2",
            "h3",
            "body-lg",
            "body-md",
            "caption",
            "label-md",
            "label-lg",
            "label-xl",
            "label-2xl",
            "helper",
            "overlay",
          ],
        },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const RELATIVE_TIME_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["week", 60 * 60 * 24 * 7],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
]

const relativeTimeFormat = new Intl.RelativeTimeFormat("en", { numeric: "auto" })

export function formatRelativeTime(isoDate: string): string {
  const elapsedSeconds = (new Date(isoDate).getTime() - Date.now()) / 1000

  let index = RELATIVE_TIME_UNITS.findIndex(
    ([, secondsInUnit]) => Math.abs(elapsedSeconds) >= secondsInUnit
  )
  if (index === -1) index = RELATIVE_TIME_UNITS.length - 1

  let [unit, secondsInUnit] = RELATIVE_TIME_UNITS[index]
  let rounded = Math.round(elapsedSeconds / secondsInUnit)

  // Rounding can push the magnitude up to the next larger unit's threshold
  // (e.g. 59m59s ago rounds to "60 minutes", which should read "1 hour ago") —
  // walk up to the larger unit whenever that happens.
  while (
    index > 0 &&
    Math.abs(rounded) * secondsInUnit >= RELATIVE_TIME_UNITS[index - 1][1]
  ) {
    index -= 1
    ;[unit, secondsInUnit] = RELATIVE_TIME_UNITS[index]
    rounded = Math.round(elapsedSeconds / secondsInUnit)
  }

  return relativeTimeFormat.format(rounded, unit)
}

// Parses a `?page=` search param into a positive integer, defaulting/clamping
// to 1 for anything else (missing, non-numeric, negative, fractional, `0`).
// `Number(x) || 1` alone lets negative/fractional values through unclamped
// (e.g. `Number("-1") || 1` is `-1`, since -1 is truthy).
export function resolvePageParam(value: string | undefined): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : 1
}

// "14:20" / "1:05:22" — matches the duration badge format shown in Figma.
export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.floor(totalSeconds % 60)

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}
