import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../../db/knex';
import { authenticate } from '../../middleware/auth';
import { v4 as uuid } from 'uuid';

const router = Router();
router.use(authenticate);

// FININT Transactions
router.get('/transactions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const { transaction_type, flagged, currency, search } = req.query;

    let query = db('fint_transactions')
      .select('fint_transactions.*',
        'sender.name as sender_name',
        'receiver.name as receiver_name')
      .leftJoin({ sender: 'fint_entities' }, 'fint_transactions.sender_entity_id', 'sender.id')
      .leftJoin({ receiver: 'fint_entities' }, 'fint_transactions.receiver_entity_id', 'receiver.id');

    if (transaction_type) query = query.where('fint_transactions.transaction_type', transaction_type);
    if (flagged !== undefined) query = query.where('fint_transactions.flagged', flagged === 'true');
    if (currency) query = query.where('fint_transactions.currency', currency);
    if (search) query = query.where(function () {
      this.where('fint_transactions.transaction_ref', 'ilike', `%${search}%`)
        .orWhere('fint_transactions.description', 'ilike', `%${search}%`);
    });

    const [items, total] = await Promise.all([
      query.clone().orderBy('fint_transactions.transaction_date', 'desc').limit(limit).offset(offset),
      query.clone().clearSelect().count('fint_transactions.id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.get('/transactions/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await db('fint_transactions')
      .select('fint_transactions.*',
        'sender.name as sender_name',
        'receiver.name as receiver_name')
      .leftJoin({ sender: 'fint_entities' }, 'fint_transactions.sender_entity_id', 'sender.id')
      .leftJoin({ receiver: 'fint_entities' }, 'fint_transactions.receiver_entity_id', 'receiver.id')
      .where('fint_transactions.id', req.params.id)
      .first();
    if (!item) { res.status(404).json({ error: 'Transaction not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
});

router.post('/transactions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('fint_transactions').insert({ id: uuid(), ...req.body }).returning('*');
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.put('/transactions/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('fint_transactions')
      .where({ id: req.params.id }).update({ ...req.body }).returning('*');
    if (!item) { res.status(404).json({ error: 'Transaction not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/transactions/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('fint_transactions').where({ id: req.params.id }).del();
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

// FININT Entities
router.get('/entities', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const { entity_type, jurisdiction, search } = req.query;

    let query = db('fint_entities').select('*');

    if (entity_type) query = query.where('entity_type', entity_type);
    if (jurisdiction) query = query.where('jurisdiction', jurisdiction);
    if (search) query = query.where(function () {
      this.where('name', 'ilike', `%${search}%`)
        .orWhere('description', 'ilike', `%${search}%`);
    });

    const [items, total] = await Promise.all([
      query.clone().orderBy('created_at', 'desc').limit(limit).offset(offset),
      query.clone().clearSelect().count('id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.get('/entities/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await db('fint_entities').where({ id: req.params.id }).first();
    if (!item) { res.status(404).json({ error: 'Entity not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
});

router.post('/entities', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('fint_entities').insert({ id: uuid(), ...req.body }).returning('*');
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.put('/entities/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('fint_entities')
      .where({ id: req.params.id }).update({ ...req.body, updated_at: db.fn.now() }).returning('*');
    if (!item) { res.status(404).json({ error: 'Entity not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/entities/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('fint_entities').where({ id: req.params.id }).del();
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

export default router;
