import { z } from 'zod';
import prisma from '../prisma';
import { getUserIdFromRequest, requireAdmin } from '../middleware/auth';
import { logAdminAction } from '../utils/auditLog';
import { getInputControlSurfaceCatalog, invalidateInputControlRulesCache } from '../utils/inputControl';

const VALID_SURFACES = [
  'GLOBAL',
  'DUO_POST',
  'LFT_POST',
  'COACHING_POST',
  'CHAT_MESSAGE',
  'PROFILE',
  'FEEDBACK',
  'REPORT',
  'TEAM',
  'SCRIM',
  'MATCHUP',
  'COMMUNITY',
  'AD_REQUEST',
  'DEVELOPER_API_REQUEST',
  'BUG_REPORT',
] as const;
const VALID_KINDS = ['WORD', 'PHRASE', 'PREFIX', 'REGEX'] as const;

const RuleBodySchema = z.object({
  label: z.string().trim().min(2).max(120),
  kind: z.enum(VALID_KINDS).default('PHRASE'),
  pattern: z.string().trim().min(1).max(500),
  reason: z.string().trim().max(200).optional().nullable(),
  blockMessage: z.string().trim().max(200).optional().nullable(),
  surfaces: z.array(z.enum(VALID_SURFACES)).min(1).default(['GLOBAL']),
  enabled: z.boolean().default(true),
});

const RulePatchSchema = RuleBodySchema.partial();

function parseBody(schema: z.ZodSchema<any>, body: unknown) {
  const parsed = schema.safeParse(body || {});
  if (!parsed.success) {
    const details: Record<string, string> = {};
    parsed.error.errors.forEach((err) => {
      details[err.path.join('.') || '_'] = err.message;
    });
    return { success: false as const, details };
  }

  if (parsed.data.kind === 'REGEX' && parsed.data.pattern) {
    try {
      new RegExp(parsed.data.pattern, 'i');
    } catch {
      return { success: false as const, details: { pattern: 'Regex pattern is invalid' } };
    }
  }

  return { success: true as const, data: parsed.data };
}

function summarizeRule(rule: any) {
  return {
    id: rule.id,
    label: rule.label,
    kind: rule.kind,
    pattern: rule.pattern,
    reason: rule.reason,
    blockMessage: rule.blockMessage,
    surfaces: rule.surfaces || [],
    enabled: rule.enabled,
    createdById: rule.createdById,
    updatedById: rule.updatedById,
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
  };
}

export default async function inputControlRoutes(fastify: any) {
  fastify.get('/admin/input-control/rules', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const isAdmin = await requireAdmin(request, reply, prisma);
      if (!isAdmin) return;

      const rules = await prisma.inputControlRule.findMany({
        orderBy: [{ enabled: 'desc' }, { createdAt: 'asc' }],
      });

      return reply.send({
        rules: rules.map(summarizeRule),
        surfaces: getInputControlSurfaceCatalog(),
        kinds: VALID_KINDS,
      });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to load input control rules', code: 'INPUT_CONTROL_LOAD_FAILED' });
    }
  });

  fastify.post('/admin/input-control/rules', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const isAdmin = await requireAdmin(request, reply, prisma);
      if (!isAdmin) return;

      const parsed = parseBody(RuleBodySchema, request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Invalid input control rule', code: 'INVALID_INPUT_CONTROL_RULE', details: parsed.details });
      }

      const rule = await prisma.inputControlRule.create({
        data: {
          ...parsed.data,
          reason: parsed.data.reason || null,
          blockMessage: parsed.data.blockMessage || null,
          createdById: userId,
          updatedById: userId,
        },
      });

      invalidateInputControlRulesCache();
      await logAdminAction({
        adminId: userId,
        action: 'INPUT_CONTROL_RULE_CREATED',
        targetId: rule.id,
        details: { label: rule.label, kind: rule.kind, pattern: rule.pattern, surfaces: rule.surfaces },
      });

      return reply.code(201).send({ success: true, rule: summarizeRule(rule) });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to create input control rule', code: 'INPUT_CONTROL_CREATE_FAILED' });
    }
  });

  fastify.patch('/admin/input-control/rules/:id', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const isAdmin = await requireAdmin(request, reply, prisma);
      if (!isAdmin) return;

      const { id } = request.params as { id: string };
      const existing = await prisma.inputControlRule.findUnique({ where: { id } });
      if (!existing) {
        return reply.code(404).send({ error: 'Input control rule not found', code: 'INPUT_CONTROL_RULE_NOT_FOUND' });
      }

      const parsed = parseBody(RulePatchSchema, request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Invalid input control rule', code: 'INVALID_INPUT_CONTROL_RULE', details: parsed.details });
      }

      const nextKind = parsed.data.kind || existing.kind;
      const nextPattern = parsed.data.pattern || existing.pattern;
      if (nextKind === 'REGEX') {
        try {
          new RegExp(nextPattern, 'i');
        } catch {
          return reply.code(400).send({
            error: 'Invalid input control rule',
            code: 'INVALID_INPUT_CONTROL_RULE',
            details: { pattern: 'Regex pattern is invalid' },
          });
        }
      }

      const rule = await prisma.inputControlRule.update({
        where: { id },
        data: {
          ...parsed.data,
          reason: parsed.data.reason === undefined ? undefined : parsed.data.reason || null,
          blockMessage: parsed.data.blockMessage === undefined ? undefined : parsed.data.blockMessage || null,
          updatedById: userId,
        },
      });

      invalidateInputControlRulesCache();
      await logAdminAction({
        adminId: userId,
        action: 'INPUT_CONTROL_RULE_UPDATED',
        targetId: rule.id,
        details: { label: rule.label, kind: rule.kind, enabled: rule.enabled, surfaces: rule.surfaces },
      });

      return reply.send({ success: true, rule: summarizeRule(rule) });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to update input control rule', code: 'INPUT_CONTROL_UPDATE_FAILED' });
    }
  });

  fastify.delete('/admin/input-control/rules/:id', async (request: any, reply: any) => {
    try {
      const userId = await getUserIdFromRequest(request, reply);
      if (!userId) return;

      const isAdmin = await requireAdmin(request, reply, prisma);
      if (!isAdmin) return;

      const { id } = request.params as { id: string };
      const existing = await prisma.inputControlRule.findUnique({ where: { id } });
      if (!existing) {
        return reply.code(404).send({ error: 'Input control rule not found', code: 'INPUT_CONTROL_RULE_NOT_FOUND' });
      }

      await prisma.inputControlRule.delete({ where: { id } });
      invalidateInputControlRulesCache();
      await logAdminAction({
        adminId: userId,
        action: 'INPUT_CONTROL_RULE_DELETED',
        targetId: id,
        details: { label: existing.label, kind: existing.kind, pattern: existing.pattern },
      });

      return reply.send({ success: true });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to delete input control rule', code: 'INPUT_CONTROL_DELETE_FAILED' });
    }
  });
}
