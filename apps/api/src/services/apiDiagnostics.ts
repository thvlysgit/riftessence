import { createHash } from 'crypto';
import { hostname } from 'os';
import prisma from '../prisma';

export type IncidentSeverity = 'WARNING' | 'ERROR' | 'FATAL';

export type IncidentInput = {
  kind: string;
  severity?: IncidentSeverity;
  message: unknown;
  stack?: unknown;
  route?: string | null;
  method?: string | null;
  statusCode?: number | null;
  requestId?: string | null;
  userId?: string | null;
  instanceKey?: string | null;
  release?: string | null;
  metadata?: Record<string, unknown> | null;
};

type WorkerState = {
  name: string;
  status: 'idle' | 'running' | 'healthy' | 'failed';
  startedAt: string | null;
  lastStartedAt: string | null;
  lastSucceededAt: string | null;
  lastFailedAt: string | null;
  lastDurationMs: number | null;
  lastError: string | null;
  runs: number;
  failures: number;
};

const MAX_MESSAGE_LENGTH = 2_000;
const MAX_STACK_LENGTH = 12_000;
const MAX_METADATA_LENGTH = 12_000;
const HEARTBEAT_INTERVAL_MS = 30_000;
const INCIDENT_RETENTION_DAYS = 30;
const PROCESS_RUN_RETENTION_DAYS = 14;
const instanceKey = String(process.env.API_INSTANCE_ID || process.env.DYNO || process.env.HOSTNAME || hostname() || 'unknown').slice(0, 200);
const release = String(process.env.RELEASE_SHA || process.env.VERCEL_GIT_COMMIT_SHA || process.env.HEROKU_SLUG_COMMIT || '').slice(0, 100) || null;
const processStartedAt = new Date();
const workerStates = new Map<string, WorkerState>();
const throttledIncidentTimes = new Map<string, number>();

let processRunId: string | null = null;
let heartbeatTimer: NodeJS.Timeout | null = null;
let diagnosticsPersistenceAvailable = true;

const SECRET_PATTERNS: Array<[RegExp, string]> = [
  [/Bearer\s+[A-Za-z0-9._~+\-/]+=*/gi, 'Bearer [REDACTED]'],
  [/\b(?:password|passwd|token|secret|api[_-]?key|authorization)\b\s*[:=]\s*[^\s,;&]+/gi, '[REDACTED_CREDENTIAL]'],
  [/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[REDACTED_JWT]'],
  [/(https?:\/\/[^\s?#]+)\?[^\s#]*/gi, '$1?[REDACTED_QUERY]'],
];

function mb(bytes: number): number {
  return Math.round(bytes / 1024 / 1024);
}

function currentMemory() {
  const memory = process.memoryUsage();
  return {
    rssMb: mb(memory.rss),
    heapUsedMb: mb(memory.heapUsed),
    heapTotalMb: mb(memory.heapTotal),
    externalMb: mb(memory.external),
  };
}

function normalizeUnknown(value: unknown): string {
  if (value instanceof Error) return value.message;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function sanitizeDiagnosticText(value: unknown, maxLength = MAX_MESSAGE_LENGTH): string {
  let output = normalizeUnknown(value);
  for (const [pattern, replacement] of SECRET_PATTERNS) {
    output = output.replace(pattern, replacement);
  }
  return output.slice(0, maxLength);
}

function sanitizeMetadata(metadata: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!metadata) return null;
  const allowed = Object.fromEntries(Object.entries(metadata).slice(0, 30).map(([key, value]) => {
    if (value === null || typeof value === 'number' || typeof value === 'boolean') return [key, value];
    return [key, sanitizeDiagnosticText(value, 1_000)];
  }));
  const serialized = JSON.stringify(allowed);
  return serialized.length <= MAX_METADATA_LENGTH
    ? allowed
    : { truncated: sanitizeDiagnosticText(serialized, MAX_METADATA_LENGTH) };
}

export function incidentFingerprint(input: IncidentInput): string {
  const message = sanitizeDiagnosticText(input.message, 500)
    .replace(/\b[0-9a-f]{8,}\b/gi, ':id')
    .replace(/\b\d{4,}\b/g, ':number');
  return createHash('sha256').update([
    input.kind,
    input.route || '',
    input.method || '',
    input.statusCode || '',
    input.userId || '',
    message,
  ].join('|')).digest('hex');
}

function structuredIncidentLog(input: IncidentInput, fingerprint: string) {
  const payload = {
    level: input.severity === 'FATAL' ? 'fatal' : input.severity === 'WARNING' ? 'warn' : 'error',
    event: 'api_incident',
    fingerprint,
    kind: input.kind,
    message: sanitizeDiagnosticText(input.message),
    route: input.route || null,
    method: input.method || null,
    statusCode: input.statusCode || null,
    requestId: input.requestId || null,
    userId: input.userId || null,
    instanceKey: input.instanceKey || instanceKey,
    release: input.release || release,
    timestamp: new Date().toISOString(),
  };
  console.error(JSON.stringify(payload));
}

export async function recordIncident(input: IncidentInput): Promise<string | null> {
  const fingerprint = incidentFingerprint(input);
  structuredIncidentLog(input, fingerprint);

  if (!diagnosticsPersistenceAvailable) return null;
  const now = new Date();
  try {
    const incident = await prisma.systemIncident.upsert({
      where: { fingerprint },
      create: {
        fingerprint,
        kind: input.kind.slice(0, 100),
        severity: input.severity || 'ERROR',
        message: sanitizeDiagnosticText(input.message),
        stack: input.stack ? sanitizeDiagnosticText(input.stack, MAX_STACK_LENGTH) : null,
        route: input.route?.slice(0, 500) || null,
        method: input.method?.slice(0, 20) || null,
        statusCode: input.statusCode || null,
        requestId: input.requestId?.slice(0, 200) || null,
        userId: input.userId?.slice(0, 200) || null,
        instanceKey: (input.instanceKey || instanceKey).slice(0, 200),
        release: input.release?.slice(0, 100) || release,
        metadata: sanitizeMetadata(input.metadata),
        firstSeenAt: now,
        lastSeenAt: now,
      },
      update: {
        severity: input.severity || 'ERROR',
        status: 'OPEN',
        message: sanitizeDiagnosticText(input.message),
        stack: input.stack ? sanitizeDiagnosticText(input.stack, MAX_STACK_LENGTH) : undefined,
        requestId: input.requestId?.slice(0, 200) || undefined,
        userId: input.userId?.slice(0, 200) || undefined,
        instanceKey: (input.instanceKey || instanceKey).slice(0, 200),
        release: input.release?.slice(0, 100) || release || undefined,
        metadata: sanitizeMetadata(input.metadata) || undefined,
        occurrences: { increment: 1 },
        lastSeenAt: now,
        acknowledgedAt: null,
        acknowledgedById: null,
        resolvedAt: null,
        resolvedById: null,
        resolutionNote: null,
      },
      select: { id: true },
    });
    return incident.id;
  } catch (error) {
    console.warn('[ApiDiagnostics] Incident persistence failed:', sanitizeDiagnosticText(error));
    return null;
  }
}

export function recordIncidentThrottled(input: IncidentInput, intervalMs = 60_000): void {
  const fingerprint = incidentFingerprint(input);
  const now = Date.now();
  const lastRecordedAt = throttledIncidentTimes.get(fingerprint) || 0;
  if (now - lastRecordedAt < intervalMs) return;
  throttledIncidentTimes.set(fingerprint, now);
  if (throttledIncidentTimes.size > 2_000) {
    const cutoff = now - intervalMs;
    for (const [key, timestamp] of throttledIncidentTimes) {
      if (timestamp < cutoff) throttledIncidentTimes.delete(key);
    }
  }
  void recordIncident(input);
}

export function recordRequestFailure(request: any, error: unknown, route: string, statusCode = 500): void {
  const normalized = error instanceof Error ? error : new Error(normalizeUnknown(error));
  request.__apiIncidentCaptured = true;
  recordIncidentThrottled({
    kind: 'HANDLED_REQUEST_ERROR',
    severity: 'ERROR',
    message: normalized.message,
    stack: normalized.stack,
    route,
    method: request.method || null,
    statusCode,
    requestId: request.id || null,
    userId: request.userId || null,
  });
}

function staleRunMessage(previous: any): string {
  const lastHeartbeat = previous.heartbeatAt instanceof Date ? previous.heartbeatAt.toISOString() : String(previous.heartbeatAt);
  return `API process restarted without a graceful shutdown. Previous run ${previous.id} last reported at ${lastHeartbeat}.`;
}

export async function initializeApiDiagnostics(): Promise<void> {
  try {
    const previousRuns = await prisma.apiProcessRun.findMany({
      where: { instanceKey, status: 'ACTIVE' },
      orderBy: { startedAt: 'desc' },
      take: 5,
    });
    if (previousRuns.length > 0) {
      await prisma.apiProcessRun.updateMany({
        where: { instanceKey, status: 'ACTIVE' },
        data: { status: 'CRASHED', stoppedAt: new Date(), stopReason: 'Unclean restart detected on next startup' },
      });
      for (const previous of previousRuns) {
        await recordIncident({
          kind: 'UNCLEAN_PROCESS_RESTART',
          severity: 'FATAL',
          message: staleRunMessage(previous),
          instanceKey,
          metadata: {
            previousRunId: previous.id,
            previousStartedAt: previous.startedAt,
            previousHeartbeatAt: previous.heartbeatAt,
            rssMb: previous.rssMb,
            heapUsedMb: previous.heapUsedMb,
          },
        });
      }
    }

    const run = await prisma.apiProcessRun.create({
      data: { instanceKey, release, ...currentMemory() },
      select: { id: true },
    });
    processRunId = run.id;
    diagnosticsPersistenceAvailable = true;

    heartbeatTimer = setInterval(() => {
      void heartbeat().catch(() => undefined);
    }, HEARTBEAT_INTERVAL_MS);
    heartbeatTimer.unref?.();

    void pruneOldDiagnostics().catch(() => undefined);
  } catch (error) {
    diagnosticsPersistenceAvailable = false;
    console.warn('[ApiDiagnostics] Startup persistence unavailable; stdout logging remains active:', sanitizeDiagnosticText(error));
  }
}

async function heartbeat(): Promise<void> {
  if (!processRunId || !diagnosticsPersistenceAvailable) return;
  try {
    await prisma.apiProcessRun.update({
      where: { id: processRunId },
      data: { heartbeatAt: new Date(), ...currentMemory() },
    });
  } catch (error) {
    console.warn('[ApiDiagnostics] Heartbeat failed:', sanitizeDiagnosticText(error));
  }
}

async function pruneOldDiagnostics(): Promise<void> {
  const incidentCutoff = new Date(Date.now() - INCIDENT_RETENTION_DAYS * 24 * 60 * 60_000);
  const runCutoff = new Date(Date.now() - PROCESS_RUN_RETENTION_DAYS * 24 * 60 * 60_000);
  await Promise.all([
    prisma.systemIncident.deleteMany({ where: { status: 'RESOLVED', lastSeenAt: { lt: incidentCutoff } } }),
    prisma.apiProcessRun.deleteMany({ where: { status: { not: 'ACTIVE' }, startedAt: { lt: runCutoff } } }),
  ]);
}

export async function markApiProcessStopped(reason: string, status = 'STOPPED'): Promise<void> {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = null;
  if (!processRunId || !diagnosticsPersistenceAvailable) return;
  try {
    await prisma.apiProcessRun.update({
      where: { id: processRunId },
      data: { status, stoppedAt: new Date(), stopReason: sanitizeDiagnosticText(reason, 500), ...currentMemory() },
    });
  } catch (error) {
    console.warn('[ApiDiagnostics] Could not close process run:', sanitizeDiagnosticText(error));
  }
}

export async function captureFatalIncident(kind: string, error: unknown): Promise<void> {
  const normalized = error instanceof Error ? error : new Error(normalizeUnknown(error));
  await Promise.race([
    Promise.all([
      recordIncident({ kind, severity: 'FATAL', message: normalized.message, stack: normalized.stack }),
      markApiProcessStopped(normalized.message, 'CRASHED'),
    ]),
    new Promise<void>((resolve) => setTimeout(resolve, 1_500)),
  ]);
}

export function markWorkerStarted(name: string): void {
  const now = new Date().toISOString();
  const previous = workerStates.get(name);
  workerStates.set(name, {
    name,
    status: 'running',
    startedAt: previous?.startedAt || now,
    lastStartedAt: now,
    lastSucceededAt: previous?.lastSucceededAt || null,
    lastFailedAt: previous?.lastFailedAt || null,
    lastDurationMs: previous?.lastDurationMs || null,
    lastError: previous?.lastError || null,
    runs: previous?.runs || 0,
    failures: previous?.failures || 0,
  });
}

export function markWorkerSucceeded(name: string, durationMs: number): void {
  const previous = workerStates.get(name);
  const now = new Date().toISOString();
  workerStates.set(name, {
    name,
    status: 'healthy',
    startedAt: previous?.startedAt || now,
    lastStartedAt: previous?.lastStartedAt || now,
    lastSucceededAt: now,
    lastFailedAt: previous?.lastFailedAt || null,
    lastDurationMs: Math.max(0, Math.round(durationMs)),
    lastError: null,
    runs: (previous?.runs || 0) + 1,
    failures: previous?.failures || 0,
  });
}

export function markWorkerFailed(name: string, error: unknown, durationMs: number): void {
  const previous = workerStates.get(name);
  const now = new Date().toISOString();
  const message = sanitizeDiagnosticText(error);
  workerStates.set(name, {
    name,
    status: 'failed',
    startedAt: previous?.startedAt || now,
    lastStartedAt: previous?.lastStartedAt || now,
    lastSucceededAt: previous?.lastSucceededAt || null,
    lastFailedAt: now,
    lastDurationMs: Math.max(0, Math.round(durationMs)),
    lastError: message,
    runs: (previous?.runs || 0) + 1,
    failures: (previous?.failures || 0) + 1,
  });
  void recordIncident({ kind: 'BACKGROUND_WORKER_FAILURE', severity: 'ERROR', message, metadata: { worker: name, durationMs } });
}

export function apiRuntimeSnapshot() {
  return {
    status: 'online',
    instanceKey,
    release,
    processRunId,
    startedAt: processStartedAt.toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    nodeVersion: process.version,
    memory: currentMemory(),
    persistenceAvailable: diagnosticsPersistenceAvailable,
    workers: Array.from(workerStates.values()),
  };
}
