import { dequeue, pendingCount } from './queue.js';
import { isNightNow } from './night_shift.js';
import type { Job, JobHandler, JobResult, JobKind } from './types.js';

// TAS12: routes jobs to handlers. Heavy jobs outside night window are
// deferred (returned as skipped), never run. Day = clinic only.
const handlers = new Map<JobKind, JobHandler>();

export function registerHandler(kind: JobKind, fn: JobHandler): void {
  handlers.set(kind, fn);
}

export interface RouteOutcome {
  ran: JobResult[];
  deferred: Job[];
}

export async function routeAll(now = new Date()): Promise<RouteOutcome> {
  const ran: JobResult[] = [];
  const deferred: Job[] = [];
  const night = isNightNow(now);

  while (pendingCount() > 0) {
    const job = dequeue()!;
    if (job.heavy && !night) {
      deferred.push(job);
      continue;
    }
    const fn = handlers.get(job.kind);
    if (!fn) {
      ran.push({ jobId: job.id, ok: false, finishedAt: new Date().toISOString(), detail: 'no handler for ' + job.kind });
      continue;
    }
    try {
      const detail = await fn(job);
      ran.push({ jobId: job.id, ok: true, finishedAt: new Date().toISOString(), detail });
    } catch (err) {
      ran.push({ jobId: job.id, ok: false, finishedAt: new Date().toISOString(), detail: String(err) });
    }
  }
  return { ran, deferred };
}
