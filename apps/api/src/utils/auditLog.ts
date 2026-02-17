/**
 * Admin audit logging utilities
 * Tracks all admin actions for accountability
 */

import prisma from '../prisma';

export interface AuditLogEntry {
  adminId: string;
  action: string;
  targetId?: string;
  details?: Record<string, any>;
}

/**
 * Logs an admin action
 */
export async function logAdminAction(entry: AuditLogEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        adminId: entry.adminId,
        action: entry.action,
        targetId: entry.targetId || null,
        details: entry.details ? JSON.stringify(entry.details) : null,
      },
    });
  } catch (error) {
    // Log error but don't fail the operation
    console.error('Failed to create audit log entry:', error);
  }
}

/**
 * Gets audit logs filtered by criteria
 */
export async function getAuditLogs(filter?: {
  adminId?: string;
  action?: string;
  targetId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}): Promise<any[]> {
  const where: any = {};

  if (filter?.adminId) where.adminId = filter.adminId;
  if (filter?.action) where.action = filter.action;
  if (filter?.targetId) where.targetId = filter.targetId;

  if (filter?.startDate || filter?.endDate) {
    where.createdAt = {};
    if (filter?.startDate) where.createdAt.gte = filter.startDate;
    if (filter?.endDate) where.createdAt.lte = filter.endDate;
  }

  return prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: filter?.limit || 100,
    skip: filter?.offset || 0,
  });
}

/**
 * Specific audit log actions
 */
export const AuditActions = {
  USER_BANNED: 'USER_BANNED',
  USER_UNBANNED: 'USER_UNBANNED',
  USER_DELETED: 'USER_DELETED',
  REPORTS_RESET: 'REPORTS_RESET',
  REPORT_ACCEPTED: 'REPORT_ACCEPTED',
  REPORT_REJECTED: 'REPORT_REJECTED',
  BADGE_AWARDED: 'BADGE_AWARDED',
  BADGE_REMOVED: 'BADGE_REMOVED',
  POST_DELETED: 'POST_DELETED',
  USER_SUSPENDED: 'USER_SUSPENDED',
  ADMIN_SETTINGS_CHANGED: 'ADMIN_SETTINGS_CHANGED',
  SYSTEM_BROADCAST: 'SYSTEM_BROADCAST',
} as const;
