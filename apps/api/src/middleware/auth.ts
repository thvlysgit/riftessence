/**
 * Shared authentication middleware
 * Extracts and validates JWT tokens from Authorization headers
 */

import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Extracts the user ID from the Authorization Bearer token
 * @param request Fastify request object
 * @param reply Fastify reply object
 * @param required Whether authentication is required (default: true)
 * @returns User ID string if valid, null if unauthorized or optional and not provided
 */
export async function getUserIdFromRequest(
  request: FastifyRequest,
  reply: FastifyReply,
  required: boolean = true
): Promise<string | null> {
  const authHeader = request.headers['authorization'];
  if (!authHeader || typeof authHeader !== 'string') {
    if (!required) return null;
    reply.code(401).send({ error: 'Authorization header missing' });
    return null;
  }

  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    if (!required) return null;
    reply.code(401).send({ error: 'Invalid Authorization header' });
    return null;
  }

  try {
    const payload = (request.server as any).jwt.verify(token) as any;
    if (!payload?.userId) {
      if (!required) return null;
      reply.code(401).send({ error: 'Invalid token payload' });
      return null;
    }
    (request as any).userId = payload.userId;
    return payload.userId as string;
  } catch (err) {
    if (!required) return null;
    // Log with request ID for tracing
    request.log?.error?.({
      msg: 'JWT verification failed',
      reqId: request.id,
      error: err instanceof Error ? err.message : String(err),
    });
    reply.code(401).send({ error: 'Invalid or expired token' });
    return null;
  }
}

/**
 * Checks if user is authenticated, throws error if not
 * Can be used as a route decorator
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const userId = await getUserIdFromRequest(request, reply);
  if (!userId) {
    return;
  }
}

/**
 * Checks if user has a specific badge/role
 * @param request Fastify request object
 * @param reply Fastify reply object
 * @param db Database client
 * @param badge Badge name to check for
 * @returns true if user has badge, false otherwise
 */
export async function checkBadge(
  request: FastifyRequest,
  reply: FastifyReply,
  db: any,
  badge: string
): Promise<boolean> {
  const userId = await getUserIdFromRequest(request, reply);
  if (!userId) {
    return false;
  }

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { badges: true },
    });

    if (!user) {
      reply.code(401).send({ error: 'User not found' });
      return false;
    }

    const hasBadge = user.badges.some(
      (b: any) => b.toLowerCase() === badge.toLowerCase()
    );

    if (!hasBadge) {
      reply.code(403).send({ error: 'Insufficient permissions' });
      return false;
    }

    return true;
  } catch (err) {
    request.log?.error?.({ err }, 'Badge check failed');
    reply.code(500).send({ error: 'Internal server error' });
    return false;
  }
}

/**
 * Checks if user is an admin
 * @param request Fastify request object
 * @param reply Fastify reply object
 * @param db Database client
 * @returns true if user is admin, false otherwise
 */
export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
  db: any
): Promise<boolean> {
  return checkBadge(request, reply, db, 'admin');
}
