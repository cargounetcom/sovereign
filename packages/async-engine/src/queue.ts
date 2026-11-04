import type { Job, JobResult } from './types.js';

// TAS12: in-memory FIFO queue. No persistence, no DB.
// Heavy jobs are refused outside the night window — see night_shift.ts.
const queue: Job[] = [];
let seq = 0;

export function enqueue(kind: Job['kind'], clinicCode: string, payload: Job['payload'] = {}, heavy = false): Job {
  const job: Job = {
    id: 'job-' + Date.now() + '-' + ++seq,
    kind,
    clinicCode,
    payload,
    createdAt: new Date().toISOString(),
    heavy
  };
  queue.push(job);
  return job;
}

export function dequeue(): Job | undefined {
  return queue.shift();
}

export function pendingCount(): number {
  return queue.length;
}

export function peekAll(): Job[] {
  return [...queue];
}

export async function drain(onJob: (job: Job) => Promise<JobResult>): Promise<JobResult[]> {
  const results: JobResult[] = [];
  let job: Job | undefined;
  while ((job = dequeue())) {
    results.push(await onJob(job));
  }
  return results;
}
