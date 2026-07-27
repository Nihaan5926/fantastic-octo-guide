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

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const { type, status, search } = req.query;

    let query = db('sources').select('*');
    if (type) query = query.where('type', type);
    if (status) query = query.where('status', status);
    if (search) query = query.where(function () {
      this.where('code_name', 'ilike', `%${search}%`).orWhere('description', 'ilike', `%${search}%`);
    });

    const [items, total] = await Promise.all([
      query.clone().orderBy('created_at', 'desc').limit(limit).offset(offset),
      query.clone().clearSelect().count('id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  // Skip if this looks like a static route
  if (req.params.id === 'reliability-matrix') return next();
  try {
    const item = await db('sources').where({ id: req.params.id }).first();
    if (!item) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
});

router.post('/', auditLog('source:create', 'source'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = sanitizeInput(req.body);
    const [item] = await db('sources').insert({ id: uuid(), ...body }).returning('*');
    logger.info(`Source created: ${item.code_name}`, { sourceId: item.id });
    eventBus.emit('entity:created', {
      entityType: 'source',
      entityId: item.id,
      title: item.code_name || 'New source',
      userId: req.user!.userId,
    });
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.put('/:id', auditLog('source:update', 'source'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = sanitizeInput(req.body);
    const [item] = await db('sources').where({ id: req.params.id })
      .update({ ...body, updated_at: db.fn.now() }).returning('*');
    if (!item) { res.status(404).json({ error: 'Not found' }); return; }
    logger.info(`Source updated: ${item.code_name}`, { sourceId: item.id });
    eventBus.emit('entity:updated', {
      entityType: 'source',
      entityId: item.id,
      title: item.code_name || 'Updated source',
      userId: req.user!.userId,
    });
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/:id', auditLog('source:delete', 'source'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('sources').where({ id: req.params.id }).del();
    eventBus.emit('entity:deleted', {
      entityType: 'source',
      entityId: req.params.id,
      title: req.params.id,
      userId: req.user!.userId,
    });
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

router.get('/:id/attachments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const attachments = await db('entity_attachments')
      .where({ entity_type: 'source', entity_id: req.params.id })
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
      entity_type: 'source',
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
      .where({ id: req.params.aid, entity_type: 'source', entity_id: req.params.id })
      .first();
    if (!attachment) { res.status(404).json({ error: 'Attachment not found' }); return; }
    const filePath = path.join(config.upload.dir, attachment.filename);
    res.download(filePath, attachment.original_name);
  } catch (e) { next(e); }
});

router.delete('/:id/attachments/:aid', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('entity_attachments')
      .where({ id: req.params.aid, entity_type: 'source', entity_id: req.params.id })
      .del();
    res.json({ message: 'Attachment removed' });
  } catch (e) { next(e); }
});

router.get('/reliability-matrix', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const sources = await db('sources').select('*').orderBy('code_name', 'asc');

    const grouped: Record<string, any[]> = {};
    const reliabilityLetters = ['A', 'B', 'C', 'D', 'E', 'F'];

    for (const letter of reliabilityLetters) {
      grouped[letter] = [];
    }

    for (const s of sources) {
      const rating = s.reliability_rating || 'F-6';
      const letter = rating.charAt(0).toUpperCase();
      if (grouped[letter]) {
        grouped[letter].push(s);
      } else {
        grouped['F'].push(s);
      }
    }

    const total = sources.length;
    const active = sources.filter((s: any) => s.status === 'ACTIVE').length;
    const inactive = sources.filter((s: any) => s.status === 'INACTIVE').length;
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    for (const s of sources) {
      byType[s.type] = (byType[s.type] || 0) + 1;
      byStatus[s.status] = (byStatus[s.status] || 0) + 1;
    }

    const credibilityScores = sources
      .map((s: any) => s.credibility_score)
      .filter((score: number | null) => score != null);
    const avgCredibility = credibilityScores.length > 0
      ? Math.round((credibilityScores.reduce((a: number, b: number) => a + b, 0) / credibilityScores.length) * 10) / 10
      : 0;

    res.json({
      data: {
        grouped,
        cells: sources.map((s: any) => {
          const rating = s.reliability_rating || 'F-6';
          const letter = rating.charAt(0).toUpperCase();
          const num = parseInt(rating.charAt(2)) || s.credibility_score || 1;
          return {
            id: s.id,
            code_name: s.code_name,
            type: s.type,
            status: s.status,
            reliability_rating: rating,
            reliability_letter: letter,
            credibility_score: Math.min(6, Math.max(1, num)),
            last_contact: s.last_contact_at,
          };
        }),
        statistics: {
          total,
          active,
          inactive,
          by_type: byType,
          by_status: byStatus,
          avg_credibility: avgCredibility,
        },
      },
    });
  } catch (e) { next(e); }
});

export default router;
