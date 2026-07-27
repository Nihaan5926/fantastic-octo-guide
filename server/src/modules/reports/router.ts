import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../../db/knex';
import { authenticate } from '../../middleware/auth';
import { auditLog } from '../../middleware/audit';
import { authorize } from '../../middleware/rbac';
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

router.get('/:id/pdf', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await db('intelligence_reports').where({ id: req.params.id }).first();
    if (!report) { res.status(404).json({ error: 'Not found' }); return; }

    const html = `<!DOCTYPE html>
    <html><head><meta charset="utf-8"><title>${report.title}</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 40px; color: #111; }
      .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
      .classification { color: red; font-weight: bold; font-size: 14px; }
      .meta { color: #666; font-size: 12px; margin-bottom: 20px; }
      .content { line-height: 1.6; }
      .footer { margin-top: 40px; border-top: 1px solid #ccc; padding-top: 10px; font-size: 10px; color: #999; }
    </style></head><body>
      <div class="header">
        <h1>${report.reference_number}: ${report.title}</h1>
        <div class="classification">CLASSIFICATION: ${report.classification}</div>
      </div>
      <div class="meta">Status: ${report.status} | Priority: ${report.priority} | Date: ${new Date(report.created_at).toLocaleDateString()}</div>
      <div class="content"><h2>Summary</h2><p>${(report.summary || '').replace(/\n/g, '<br>')}</p></div>
      <div class="footer">Generated by Intel Collection & Management Platform (ICMP) | ${new Date().toISOString()}</div>
    </body></html>`;

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="${report.reference_number}.html"`);
    res.send(html);
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

router.get('/:id/attachments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const attachments = await db('entity_attachments')
      .where({ entity_type: 'report', entity_id: req.params.id })
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
      entity_type: 'report',
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
      .where({ id: req.params.aid, entity_type: 'report', entity_id: req.params.id })
      .first();
    if (!attachment) { res.status(404).json({ error: 'Attachment not found' }); return; }
    const filePath = path.join(config.upload.dir, attachment.filename);
    res.download(filePath, attachment.original_name);
  } catch (e) { next(e); }
});

router.delete('/:id/attachments/:aid', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('entity_attachments')
      .where({ id: req.params.aid, entity_type: 'report', entity_id: req.params.id })
      .del();
    res.json({ message: 'Attachment removed' });
  } catch (e) { next(e); }
});

// ── Approval Workflow ──

router.put('/:id/submit', auditLog('report:submit', 'report'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await db('intelligence_reports').where({ id: req.params.id }).first();
    if (!report) { res.status(404).json({ error: 'Report not found' }); return; }
    if (report.status !== 'DRAFT') {
      res.status(400).json({ error: 'Only DRAFT reports can be submitted for review' });
      return;
    }
    const [item] = await db('intelligence_reports')
      .where({ id: req.params.id })
      .update({ status: 'IN_REVIEW', submitted_at: db.fn.now(), updated_at: db.fn.now() })
      .returning('*');
    logger.info(`Report submitted for review: ${item.title || item.reference_number}`, { reportId: item.id });
    eventBus.emit('entity:updated', {
      entityType: 'report', entityId: item.id,
      title: item.title || item.reference_number, userId: req.user!.userId,
    });
    res.json(item);
  } catch (e) { next(e); }
});

router.put('/:id/approve', authorize('reports:approve'), auditLog('report:approve', 'report'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await db('intelligence_reports').where({ id: req.params.id }).first();
    if (!report) { res.status(404).json({ error: 'Report not found' }); return; }
    if (report.status !== 'IN_REVIEW') {
      res.status(400).json({ error: 'Only reports IN_REVIEW can be approved' });
      return;
    }
    if (report.author_id === req.user!.userId) {
      res.status(400).json({ error: 'Cannot approve your own report' });
      return;
    }
    const [item] = await db('intelligence_reports')
      .where({ id: req.params.id })
      .update({ status: 'APPROVED', approved_by: req.user!.userId, approved_at: db.fn.now(), updated_at: db.fn.now() })
      .returning('*');
    logger.info(`Report approved: ${item.title || item.reference_number}`, { reportId: item.id, approvedBy: req.user!.userId });
    eventBus.emit('entity:updated', {
      entityType: 'report', entityId: item.id,
      title: item.title || item.reference_number, userId: req.user!.userId,
    });
    res.json(item);
  } catch (e) { next(e); }
});

router.put('/:id/reject', authorize('reports:approve'), auditLog('report:reject', 'report'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rejection_reason } = req.body;
    if (!rejection_reason || !rejection_reason.trim()) {
      res.status(400).json({ error: 'Rejection reason is required' });
      return;
    }
    const report = await db('intelligence_reports').where({ id: req.params.id }).first();
    if (!report) { res.status(404).json({ error: 'Report not found' }); return; }
    if (report.status !== 'IN_REVIEW') {
      res.status(400).json({ error: 'Only reports IN_REVIEW can be rejected' });
      return;
    }
    if (report.author_id === req.user!.userId) {
      res.status(400).json({ error: 'Cannot reject your own report' });
      return;
    }
    const [item] = await db('intelligence_reports')
      .where({ id: req.params.id })
      .update({
        status: 'DRAFT',
        rejection_reason: rejection_reason.trim(),
        updated_at: db.fn.now(),
      })
      .returning('*');
    logger.info(`Report rejected: ${item.title || item.reference_number}`, { reportId: item.id, rejectedBy: req.user!.userId });
    eventBus.emit('entity:updated', {
      entityType: 'report', entityId: item.id,
      title: item.title || item.reference_number, userId: req.user!.userId,
    });
    res.json(item);
  } catch (e) { next(e); }
});

export default router;
