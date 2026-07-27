import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../../db/knex';
import { authenticate } from '../../middleware/auth';
import { auditLog } from '../../middleware/audit';
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
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/:id', auditLog('source:delete', 'source'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('sources').where({ id: req.params.id }).del();
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

export default router;
