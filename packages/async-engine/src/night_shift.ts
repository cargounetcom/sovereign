// TAS12: night window rule — heavy jobs ONLY 23:00-06:00 local time.
// Day = clinic only. Pure function, easy to test.
const NIGHT_START = 23;
const NIGHT_END = 6;

export function isNightNow(now = new Date()): boolean {
  const h = now.getHours();
  return h >= NIGHT_START || h < NIGHT_END;
}

export function canRunHeavy(now = new Date()): boolean {
  return isNightNow(now);
}

export function nextNightWindow(now = new Date()): Date {
  const next = new Date(now);
  if (isNightNow(now)) return next;
  next.setHours(NIGHT_START, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next;
}
