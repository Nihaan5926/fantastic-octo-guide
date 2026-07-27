import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../../db/knex';
import { authenticate } from '../../middleware/auth';
import { auditLog } from '../../middleware/audit';
import { eventBus } from '../../core/event-bus';
import { v4 as uuid } from 'uuid';
import { sanitizeInput } from '../../utils/validators';
import { logger } from '../../utils/logger';
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

// ── Collection Routes ──

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const { status, priority, search } = req.query;

    let query = db('cases')
      .select('cases.*', 'users.first_name as lead_first', 'users.last_name as lead_last')
      .leftJoin('users', 'cases.lead_analyst_id', 'users.id');

    if (status) query = query.where('cases.status', status);
    if (priority) query = query.where('cases.priority', priority);
    if (search) query = query.where(function () {
      this.where('cases.title', 'ilike', `%${search}%`).orWhere('cases.description', 'ilike', `%${search}%`);
    });

    const [items, total] = await Promise.all([
      query.clone().orderBy('created_at', 'desc').limit(limit).offset(offset),
      query.clone().clearSelect().count('cases.id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.post('/', auditLog('case:create', 'case'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = sanitizeInput(req.body);
    const ref = `CASE-${new Date().getFullYear()}-${String(Date.now() % 100000).padStart(4, '0')}`;
    const [item] = await db('cases').insert({
      id: uuid(), reference_number: ref, lead_analyst_id: req.user!.userId, ...body,
    }).returning('*');
    logger.info(`Case created: ${item.title || ref}`, { caseId: item.id });

    eventBus.emit('entity:created', {
      entityType: 'case',
      entityId: item.id,
      title: item.title || ref,
      userId: req.user!.userId,
    });

    res.status(201).json(item);
  } catch (e) { next(e); }
});

// ── Sub-Routes (must come before generic /:id) ──

router.get('/:id/children', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const children = await db('cases')
      .select('cases.*', 'users.first_name as lead_first', 'users.last_name as lead_last')
      .leftJoin('users', 'cases.lead_analyst_id', 'users.id')
      .where('cases.parent_case_id', req.params.id)
      .orderBy('cases.created_at', 'desc');
    res.json({ data: children });
  } catch (e: any) {
    if (e.message?.includes('does not exist')) { res.json({ data: [] }); return; }
    next(e);
  }
});

router.post('/:id/children', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = sanitizeInput(req.body);
    const parent = await db('cases').where({ id: req.params.id }).first();
    if (!parent) { res.status(404).json({ error: 'Parent case not found' }); return; }
    const ref = `CASE-${new Date().getFullYear()}-${String(Date.now() % 100000).padStart(4, '0')}`;
    const [item] = await db('cases').insert({
      id: uuid(), reference_number: ref, parent_case_id: req.params.id,
      lead_analyst_id: req.user!.userId, ...body,
    }).returning('*');
    logger.info(`Sub-case created: ${item.title || ref} under ${parent.title || parent.reference_number}`, { caseId: item.id, parentId: req.params.id });
    eventBus.emit('entity:created', {
      entityType: 'case',
      entityId: item.id,
      title: item.title || ref,
      userId: req.user!.userId,
    });
    res.status(201).json(item);
  } catch (e: any) {
    if (e.message?.includes('does not exist')) { res.status(400).json({ error: 'Case hierarchy not available. Please run database migrations.' }); return; }
    next(e);
  }
});

router.post('/:id/members', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, role } = req.body;
    const [member] = await db('case_members').insert({
      id: uuid(), case_id: req.params.id, user_id: userId, role: role || 'ANALYST',
    }).returning('*');
    res.status(201).json(member);
  } catch (e) { next(e); }
});

router.delete('/:id/members/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('case_members').where({ case_id: req.params.id, user_id: req.params.userId }).del();
    res.json({ message: 'Member removed' });
  } catch (e) { next(e); }
});

router.get('/:id/timeline', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activities = await db('activity_feed')
      .select('activity_feed.*', 'users.first_name', 'users.last_name')
      .leftJoin('users', 'activity_feed.user_id', 'users.id')
      .where('activity_feed.entity_type', 'case')
      .where('activity_feed.entity_id', req.params.id)
      .orderBy('activity_feed.created_at', 'desc');

    const comments = await db('entity_comments')
      .select('entity_comments.*', 'users.first_name', 'users.last_name')
      .leftJoin('users', 'entity_comments.author_id', 'users.id')
      .where('entity_comments.entity_type', 'case')
      .where('entity_comments.entity_id', req.params.id)
      .orderBy('entity_comments.created_at', 'desc');

    const timeline = [
      ...activities.map((a: any) => ({ ...a, timeline_type: 'activity' })),
      ...comments.map((c: any) => ({ ...c, timeline_type: 'comment' })),
    ].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    res.json({ data: timeline });
  } catch (e) { next(e); }
});

router.get('/:id/attachments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const attachments = await db('entity_attachments')
      .where({ entity_type: 'case', entity_id: req.params.id })
      .orderBy('created_at', 'desc');
    res.json({ data: attachments });
  } catch (e) { next(e); }
});

router.post('/:id/attachments', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = req.file;
    if (!file) { res.status(400).json({ error: 'File is required' }); return; }
    const [attachment] = await db('entity_attachments').insert({
      id: uuid(),
      entity_type: 'case',
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

router.get('/:id/attachments/:aid/download', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const attachment = await db('entity_attachments')
      .where({ id: req.params.aid, entity_type: 'case', entity_id: req.params.id })
      .first();
    if (!attachment) { res.status(404).json({ error: 'Attachment not found' }); return; }
    const filePath = path.join(config.upload.dir, attachment.filename);
    res.download(filePath, attachment.original_name);
  } catch (e) { next(e); }
});

router.delete('/:id/attachments/:aid', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('entity_attachments')
      .where({ id: req.params.aid, entity_type: 'case', entity_id: req.params.id })
      .del();
    res.json({ message: 'Attachment removed' });
  } catch (e) { next(e); }
});

// ── Generic Routes (must come LAST among same method) ──

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await db('cases')
      .select('cases.*', 'users.first_name as lead_first', 'users.last_name as lead_last')
      .leftJoin('users', 'cases.lead_analyst_id', 'users.id')
      .where('cases.id', req.params.id).first();
    if (!item) { res.status(404).json({ error: 'Not found' }); return; }

    const members = await db('case_members')
      .select('case_members.*', 'users.first_name', 'users.last_name', 'users.email')
      .leftJoin('users', 'case_members.user_id', 'users.id')
      .where('case_members.case_id', req.params.id);

    res.json({ ...item, members });
  } catch (e) { next(e); }
});

router.put('/:id', auditLog('case:update', 'case'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = sanitizeInput(req.body);
    const [item] = await db('cases').where({ id: req.params.id })
      .update({ ...body, updated_at: db.fn.now() }).returning('*');
    if (!item) { res.status(404).json({ error: 'Not found' }); return; }
    logger.info(`Case updated: ${item.title || item.reference_number}`, { caseId: item.id });

    eventBus.emit('entity:updated', {
      entityType: 'case',
      entityId: item.id,
      title: item.title || item.reference_number,
      userId: req.user!.userId,
    });

    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/:id', auditLog('case:delete', 'case'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const existing = await db('cases').where({ id: req.params.id }).first();
    await db('cases').where({ id: req.params.id }).del();

    if (existing) {
      eventBus.emit('entity:deleted', {
        entityType: 'case',
        entityId: req.params.id,
        title: existing.title || existing.reference_number,
        userId: req.user!.userId,
      });
    }

    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

export default router;
