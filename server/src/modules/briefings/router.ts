import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../../db/knex';
import { authenticate } from '../../middleware/auth';
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

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const { status, classification, search } = req.query;

    let query = db('briefings')
      .select('briefings.*', 'users.first_name as author_first', 'users.last_name as author_last')
      .leftJoin('users', 'briefings.prepared_by', 'users.id');

    if (status) query = query.where('briefings.status', status);
    if (classification) query = query.where('briefings.classification', classification);
    if (search) query = query.where(function () {
      this.where('briefings.title', 'ilike', `%${search}%`)
        .orWhere('briefings.reference_number', 'ilike', `%${search}%`);
    });

    const [items, total] = await Promise.all([
      query.clone().orderBy('briefings.created_at', 'desc').limit(limit).offset(offset),
      query.clone().clearSelect().count('briefings.id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await db('briefings')
      .select('briefings.*', 'users.first_name as author_first', 'users.last_name as author_last')
      .leftJoin('users', 'briefings.prepared_by', 'users.id')
      .where('briefings.id', req.params.id).first();
    if (!item) { res.status(404).json({ error: 'Briefing not found' }); return; }

    const distributions = await db('briefing_distributions')
      .select('briefing_distributions.*', 'users.first_name', 'users.last_name', 'users.email')
      .leftJoin('users', 'briefing_distributions.recipient_user_id', 'users.id')
      .where('briefing_distributions.briefing_id', req.params.id);

    res.json({ ...item, distributions });
  } catch (e) { next(e); }
});

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ref = `BRF-${new Date().getFullYear()}-${String(Date.now() % 100000).padStart(5, '0')}`;
    const [item] = await db('briefings').insert({
      id: uuid(),
      reference_number: ref,
      ...req.body,
      prepared_by: req.user!.userId,
    }).returning('*');
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('briefings').where({ id: req.params.id })
      .update({ ...req.body, updated_at: db.fn.now() }).returning('*');
    if (!item) { res.status(404).json({ error: 'Briefing not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('briefings').where({ id: req.params.id }).del();
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

router.post('/:id/distributions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [dist] = await db('briefing_distributions').insert({
      id: uuid(), briefing_id: req.params.id, ...req.body,
    }).returning('*');
    res.status(201).json(dist);
  } catch (e) { next(e); }
});

router.delete('/:id/distributions/:distId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('briefing_distributions').where({ id: req.params.distId, briefing_id: req.params.id }).del();
    res.json({ message: 'Distribution removed' });
  } catch (e) { next(e); }
});

router.get('/:id/attachments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const attachments = await db('entity_attachments')
      .where({ entity_type: 'briefing', entity_id: req.params.id })
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
      entity_type: 'briefing',
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
      .where({ id: req.params.aid, entity_type: 'briefing', entity_id: req.params.id })
      .first();
    if (!attachment) { res.status(404).json({ error: 'Attachment not found' }); return; }
    const filePath = path.join(config.upload.dir, attachment.filename);
    res.download(filePath, attachment.original_name);
  } catch (e) { next(e); }
});

router.delete('/:id/attachments/:aid', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('entity_attachments')
      .where({ id: req.params.aid, entity_type: 'briefing', entity_id: req.params.id })
      .del();
    res.json({ message: 'Attachment removed' });
  } catch (e) { next(e); }
});

export default router;
