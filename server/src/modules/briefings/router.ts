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
    eventBus.emit('entity:created', {
      entityType: 'briefing',
      entityId: item.id,
      title: item.title || item.reference_number || 'New briefing',
      userId: req.user!.userId,
    });
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('briefings').where({ id: req.params.id })
      .update({ ...req.body, updated_at: db.fn.now() }).returning('*');
    if (!item) { res.status(404).json({ error: 'Briefing not found' }); return; }
    eventBus.emit('entity:updated', {
      entityType: 'briefing',
      entityId: item.id,
      title: item.title || item.reference_number || 'Updated briefing',
      userId: req.user!.userId,
    });
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('briefings').where({ id: req.params.id }).del();
    eventBus.emit('entity:deleted', {
      entityType: 'briefing',
      entityId: req.params.id,
      title: req.params.id,
      userId: req.user!.userId,
    });
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

// ── Export to Slides ──

router.post('/:id/export', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const briefing = await db('briefings')
      .select('briefings.*', 'users.first_name as author_first', 'users.last_name as author_last')
      .leftJoin('users', 'briefings.prepared_by', 'users.id')
      .where('briefings.id', req.params.id)
      .first();

    if (!briefing) { res.status(404).json({ error: 'Briefing not found' }); return; }

    const content = typeof briefing.content === 'string' ? JSON.parse(briefing.content || '{}') : (briefing.content || {});
    const slides: string[] = content.slides || content.sections || [];

    let slidesHtml = '';
    const totalSlides = Array.isArray(slides) ? slides.length : 0;
    if (Array.isArray(slides)) {
      slides.forEach((slide: any, i: number) => {
        const title = typeof slide === 'string' ? slide : (slide.title || `Slide ${i + 1}`);
        const body = typeof slide === 'string' ? '' : (slide.body || slide.content || '');
        slidesHtml += `<section class="slide">
          <h2>${title}</h2>
          <div class="slide-body">${body}</div>
          <div class="page-num">${i + 1} / ${totalSlides}</div>
        </section>`;
      });
    }

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${briefing.title}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #1a1a2e; color: #eee; }
  .title-slide { display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; background: linear-gradient(135deg, #16213e, #0f3460); page-break-after: always; }
  .title-slide h1 { font-size: 48px; margin-bottom: 20px; color: #e94560; text-align: center; padding: 0 40px; }
  .title-slide .subtitle { font-size: 20px; color: #a0a0b0; margin-bottom: 40px; }
  .title-slide .meta { font-size: 14px; color: #606080; }
  .slide { height: 100vh; display: flex; flex-direction: column; justify-content: center; padding: 60px 80px; page-break-after: always; background: #1a1a2e; }
  .slide h2 { font-size: 36px; color: #e94560; margin-bottom: 30px; border-bottom: 3px solid #0f3460; padding-bottom: 12px; }
  .slide-body { font-size: 22px; line-height: 1.8; color: #d0d0e0; flex: 1; }
  .page-num { font-size: 14px; color: #606080; text-align: right; margin-top: 20px; }
  .classification-strip { background: #e94560; color: #fff; text-align: center; padding: 6px; font-size: 12px; font-weight: bold; letter-spacing: 2px; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .slide, .title-slide { page-break-after: always; }
  }
</style></head><body>
  <div class="classification-strip">${briefing.classification}</div>
  <section class="title-slide">
    <h1>${briefing.title}</h1>
    <div class="subtitle">${briefing.reference_number}</div>
    <div class="meta">
      Prepared by: ${[briefing.author_first, briefing.author_last].filter(Boolean).join(' ') || 'N/A'}<br>
      Status: ${briefing.status}<br>
      Date: ${new Date().toLocaleDateString()}
    </div>
  </section>
  ${slidesHtml}
</body></html>`;

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="briefing-${briefing.reference_number}.html"`);
    res.send(html);
  } catch (e) { next(e); }
});

export default router;
