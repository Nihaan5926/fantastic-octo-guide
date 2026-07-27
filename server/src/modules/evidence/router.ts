import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../../db/knex';
import { authenticate } from '../../middleware/auth';
import { auditLog } from '../../middleware/audit';
import { eventBus } from '../../core/event-bus';
import { v4 as uuid } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { config } from '../../config';
import { logger } from '../../utils/logger';

const storage = multer.diskStorage({
  destination: config.upload.dir,
  filename: (_req, file, cb) => {
    cb(null, `${uuid()}-${file.originalname}`);
  },
});
const upload = multer({ storage, limits: { fileSize: config.upload.maxFileSize } });

const router = Router();
router.use(authenticate);

function extractImageDimensions(filePath: string): { width?: number; height?: number } | null {
  try {
    const buf = fs.readFileSync(filePath);
    const header = buf.slice(0, 32);

    if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) {
      return {
        width: header.readUInt32BE(16),
        height: header.readUInt32BE(20),
      };
    }

    if (header[0] === 0xFF && header[1] === 0xD8) {
      let i = 2;
      while (i < buf.length - 1) {
        if (buf[i] !== 0xFF) break;
        const marker = buf[i + 1];
        if (marker === 0xC0 || marker === 0xC2) {
          return {
            width: buf.readUInt16BE(i + 7),
            height: buf.readUInt16BE(i + 5),
          };
        }
        i += 2 + buf.readUInt16BE(i + 2);
      }
    }

    if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x38) {
      return {
        width: buf.readUInt16LE(6),
        height: buf.readUInt16LE(8),
      };
    }

    if (header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50) {
      const vp8 = buf.slice(12, 16);
      if (vp8[3] === 0x20) {
        return {
          width: buf.readUInt16LE(26) & 0x3FFF,
          height: buf.readUInt16LE(28) & 0x3FFF,
        };
      }
    }
  } catch { /* ignore */ }
  return null;
}

function buildMetadata(file: Express.Multer.File): Record<string, any> {
  const meta: Record<string, any> = {
    originalName: file.originalname,
    size: file.size,
    mimeType: file.mimetype,
    uploadedAt: new Date().toISOString(),
  };

  // Compute SHA-256 hash
  try {
    const hash = crypto.createHash('sha256');
    const fileBuffer = fs.readFileSync(file.path);
    hash.update(fileBuffer);
    meta.hash = hash.digest('hex');
  } catch (e) {
    logger.warn('Failed to compute SHA-256 hash', { file: file.originalname, error: e });
  }

  if (file.mimetype.startsWith('image/')) {
    const dims = extractImageDimensions(file.path);
    if (dims) {
      meta.dimensions = dims;
    }
  }

  return meta;
}

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const { type, classification, caseId, reportId } = req.query;

    let query = db('evidence').select('evidence.*', 'users.first_name as uploader_first', 'users.last_name as uploader_last')
      .leftJoin('users', 'evidence.uploaded_by', 'users.id');

    if (type) query = query.where('evidence.type', type);
    if (classification) query = query.where('evidence.classification', classification);
    if (caseId) query = query.where('evidence.case_id', caseId);
    if (reportId) query = query.where('evidence.report_id', reportId);

    const [items, total] = await Promise.all([
      query.clone().orderBy('created_at', 'desc').limit(limit).offset(offset),
      query.clone().clearSelect().count('evidence.id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await db('evidence')
      .select('evidence.*', 'users.first_name as uploader_first', 'users.last_name as uploader_last')
      .leftJoin('users', 'evidence.uploaded_by', 'users.id')
      .where('evidence.id', req.params.id)
      .first();
    if (!item) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
});

router.post('/', auditLog('evidence:upload', 'evidence'), upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = req.file;
    const data = req.body;
    const evidenceId = uuid();
    const metadata = file ? buildMetadata(file) : {};

    const custodyEntry = {
      action: 'UPLOADED',
      timestamp: new Date().toISOString(),
      user_id: req.user!.userId,
    };

    const [item] = await db('evidence').insert({
      id: evidenceId,
      type: data.type || 'OTHER',
      title: data.title || file?.originalname || 'Untitled',
      description: data.description,
      case_id: data.caseId || null,
      report_id: data.reportId || null,
      file_path: file ? file.filename : null,
      file_size: file ? file.size : null,
      mime_type: file ? file.mimetype : null,
      classification: data.classification || 'UNCLASSIFIED',
      uploaded_by: req.user!.userId,
      metadata: JSON.stringify(metadata),
      chain_of_custody: JSON.stringify([custodyEntry]),
    }).returning('*');

    eventBus.emit('entity:created', {
      entityType: 'evidence',
      entityId: item.id,
      title: item.title || 'New evidence',
      userId: req.user!.userId,
    });

    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.get('/:id/download', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await db('evidence').where({ id: req.params.id }).first();
    if (!item || !item.file_path) { res.status(404).json({ error: 'File not found' }); return; }
    const filePath = path.join(config.upload.dir, item.file_path);
    res.download(filePath, item.title || item.file_path);
  } catch (e) { next(e); }
});

router.get('/:id/preview', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await db('evidence').where({ id: req.params.id }).first();
    if (!item || !item.file_path) { res.status(404).json({ error: 'File not found' }); return; }
    const filePath = path.join(config.upload.dir, item.file_path);
    if (!fs.existsSync(filePath)) { res.status(404).json({ error: 'File missing on disk' }); return; }
    res.setHeader('Content-Disposition', `inline; filename="${item.file_path}"`);
    res.setHeader('Content-Type', item.mime_type || 'application/octet-stream');
    fs.createReadStream(filePath).pipe(res);
  } catch (e) { next(e); }
});

router.post('/:id/custody', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { action } = req.body;
    if (!action) { res.status(400).json({ error: 'action is required' }); return; }

    const item = await db('evidence').where({ id: req.params.id }).first();
    if (!item) { res.status(404).json({ error: 'Not found' }); return; }

    const entry = {
      action,
      timestamp: new Date().toISOString(),
      user_id: req.user!.userId,
    };

    const current = Array.isArray(item.chain_of_custody)
      ? item.chain_of_custody
      : (typeof item.chain_of_custody === 'string' ? JSON.parse(item.chain_of_custody || '[]') : []);

    current.push(entry);

    const [updated] = await db('evidence').where({ id: req.params.id })
      .update({ chain_of_custody: JSON.stringify(current), updated_at: db.fn.now() })
      .returning('*');

    res.json(updated);
  } catch (e) { next(e); }
});

router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('evidence').where({ id: req.params.id })
      .update({ ...req.body, updated_at: db.fn.now() }).returning('*');
    if (!item) { res.status(404).json({ error: 'Not found' }); return; }
    eventBus.emit('entity:updated', {
      entityType: 'evidence',
      entityId: item.id,
      title: item.title || 'Updated evidence',
      userId: req.user!.userId,
    });
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/:id', auditLog('evidence:delete', 'evidence'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await db('evidence').where({ id: req.params.id }).first();
    if (item?.file_path) {
      const filePath = path.join(config.upload.dir, item.file_path);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    await db('evidence').where({ id: req.params.id }).del();
    eventBus.emit('entity:deleted', {
      entityType: 'evidence',
      entityId: req.params.id,
      title: item?.title || req.params.id,
      userId: req.user!.userId,
    });
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

// ── Integrity Verification ──

router.get('/:id/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await db('evidence').where({ id: req.params.id }).first();
    if (!item) { res.status(404).json({ error: 'Not found' }); return; }

    let storedHash: string | null = null;
    const metadata = typeof item.metadata === 'string' ? JSON.parse(item.metadata || '{}') : (item.metadata || {});

    if (!item.file_path) {
      res.json({ valid: false, storedHash: null, computedHash: null, message: 'No file associated with this evidence' });
      return;
    }

    const filePath = path.join(config.upload.dir, item.file_path);
    if (!fs.existsSync(filePath)) {
      res.json({ valid: false, storedHash: metadata.hash || null, computedHash: null, message: 'File not found on disk' });
      return;
    }

    const fileBuffer = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha256');
    hash.update(fileBuffer);
    const computedHash = hash.digest('hex');
    storedHash = metadata.hash || null;

    const valid = storedHash !== null && storedHash === computedHash;

    res.json({ valid, storedHash, computedHash });
  } catch (e) { next(e); }
});

export default router;
