export type MirrorPostType = 'DUO' | 'LFT' | 'SCRIM';

export type MirrorDeletionEvent = {
  id: string;
  postType: MirrorPostType;
  postId: string;
  queuedAt: string;
  attempts: number;
  leaseExpiresAt: number | null;
};

const LEASE_MS = 60_000;
const MAX_QUEUE_SIZE = 5000;

const eventsById = new Map<string, MirrorDeletionEvent>();
const eventOrder: string[] = [];
const dedupeIndex = new Map<string, string>();

function buildDedupeKey(postType: MirrorPostType, postId: string) {
  return `${postType}:${postId}`;
}

function purgeOldestIfNeeded() {
  while (eventOrder.length > MAX_QUEUE_SIZE) {
    const oldestId = eventOrder.shift();
    if (!oldestId) break;

    const oldest = eventsById.get(oldestId);
    if (!oldest) continue;

    dedupeIndex.delete(buildDedupeKey(oldest.postType, oldest.postId));
    eventsById.delete(oldestId);
  }
}

function releaseExpiredLeases(now: number) {
  for (const event of eventsById.values()) {
    if (event.leaseExpiresAt !== null && event.leaseExpiresAt <= now) {
      event.leaseExpiresAt = null;
    }
  }
}

export function enqueueMirrorDeletion(postType: MirrorPostType, postId: string): MirrorDeletionEvent {
  const normalizedPostId = String(postId || '').trim();
  if (!normalizedPostId) {
    throw new Error('postId is required');
  }

  const dedupeKey = buildDedupeKey(postType, normalizedPostId);
  const existingId = dedupeIndex.get(dedupeKey);
  if (existingId) {
    const existing = eventsById.get(existingId);
    if (existing) {
      return existing;
    }
  }

  const event: MirrorDeletionEvent = {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
    postType,
    postId: normalizedPostId,
    queuedAt: new Date().toISOString(),
    attempts: 0,
    leaseExpiresAt: null,
  };

  eventsById.set(event.id, event);
  eventOrder.push(event.id);
  dedupeIndex.set(dedupeKey, event.id);

  purgeOldestIfNeeded();
  return event;
}

export function leaseMirrorDeletions(limit = 25): MirrorDeletionEvent[] {
  const now = Date.now();
  releaseExpiredLeases(now);

  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 25));
  const leased: MirrorDeletionEvent[] = [];

  for (const eventId of eventOrder) {
    if (leased.length >= safeLimit) break;

    const event = eventsById.get(eventId);
    if (!event) continue;
    if (event.leaseExpiresAt !== null) continue;

    event.leaseExpiresAt = now + LEASE_MS;
    event.attempts += 1;
    leased.push(event);
  }

  return leased;
}

export function ackMirrorDeletion(eventId: string): boolean {
  const existing = eventsById.get(eventId);
  if (!existing) return false;

  eventsById.delete(eventId);
  dedupeIndex.delete(buildDedupeKey(existing.postType, existing.postId));

  const orderIndex = eventOrder.indexOf(eventId);
  if (orderIndex >= 0) {
    eventOrder.splice(orderIndex, 1);
  }

  return true;
}
