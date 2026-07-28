import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../../db/knex';
import { authenticate } from '../../middleware/auth';
import { eventBus } from '../../core/event-bus';
import { v4 as uuid } from 'uuid';
import { convertEmptyToNull } from '../../utils/validators';
import { logger } from '../../utils/logger';

const router = Router();
router.use(authenticate);


router.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') {
    req.body = convertEmptyToNull(req.body);
  }
  next();
});

// ── Scheduler ──

let schedulerInterval: NodeJS.Timeout | null = null;
const trackedTasks = new Set<string>();

function getNextRunTime(schedule: string): Date | null {
  const now = new Date();
  switch (schedule) {
    case 'HOURLY': {
      const next = new Date(now);
      next.setHours(next.getHours() + 1, 0, 0, 0);
      return next;
    }
    case 'EVERY_6_HOURS': {
      const next = new Date(now);
      const currentHour = next.getHours();
      const nextSlot = Math.ceil((currentHour + 1) / 6) * 6;
      next.setHours(nextSlot, 0, 0, 0);
      return next;
    }
    case 'DAILY': {
      const next = new Date(now);
      next.setDate(next.getDate() + 1);
      next.setHours(0, 0, 0, 0);
      return next;
    }
    case 'WEEKLY': {
      const next = new Date(now);
      next.setDate(next.getDate() + 7);
      next.setHours(0, 0, 0, 0);
      return next;
    }
    default: return null;
  }
}

export function startScheduler() {
  if (schedulerInterval) return;
  schedulerInterval = setInterval(async () => {
    try {
      const now = new Date();
      const tasks = await db('osint_collection_tasks')
        .whereNot('status', 'RUNNING')
        .whereRaw("metadata->>'schedule' IS NOT NULL");

      for (const task of tasks) {
        const metadata = typeof task.metadata === 'string' ? JSON.parse(task.metadata || '{}') : (task.metadata || {});
        const schedule = metadata.schedule;
        const enabled = metadata.scheduleEnabled !== false;
        if (!enabled || !schedule || schedule === 'MANUAL') continue;

        const nextRunAt = metadata.next_run_at ? new Date(metadata.next_run_at) : null;
        if (nextRunAt && now >= nextRunAt) {
          logger.info(`Scheduled OSINT task triggered: ${task.title || task.id}`, { taskId: task.id, schedule });
          await db('osint_collection_tasks').where({ id: task.id }).update({
            status: 'RUNNING', last_run_at: db.fn.now(),
          });

          // Simulate collection
          const sampleResults = [
            { title: 'Scheduled result from source', url: 'https://example.com/scheduled-article', content_snippet: 'Automatically collected intelligence data...' },
          ];
          for (const result of sampleResults) {
            const existing = await db('osint_collected_items')
              .where({ task_id: task.id, url: result.url }).first();
            if (!existing) {
              await db('osint_collected_items').insert({
                id: uuid(), task_id: task.id, title: result.title, url: result.url,
                content_snippet: result.content_snippet, source_type: 'NEWS',
              });
            }
          }
          await db('osint_collection_tasks').where({ id: task.id }).update({
            status: 'COMPLETED',
          });
          const [{ count }] = await db('osint_collected_items').where({ task_id: task.id }).count('id as count');
          await db('osint_collection_tasks').where({ id: task.id }).update({ results_count: parseInt(String(count), 10) });

          const nextRun = getNextRunTime(schedule);
          const currentTaskMeta = typeof task.metadata === 'string' ? JSON.parse(task.metadata || '{}') : (task.metadata || {});
          await db('osint_collection_tasks').where({ id: task.id }).update({
            metadata: JSON.stringify({ ...currentTaskMeta, schedule, scheduleEnabled: true, next_run_at: nextRun ? nextRun.toISOString() : null }),
          });

          logger.info(`Scheduled OSINT task completed: ${task.title || task.id}`, { taskId: task.id });
        }
      }
    } catch (e) {
      logger.error('OSINT scheduler error', { error: e });
    }
  }, 60000); // Check every 60 seconds
  logger.info('OSINT scheduler started');
}

export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    logger.info('OSINT scheduler stopped');
  }
}

// ── Collection Routes ──

router.get('/tasks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const { status } = req.query;

    let query = db('osint_collection_tasks').select('*');
    if (status) query = query.where('status', status);

    const [items, total] = await Promise.all([
      query.clone().orderBy('created_at', 'desc').limit(limit).offset(offset),
      query.clone().clearSelect().count('id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.post('/tasks', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('osint_collection_tasks').insert({...req.body, id: uuid(), created_by: req.user!.userId,
    }).returning('*');
    eventBus.emit('entity:created', {
      entityType: 'osint_task',
      entityId: item.id,
      title: item.title || 'New OSINT task',
      userId: req.user!.userId,
    });
    res.status(201).json(item);
  } catch (e) { next(e); }
});

// ── Sub-Routes (must come before generic /:id) ──

router.post('/tasks/:id/run', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await db('osint_collection_tasks').where({ id: req.params.id }).first();
    if (!task) { res.status(404).json({ error: 'Task not found' }); return; }

    await db('osint_collection_tasks').where({ id: req.params.id }).update({
      status: 'RUNNING', last_run_at: db.fn.now(),
    });

    // Simulate collecting items (in production, this would trigger a real scraper)
    const sampleResults = [
      { title: 'Sample result from news source', url: 'https://example.com/article-1', content_snippet: 'Relevant intelligence data...' },
    ];

    for (const result of sampleResults) {
      const existing = await db('osint_collected_items')
        .where({ task_id: req.params.id, url: result.url }).first();
      if (!existing) {
        await db('osint_collected_items').insert({
          id: uuid(), task_id: req.params.id, title: result.title, url: result.url,
          content_snippet: result.content_snippet, source_type: 'NEWS',
        });
      }
    }

    await db('osint_collection_tasks').where({ id: req.params.id }).update({
      status: 'COMPLETED',
    });
    const [{ count }] = await db('osint_collected_items').where({ task_id: req.params.id }).count('id as count');
    await db('osint_collection_tasks').where({ id: req.params.id }).update({ results_count: parseInt(String(count), 10) });

    res.json({ message: 'Task completed', resultsCollected: sampleResults.length });
  } catch (e) { next(e); }
});

router.get('/tasks/:id/results', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const [items, total] = await Promise.all([
      db('osint_collected_items').where({ task_id: req.params.id }).orderBy('created_at', 'desc').limit(limit).offset(offset),
      db('osint_collected_items').where({ task_id: req.params.id }).count('id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.get('/tasks/:id/results/export', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const format = req.query.format === 'json' ? 'json' : 'csv';
    const items = await db('osint_collected_items').where({ task_id: req.params.id }).orderBy('created_at', 'desc');

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="osint-results-${req.params.id}.json"`);
      res.json({ data: items });
      return;
    }

    const headers = ['title', 'url', 'source_type', 'content_snippet', 'captured_at'];
    const csvRows = [headers.map((h) => `"${h}"`).join(',')];
    items.forEach((r: any) => {
      csvRows.push(headers.map((h) => `"${String(r[h] || '').replace(/"/g, '""')}"`).join(','));
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="osint-results-${req.params.id}.csv"`);
    res.send(csvRows.join('\n'));
  } catch (e) { next(e); }
});

// ── Scheduler Management ──

router.put('/tasks/:id/schedule', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { schedule, enabled } = req.body;
    if (!schedule) {
      res.status(400).json({ error: 'schedule is required' });
      return;
    }

    const validSchedules = ['MANUAL', 'HOURLY', 'EVERY_6_HOURS', 'DAILY', 'WEEKLY'];
    if (!validSchedules.includes(schedule)) {
      res.status(400).json({ error: `Invalid schedule. Must be one of: ${validSchedules.join(', ')}` });
      return;
    }

    const task = await db('osint_collection_tasks').where({ id: req.params.id }).first();
    if (!task) { res.status(404).json({ error: 'Task not found' }); return; }

    const scheduleEnabled = enabled !== false;
    const nextRunAt = scheduleEnabled && schedule !== 'MANUAL' ? getNextRunTime(schedule) : null;

    const existingMeta = typeof task.metadata === 'string' ? JSON.parse(task.metadata || '{}') : (task.metadata || {});
    await db('osint_collection_tasks').where({ id: req.params.id }).update({
      metadata: JSON.stringify({
        ...existingMeta,
        schedule,
        scheduleEnabled,
        next_run_at: nextRunAt ? nextRunAt.toISOString() : null,
      }),
    });
    if (scheduleEnabled && schedule !== 'MANUAL') trackedTasks.add(req.params.id);
    else trackedTasks.delete(req.params.id);

    const [updated] = await db('osint_collection_tasks').where({ id: req.params.id }).returning('*');
    res.json(updated);
  } catch (e) { next(e); }
});

// ── Generic Routes (must come LAST among same method) ──

router.get('/tasks/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await db('osint_collection_tasks').where({ id: req.params.id }).first();
    if (!item) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
});

router.put('/tasks/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('osint_collection_tasks').where({ id: req.params.id })
      .update({ ...req.body, updated_at: db.fn.now() }).returning('*');
    if (!item) { res.status(404).json({ error: 'Not found' }); return; }
    eventBus.emit('entity:updated', {
      entityType: 'osint_task',
      entityId: item.id,
      title: item.title || 'Updated OSINT task',
      userId: req.user!.userId,
    });
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/tasks/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('osint_collection_tasks').where({ id: req.params.id }).del();
    eventBus.emit('entity:deleted', {
      entityType: 'osint_task',
      entityId: req.params.id,
      title: req.params.id,
      userId: req.user!.userId,
    });
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

export default router;

