// Shared job types. No DB, no secrets, no patient data in plain text.
export type JobKind = 'backup' | 'report' | 'embed' | 'cleanup';

export interface Job {
  id: string;
  kind: JobKind;
  clinicCode: string;
  payload: Record<string, unknown>;
  createdAt: string;
  heavy: boolean;
}

export interface JobResult {
  jobId: string;
  ok: boolean;
  finishedAt: string;
  detail: string;
}

export type JobHandler = (job: Job) => Promise<string>;
