import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../../db/knex';
import { authenticate } from '../../middleware/auth';
import { auditLog } from '../../middleware/audit';
import { eventBus } from '../../core/event-bus';
import { v4 as uuid } from 'uuid';
import multer from 'multer';
import path from 'path';
import { config } from '../../config';

const storage = multer.diskStorage({
  destination: config.upload.dir,
  filename: (_req, file, cb) => {
    cb(null, `${uuid()}-${file.originalname}`);
  },
});
const upload = multer({ storage, limits: { fileSize: config.upload.maxFileSize } });

const router = Router();
router.use(authenticate);

// ── Mission Plans CRUD ──

router.get('/plans', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const { status, classification, priority, search } = req.query;

    let query = db('mission_plans')
      .select(
        'mission_plans.*',
        'cmd.first_name as commander_first', 'cmd.last_name as commander_last',
        'analyst.first_name as lead_analyst_first', 'analyst.last_name as lead_analyst_last',
      )
      .leftJoin('users as cmd', 'mission_plans.commander_id', 'cmd.id')
      .leftJoin('users as analyst', 'mission_plans.lead_analyst_id', 'analyst.id');

    if (status) query = query.where('mission_plans.status', status);
    if (classification) query = query.where('mission_plans.classification', classification);
    if (priority) query = query.where('mission_plans.priority', priority);
    if (search) query = query.where(function () {
      this.where('mission_plans.title', 'ilike', `%${search}%`)
        .orWhere('mission_plans.objective', 'ilike', `%${search}%`);
    });

    const [items, total] = await Promise.all([
      query.clone().orderBy('created_at', 'desc').limit(limit).offset(offset),
      query.clone().clearSelect().count('mission_plans.id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.get('/plans/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await db('mission_plans')
      .select(
        'mission_plans.*',
        'cmd.first_name as commander_first', 'cmd.last_name as commander_last',
        'analyst.first_name as lead_analyst_first', 'analyst.last_name as lead_analyst_last',
      )
      .leftJoin('users as cmd', 'mission_plans.commander_id', 'cmd.id')
      .leftJoin('users as analyst', 'mission_plans.lead_analyst_id', 'analyst.id')
      .where('mission_plans.id', req.params.id)
      .first();
    if (!item) { res.status(404).json({ error: 'Mission plan not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
});

router.post('/plans', auditLog('mission:create', 'mission_plan'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ref = `MSP-${new Date().getFullYear()}-${String(Date.now() % 100000).padStart(5, '0')}`;
    const [item] = await db('mission_plans').insert({
      id: uuid(),
      reference_number: ref,
      ...req.body,
    }).returning('*');
    eventBus.emit('entity:created', {
      entityType: 'mission_plan',
      entityId: item.id,
      title: item.title || item.reference_number || 'New mission',
      userId: req.user!.userId,
    });
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.put('/plans/:id', auditLog('mission:update', 'mission_plan'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('mission_plans')
      .where({ id: req.params.id }).update({ ...req.body, updated_at: db.fn.now() }).returning('*');
    if (!item) { res.status(404).json({ error: 'Mission plan not found' }); return; }
    eventBus.emit('entity:updated', {
      entityType: 'mission_plan',
      entityId: item.id,
      title: item.title || item.reference_number || 'Updated mission',
      userId: req.user!.userId,
    });
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/plans/:id', auditLog('mission:delete', 'mission_plan'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('mission_plans').where({ id: req.params.id }).del();
    eventBus.emit('entity:deleted', {
      entityType: 'mission_plan',
      entityId: req.params.id,
      title: req.params.id,
      userId: req.user!.userId,
    });
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

// ── Mission Briefs ──

router.get('/plans/:planId/briefs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await db('mission_briefs')
      .select('mission_briefs.*', 'prep.first_name as prepared_by_first', 'prep.last_name as prepared_by_last',
        'app.first_name as approved_by_first', 'app.last_name as approved_by_last')
      .leftJoin('users as prep', 'mission_briefs.prepared_by', 'prep.id')
      .leftJoin('users as app', 'mission_briefs.approved_by', 'app.id')
      .where('mission_briefs.mission_id', req.params.planId)
      .orderBy('version', 'desc');
    res.json({ data: items });
  } catch (e) { next(e); }
});

router.post('/plans/:planId/briefs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('mission_briefs').insert({
      id: uuid(),
      mission_id: req.params.planId,
      prepared_by: req.user!.userId,
      ...req.body,
    }).returning('*');
    eventBus.emit('entity:created', {
      entityType: 'mission_brief',
      entityId: item.id,
      title: item.title || 'New mission brief',
      userId: req.user!.userId,
    });
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.get('/plans/:planId/briefs/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await db('mission_briefs')
      .select('mission_briefs.*', 'prep.first_name as prepared_by_first', 'prep.last_name as prepared_by_last',
        'app.first_name as approved_by_first', 'app.last_name as approved_by_last')
      .leftJoin('users as prep', 'mission_briefs.prepared_by', 'prep.id')
      .leftJoin('users as app', 'mission_briefs.approved_by', 'app.id')
      .where('mission_briefs.id', req.params.id)
      .first();
    if (!item) { res.status(404).json({ error: 'Brief not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
});

router.put('/plans/:planId/briefs/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('mission_briefs')
      .where({ id: req.params.id }).update({ ...req.body, updated_at: db.fn.now() }).returning('*');
    if (!item) { res.status(404).json({ error: 'Brief not found' }); return; }
    eventBus.emit('entity:updated', {
      entityType: 'mission_brief',
      entityId: item.id,
      title: item.title || 'Updated mission brief',
      userId: req.user!.userId,
    });
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/plans/:planId/briefs/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('mission_briefs').where({ id: req.params.id }).del();
    eventBus.emit('entity:deleted', {
      entityType: 'mission_brief',
      entityId: req.params.id,
      title: req.params.id,
      userId: req.user!.userId,
    });
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

// ── Mission Debriefs ──

router.get('/plans/:planId/debriefs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await db('mission_debriefs')
      .select('mission_debriefs.*', 'users.first_name as author_first', 'users.last_name as author_last')
      .leftJoin('users', 'mission_debriefs.author_id', 'users.id')
      .where('mission_debriefs.mission_id', req.params.planId)
      .orderBy('created_at', 'desc');
    res.json({ data: items });
  } catch (e) { next(e); }
});

router.post('/plans/:planId/debriefs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('mission_debriefs').insert({
      id: uuid(),
      mission_id: req.params.planId,
      author_id: req.user!.userId,
      ...req.body,
    }).returning('*');
    eventBus.emit('entity:created', {
      entityType: 'mission_debrief',
      entityId: item.id,
      title: item.title || 'New mission debrief',
      userId: req.user!.userId,
    });
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.get('/plans/:planId/debriefs/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await db('mission_debriefs')
      .select('mission_debriefs.*', 'users.first_name as author_first', 'users.last_name as author_last')
      .leftJoin('users', 'mission_debriefs.author_id', 'users.id')
      .where('mission_debriefs.id', req.params.id)
      .first();
    if (!item) { res.status(404).json({ error: 'Debrief not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
});

router.put('/plans/:planId/debriefs/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('mission_debriefs')
      .where({ id: req.params.id }).update({ ...req.body, updated_at: db.fn.now() }).returning('*');
    if (!item) { res.status(404).json({ error: 'Debrief not found' }); return; }
    eventBus.emit('entity:updated', {
      entityType: 'mission_debrief',
      entityId: item.id,
      title: item.title || 'Updated mission debrief',
      userId: req.user!.userId,
    });
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/plans/:planId/debriefs/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('mission_debriefs').where({ id: req.params.id }).del();
    eventBus.emit('entity:deleted', {
      entityType: 'mission_debrief',
      entityId: req.params.id,
      title: req.params.id,
      userId: req.user!.userId,
    });
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

router.get('/plans/:id/attachments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const attachments = await db('entity_attachments')
      .where({ entity_type: 'mission_plan', entity_id: req.params.id })
      .orderBy('created_at', 'desc');
    res.json({ data: attachments });
  } catch (e) { next(e); }
});

router.post('/plans/:id/attachments', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = req.file;
    if (!file) { res.status(400).json({ error: 'File is required' }); return; }
    const [attachment] = await db('entity_attachments').insert({
      id: uuid(),
      entity_type: 'mission_plan',
      entity_id: req.params.id,
      filename: file.filename,
      original_name: file.originalname,
      mime_type: file.mimetype,
      size: file.size,
      storage_path: `uploads/${file.filename}`,
      uploaded_by: req.user!.userId,
      metadata: req.body.label ? { label: req.body.label } : {},
    }).returning('*');
    res.status(201).json(attachment);
  } catch (e) { next(e); }
});

router.get('/plans/:id/attachments/:aid/download', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const attachment = await db('entity_attachments')
      .where({ id: req.params.aid, entity_type: 'mission_plan', entity_id: req.params.id })
      .first();
    if (!attachment) { res.status(404).json({ error: 'Attachment not found' }); return; }
    const filePath = path.join(config.upload.dir, attachment.filename);
    res.download(filePath, attachment.original_name);
  } catch (e) { next(e); }
});

router.delete('/plans/:id/attachments/:aid', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('entity_attachments')
      .where({ id: req.params.aid, entity_type: 'mission_plan', entity_id: req.params.id })
      .del();
    res.json({ message: 'Attachment removed' });
  } catch (e) { next(e); }
});

export default router;
