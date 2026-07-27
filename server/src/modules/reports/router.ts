import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../../db/knex';
import { authenticate } from '../../middleware/auth';
import { auditLog } from '../../middleware/audit';
import { eventBus } from '../../core/event-bus';
import { v4 as uuid } from 'uuid';
import { sanitizeInput } from '../../utils/validators';
import { logger } from '../../utils/logger';

const router = Router();
router.use(authenticate);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const { status, classification, search } = req.query;

    let query = db('intelligence_reports')
      .select('intelligence_reports.*', 'users.first_name as author_first', 'users.last_name as author_last')
      .leftJoin('users', 'intelligence_reports.author_id', 'users.id');

    if (status) query = query.where('intelligence_reports.status', status);
    if (classification) query = query.where('intelligence_reports.classification', classification);
    if (search) query = query.where(function () {
      this.where('intelligence_reports.title', 'ilike', `%${search}%`)
        .orWhere('intelligence_reports.summary', 'ilike', `%${search}%`);
    });

    const [items, total] = await Promise.all([
      query.clone().orderBy('created_at', 'desc').limit(limit).offset(offset),
      query.clone().clearSelect().count('intelligence_reports.id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await db('intelligence_reports')
      .select('intelligence_reports.*', 'users.first_name as author_first', 'users.last_name as author_last')
      .leftJoin('users', 'intelligence_reports.author_id', 'users.id')
      .where('intelligence_reports.id', req.params.id)
      .first();
    if (!item) { res.status(404).json({ error: 'Report not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
});

router.post('/', auditLog('report:create', 'report'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = sanitizeInput(req.body);
    const ref = `INT-${new Date().getFullYear()}-${String(Date.now() % 100000).padStart(5, '0')}`;
    const [item] = await db('intelligence_reports').insert({
      id: uuid(),
      reference_number: ref,
      ...body,
      author_id: req.user!.userId,
    }).returning('*');
    logger.info(`Report created: ${item.title || ref}`, { reportId: item.id });

    eventBus.emit('entity:created', {
      entityType: 'report',
      entityId: item.id,
      title: item.title || ref,
      userId: req.user!.userId,
    });

    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.put('/:id', auditLog('report:update', 'report'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = sanitizeInput(req.body);
    const [item] = await db('intelligence_reports')
      .where({ id: req.params.id }).update({ ...body, updated_at: db.fn.now() }).returning('*');
    if (!item) { res.status(404).json({ error: 'Report not found' }); return; }
    logger.info(`Report updated: ${item.title || item.reference_number}`, { reportId: item.id });

    eventBus.emit('entity:updated', {
      entityType: 'report',
      entityId: item.id,
      title: item.title || item.reference_number,
      userId: req.user!.userId,
    });

    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/:id', auditLog('report:delete', 'report'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await db('intelligence_reports').where({ id: req.params.id }).first();
    await db('intelligence_reports').where({ id: req.params.id }).del();

    if (existing) {
      eventBus.emit('entity:deleted', {
        entityType: 'report',
        entityId: req.params.id,
        title: existing.title || existing.reference_number,
        userId: req.user!.userId,
      });
    }

    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

router.get('/:id/comments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const comments = await db('entity_comments')
      .select('entity_comments.*', 'users.first_name', 'users.last_name', 'users.email')
      .leftJoin('users', 'entity_comments.author_id', 'users.id')
      .where('entity_comments.entity_type', 'report')
      .where('entity_comments.entity_id', req.params.id)
      .orderBy('entity_comments.created_at', 'asc');

    res.json({ data: comments });
  } catch (e) { next(e); }
});

router.post('/:id/comments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { content, parent_id } = req.body;
    if (!content || !content.trim()) {
      res.status(400).json({ error: 'Comment content is required' });
      return;
    }

    const [comment] = await db('entity_comments').insert({
      id: uuid(),
      entity_type: 'report',
      entity_id: req.params.id,
      author_id: req.user!.userId,
      parent_id: parent_id || null,
      content: content.trim(),
    }).returning('*');

    const [fullComment] = await db('entity_comments')
      .select('entity_comments.*', 'users.first_name', 'users.last_name', 'users.email')
      .leftJoin('users', 'entity_comments.author_id', 'users.id')
      .where('entity_comments.id', comment.id);

    res.status(201).json({ data: fullComment });
  } catch (e) { next(e); }
});

export default router;
