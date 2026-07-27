import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../../db/knex';
import { authenticate } from '../../middleware/auth';
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

// Threat Actors
router.get('/actors', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const { status, sophistication, search } = req.query;

    let query = db('threat_actors').select('*');
    if (status) query = query.where('status', status);
    if (sophistication) query = query.where('sophistication', sophistication);
    if (search) query = query.where(function () {
      this.where('name', 'ilike', `%${search}%`).orWhere('description', 'ilike', `%${search}%`);
    });

    const [items, total] = await Promise.all([
      query.clone().orderBy('created_at', 'desc').limit(limit).offset(offset),
      query.clone().clearSelect().count('id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.get('/actors/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await db('threat_actors').where({ id: req.params.id }).first();
    if (!item) { res.status(404).json({ error: 'Not found' }); return; }
    const indicators = await db('indicators').where({ threat_actor_id: req.params.id });
    res.json({ ...item, indicators });
  } catch (e) { next(e); }
});

router.post('/actors', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('threat_actors').insert({ id: uuid(), ...req.body }).returning('*');
    eventBus.emit('entity:created', {
      entityType: 'threat_actor',
      entityId: item.id,
      title: item.name || 'New threat actor',
      userId: req.user!.userId,
    });
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.put('/actors/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('threat_actors').where({ id: req.params.id })
      .update({ ...req.body, updated_at: db.fn.now() }).returning('*');
    if (!item) { res.status(404).json({ error: 'Not found' }); return; }
    eventBus.emit('entity:updated', {
      entityType: 'threat_actor',
      entityId: item.id,
      title: item.name || 'Updated threat actor',
      userId: req.user!.userId,
    });
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/actors/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('threat_actors').where({ id: req.params.id }).del();
    eventBus.emit('entity:deleted', {
      entityType: 'threat_actor',
      entityId: req.params.id,
      title: req.params.id,
      userId: req.user!.userId,
    });
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

// Indicators
router.get('/indicators', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const { type, search } = req.query;

    let query = db('indicators')
      .select('indicators.*', 'threat_actors.name as actor_name')
      .leftJoin('threat_actors', 'indicators.threat_actor_id', 'threat_actors.id');

    if (type) query = query.where('indicators.type', type);
    if (search) query = query.where('indicators.value', 'ilike', `%${search}%`);

    const [items, total] = await Promise.all([
      query.clone().orderBy('indicators.created_at', 'desc').limit(limit).offset(offset),
      query.clone().clearSelect().count('indicators.id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.post('/indicators', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('indicators').insert({ id: uuid(), ...req.body }).returning('*');
    eventBus.emit('entity:created', {
      entityType: 'indicator',
      entityId: item.id,
      title: item.value || 'New indicator',
      userId: req.user!.userId,
    });
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.delete('/indicators/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('indicators').where({ id: req.params.id }).del();
    eventBus.emit('entity:deleted', {
      entityType: 'indicator',
      entityId: req.params.id,
      title: req.params.id,
      userId: req.user!.userId,
    });
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

router.get('/actors/:id/relationships', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actorId = req.params.id;
    const relationships = await db('entity_relationships')
      .select('*')
      .where(function () {
        this.where(function () {
          this.where('source_type', 'threat_actor').andWhere('source_id', actorId);
        }).orWhere(function () {
          this.where('target_type', 'threat_actor').andWhere('target_id', actorId);
        });
      })
      .orderBy('created_at', 'desc');

    res.json({ data: relationships });
  } catch (e) { next(e); }
});

router.get('/actors/:id/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actorId = req.params.id;

    const [indicatorCount] = await db('indicators')
      .where({ threat_actor_id: actorId })
      .count('id as count');

    const [relatedCaseCount] = await db('entity_relationships')
      .where(function () {
        this.where(function () {
          this.where('source_type', 'threat_actor').andWhere('source_id', actorId);
        }).orWhere(function () {
          this.where('target_type', 'threat_actor').andWhere('target_id', actorId);
        });
      })
      .andWhere(function () {
        this.where('source_type', 'case').orWhere('target_type', 'case');
      })
      .count('id as count');

    const confidenceRows = await db('indicators')
      .where({ threat_actor_id: actorId })
      .select('confidence');

    const confidenceOrder: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
    const confScores = confidenceRows
      .map((r: any) => confidenceOrder[r.confidence] || 0)
      .filter((s: number) => s > 0);
    const avgScore = confScores.length > 0
      ? confScores.reduce((a: number, b: number) => a + b, 0) / confScores.length
      : 0;

    const avgLabel = avgScore > 0
      ? Object.entries(confidenceOrder).find(([, v]) => v === Math.round(avgScore))?.[0] || null
      : null;

    res.json({
      indicatorCount: parseInt(String(indicatorCount.count), 10),
      relatedCaseCount: parseInt(String(relatedCaseCount.count), 10),
      avgConfidence: avgLabel,
    });
  } catch (e) { next(e); }
});

router.get('/actors/:id/attachments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const attachments = await db('entity_attachments')
      .where({ entity_type: 'threat_actor', entity_id: req.params.id })
      .orderBy('created_at', 'desc');
    res.json({ data: attachments });
  } catch (e) { next(e); }
});

router.post('/actors/:id/attachments', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = req.file;
    if (!file) { res.status(400).json({ error: 'File is required' }); return; }
    const [attachment] = await db('entity_attachments').insert({
      id: uuid(),
      entity_type: 'threat_actor',
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

router.get('/actors/:id/attachments/:aid/download', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const attachment = await db('entity_attachments')
      .where({ id: req.params.aid, entity_type: 'threat_actor', entity_id: req.params.id })
      .first();
    if (!attachment) { res.status(404).json({ error: 'Attachment not found' }); return; }
    const filePath = path.join(config.upload.dir, attachment.filename);
    res.download(filePath, attachment.original_name);
  } catch (e) { next(e); }
});

router.delete('/actors/:id/attachments/:aid', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('entity_attachments')
      .where({ id: req.params.aid, entity_type: 'threat_actor', entity_id: req.params.id })
      .del();
    res.json({ message: 'Attachment removed' });
  } catch (e) { next(e); }
});

export default router;
