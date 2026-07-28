import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../../db/knex';
import { authenticate } from '../../middleware/auth';
import { eventBus } from '../../core/event-bus';
import { v4 as uuid } from 'uuid';
import { convertEmptyToNull } from '../../utils/validators';

const router = Router();
router.use(authenticate);

router.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') {
    req.body = convertEmptyToNull(req.body);
  }
  next();
});

// ── Escalation Rules ─────────────────────────────────────────────────────────

router.get('/rules', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rules = await db('watch_logs')
      .select('metadata')
      .where('log_type', 'ESCALATION_RULE')
      .orWhereRaw("metadata->>'type' = 'escalation_rule'");
    res.json({ data: rules.map((r: any) => typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata).filter(Boolean) });
  } catch (e: any) {
    if (e.message?.includes('does not exist')) { res.json({ data: [] }); return; }
    next(e);
  }
});

router.post('/rules', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { condition, action, notify_user_ids } = req.body;
    const metadata = {
      type: 'escalation_rule',
      rule_id: uuid(),
      condition,
      action,
      notify_user_ids: notify_user_ids || [],
      created_by: req.user!.userId,
      created_at: new Date().toISOString(),
    };

    await db('watch_logs').insert({
      id: uuid(),
      author_id: req.user!.userId,
      log_type: 'ESCALATION_RULE',
      title: `Escalation Rule: ${condition}`,
      content: JSON.stringify({ condition, action, notify_user_ids }),
      severity: 'HIGH',
      metadata: JSON.stringify(metadata),
    });

    res.status(201).json(metadata);
  } catch (e: any) {
    if (e.message?.includes('does not exist')) { res.status(400).json({ error: 'Escalation rules not available. Please run database migrations.' }); return; }
    next(e);
  }
});

router.delete('/rules/:ruleId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = await db('watch_logs')
      .where('log_type', 'ESCALATION_RULE')
      .whereRaw("metadata->>'rule_id' = ?", [req.params.ruleId])
      .del();
    if (!deleted) { res.status(404).json({ error: 'Rule not found' }); return; }
    res.json({ message: 'Escalation rule deleted' });
  } catch (e: any) {
    if (e.message?.includes('does not exist')) { res.status(404).json({ error: 'Rule not found' }); return; }
    next(e);
  }
});

// ── Shift Schedules ──────────────────────────────────────────────────────────

router.get('/shifts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const { user_id, is_active } = req.query;

    let query = db('shift_schedules')
      .select('shift_schedules.*', 'users.first_name', 'users.last_name')
      .leftJoin('users', 'shift_schedules.user_id', 'users.id');

    if (user_id) query = query.where('shift_schedules.user_id', user_id);
    if (is_active !== undefined) query = query.where('shift_schedules.is_active', is_active === 'true');

    const [items, total] = await Promise.all([
      query.clone().orderBy('shift_schedules.created_at', 'desc').limit(limit).offset(offset),
      query.clone().clearSelect().count('shift_schedules.id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.get('/shifts/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await db('shift_schedules')
      .select('shift_schedules.*', 'users.first_name', 'users.last_name')
      .leftJoin('users', 'shift_schedules.user_id', 'users.id')
      .where('shift_schedules.id', req.params.id)
      .first();
    if (!item) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
});

router.post('/shifts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('shift_schedules').insert({ id: uuid(), user_id: req.user!.userId, ...req.body }).returning('*');
    eventBus.emit('entity:created', {
      entityType: 'shift_schedule',
      entityId: item.id,
      title: item.shift_name || 'New shift',
      userId: req.user!.userId,
    });
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.put('/shifts/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('shift_schedules')
      .where({ id: req.params.id })
      .update({ ...req.body, updated_at: db.fn.now() })
      .returning('*');
    if (!item) { res.status(404).json({ error: 'Not found' }); return; }
    eventBus.emit('entity:updated', {
      entityType: 'shift_schedule',
      entityId: item.id,
      title: item.shift_name || 'Updated shift',
      userId: req.user!.userId,
    });
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/shifts/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('shift_schedules').where({ id: req.params.id }).del();
    eventBus.emit('entity:deleted', {
      entityType: 'shift_schedule',
      entityId: req.params.id,
      title: req.params.id,
      userId: req.user!.userId,
    });
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

// ── Watch Logs ───────────────────────────────────────────────────────────────

router.get('/logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const { shift_id, log_type, severity, status } = req.query;

    let query = db('watch_logs')
      .select(
        'watch_logs.*',
        'author.first_name as author_first',
        'author.last_name as author_last',
        'ack.first_name as acknowledged_first',
        'ack.last_name as acknowledged_last',
      )
      .leftJoin('users as author', 'watch_logs.author_id', 'author.id')
      .leftJoin('users as ack', 'watch_logs.acknowledged_by', 'ack.id');

    if (shift_id) query = query.where('watch_logs.shift_id', shift_id);
    if (log_type) query = query.where('watch_logs.log_type', log_type);
    if (severity) query = query.where('watch_logs.severity', severity);
    if (status) query = query.where('watch_logs.status', status);

    const [items, total] = await Promise.all([
      query.clone().orderBy('watch_logs.created_at', 'desc').limit(limit).offset(offset),
      query.clone().clearSelect().count('watch_logs.id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.get('/logs/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await db('watch_logs')
      .select(
        'watch_logs.*',
        'author.first_name as author_first',
        'author.last_name as author_last',
        'ack.first_name as acknowledged_first',
        'ack.last_name as acknowledged_last',
      )
      .leftJoin('users as author', 'watch_logs.author_id', 'author.id')
      .leftJoin('users as ack', 'watch_logs.acknowledged_by', 'ack.id')
      .where('watch_logs.id', req.params.id)
      .first();
    if (!item) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
});

router.post('/logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('watch_logs').insert({
      id: uuid(), author_id: req.user!.userId, ...req.body,
    }).returning('*');

    eventBus.emit('entity:created', {
      entityType: 'watch_log',
      entityId: item.id,
      title: item.log_type || 'New watch log',
      userId: req.user!.userId,
    });

    const rules = await db('watch_logs')
      .where('log_type', 'ESCALATION_RULE')
      .whereRaw("metadata->>'type' = 'escalation_rule'");
    for (const ruleRow of rules) {
      const rule = typeof ruleRow.metadata === 'string' ? JSON.parse(ruleRow.metadata) : (ruleRow.metadata || {});
      const condition = rule.condition || '';
      const match = condition.match(/severity\s*=\s*(\w+)/i);
      if (match && match[1].toUpperCase() === (item.severity || '').toUpperCase()) {
        const userIds: string[] = rule.notify_user_ids || [];
        for (const uid of userIds) {
          try {
            await db('notifications').insert({
              id: uuid(),
              user_id: uid,
              title: `Watch Center Alert: ${item.severity} - ${item.title || 'New Log'}`,
              message: item.content || `Severity: ${item.severity}`,
              type: 'WATCH_ESCALATION',
              is_read: false,
            });
          } catch { /* skip if notifications table not ready */ }
        }
      }
    }

    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.put('/logs/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('watch_logs')
      .where({ id: req.params.id })
      .update({ ...req.body })
      .returning('*');
    if (!item) { res.status(404).json({ error: 'Not found' }); return; }
    eventBus.emit('entity:updated', {
      entityType: 'watch_log',
      entityId: item.id,
      title: item.log_type || 'Updated watch log',
      userId: req.user!.userId,
    });
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/logs/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('watch_logs').where({ id: req.params.id }).del();
    eventBus.emit('entity:deleted', {
      entityType: 'watch_log',
      entityId: req.params.id,
      title: req.params.id,
      userId: req.user!.userId,
    });
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

// ── SitReps ──────────────────────────────────────────────────────────────────

router.get('/sitreps', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const { status, classification, search } = req.query;

    let query = db('sitreps')
      .select('sitreps.*', 'users.first_name as author_first', 'users.last_name as author_last')
      .leftJoin('users', 'sitreps.author_id', 'users.id');

    if (status) query = query.where('sitreps.status', status);
    if (classification) query = query.where('sitreps.classification', classification);
    if (search) query = query.where(function () {
      this.where('sitreps.title', 'ilike', `%${search}%`)
        .orWhere('sitreps.reference_number', 'ilike', `%${search}%`);
    });

    const [items, total] = await Promise.all([
      query.clone().orderBy('sitreps.created_at', 'desc').limit(limit).offset(offset),
      query.clone().clearSelect().count('sitreps.id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.get('/sitreps/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await db('sitreps')
      .select('sitreps.*', 'users.first_name as author_first', 'users.last_name as author_last')
      .leftJoin('users', 'sitreps.author_id', 'users.id')
      .where('sitreps.id', req.params.id)
      .first();
    if (!item) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
});

router.post('/sitreps', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ref = `SITREP-${new Date().getFullYear()}-${String(Date.now() % 100000).padStart(5, '0')}`;
    const [item] = await db('sitreps').insert({
      id: uuid(), reference_number: ref, author_id: req.user!.userId, ...req.body,
    }).returning('*');
    eventBus.emit('entity:created', {
      entityType: 'sitrep',
      entityId: item.id,
      title: item.title || item.reference_number || 'New sitrep',
      userId: req.user!.userId,
    });
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.put('/sitreps/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('sitreps')
      .where({ id: req.params.id })
      .update({ ...req.body, updated_at: db.fn.now() })
      .returning('*');
    if (!item) { res.status(404).json({ error: 'Not found' }); return; }
    eventBus.emit('entity:updated', {
      entityType: 'sitrep',
      entityId: item.id,
      title: item.title || item.reference_number || 'Updated sitrep',
      userId: req.user!.userId,
    });
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/sitreps/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('sitreps').where({ id: req.params.id }).del();
    eventBus.emit('entity:deleted', {
      entityType: 'sitrep',
      entityId: req.params.id,
      title: req.params.id,
      userId: req.user!.userId,
    });
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

export default router;
