import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../../db/knex';
import { authenticate } from '../../middleware/auth';
import { v4 as uuid } from 'uuid';

const router = Router();
router.use(authenticate);

// Biometric Records
router.get('/records', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const { biometric_type, classification, search } = req.query;

    let query = db('biometric_records')
      .select('biometric_records.*',
        'users.first_name as collector_first', 'users.last_name as collector_last')
      .leftJoin('users', 'biometric_records.collector_id', 'users.id');

    if (biometric_type) query = query.where('biometric_records.biometric_type', biometric_type);
    if (classification) query = query.where('biometric_records.classification', classification);
    if (search) query = query.where(function () {
      this.where('biometric_records.subject_name', 'ilike', `%${search}%`)
        .orWhere('biometric_records.notes', 'ilike', `%${search}%`);
    });

    const [items, total] = await Promise.all([
      query.clone().orderBy('biometric_records.created_at', 'desc').limit(limit).offset(offset),
      query.clone().clearSelect().count('biometric_records.id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.get('/records/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await db('biometric_records')
      .select('biometric_records.*',
        'users.first_name as collector_first', 'users.last_name as collector_last')
      .leftJoin('users', 'biometric_records.collector_id', 'users.id')
      .where('biometric_records.id', req.params.id)
      .first();
    if (!item) { res.status(404).json({ error: 'Record not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
});

router.post('/records', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('biometric_records').insert({
      id: uuid(),
      collector_id: req.user!.userId,
      ...req.body,
    }).returning('*');
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.put('/records/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('biometric_records')
      .where({ id: req.params.id }).update({ ...req.body }).returning('*');
    if (!item) { res.status(404).json({ error: 'Record not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/records/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('biometric_records').where({ id: req.params.id }).del();
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

// Biometric Watchlists
router.get('/watchlists', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const { list_type, is_active, search } = req.query;

    let query = db('biometric_watchlists')
      .select('biometric_watchlists.*',
        'users.first_name as owner_first', 'users.last_name as owner_last')
      .leftJoin('users', 'biometric_watchlists.owner_id', 'users.id');

    if (list_type) query = query.where('biometric_watchlists.list_type', list_type);
    if (is_active !== undefined) query = query.where('biometric_watchlists.is_active', is_active === 'true');
    if (search) query = query.where(function () {
      this.where('biometric_watchlists.name', 'ilike', `%${search}%`)
        .orWhere('biometric_watchlists.description', 'ilike', `%${search}%`);
    });

    const [items, total] = await Promise.all([
      query.clone().orderBy('biometric_watchlists.created_at', 'desc').limit(limit).offset(offset),
      query.clone().clearSelect().count('biometric_watchlists.id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.get('/watchlists/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await db('biometric_watchlists')
      .select('biometric_watchlists.*',
        'users.first_name as owner_first', 'users.last_name as owner_last')
      .leftJoin('users', 'biometric_watchlists.owner_id', 'users.id')
      .where('biometric_watchlists.id', req.params.id)
      .first();
    if (!item) { res.status(404).json({ error: 'Watchlist not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
});

router.post('/watchlists', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('biometric_watchlists').insert({
      id: uuid(),
      owner_id: req.user!.userId,
      ...req.body,
    }).returning('*');
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.put('/watchlists/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('biometric_watchlists')
      .where({ id: req.params.id }).update({ ...req.body, updated_at: db.fn.now() }).returning('*');
    if (!item) { res.status(404).json({ error: 'Watchlist not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/watchlists/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('biometric_watchlists').where({ id: req.params.id }).del();
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

// Biometric Encounters
router.get('/encounters', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const { match_found, search } = req.query;

    let query = db('biometric_encounters')
      .select('biometric_encounters.*',
        'encounter_user.first_name as encountered_by_first', 'encounter_user.last_name as encountered_by_last',
        'bio_record.subject_name as record_subject_name')
      .leftJoin({ encounter_user: 'users' }, 'biometric_encounters.encountered_by', 'encounter_user.id')
      .leftJoin({ bio_record: 'biometric_records' }, 'biometric_encounters.record_id', 'bio_record.id');

    if (match_found !== undefined) query = query.where('biometric_encounters.match_found', match_found === 'true');
    if (search) query = query.where('biometric_encounters.notes', 'ilike', `%${search}%`);

    const [items, total] = await Promise.all([
      query.clone().orderBy('biometric_encounters.encounter_date', 'desc').limit(limit).offset(offset),
      query.clone().clearSelect().count('biometric_encounters.id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.get('/encounters/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await db('biometric_encounters')
      .select('biometric_encounters.*',
        'encounter_user.first_name as encountered_by_first', 'encounter_user.last_name as encountered_by_last',
        'bio_record.subject_name as record_subject_name',
        'matched_record.subject_name as matched_record_subject_name')
      .leftJoin({ encounter_user: 'users' }, 'biometric_encounters.encountered_by', 'encounter_user.id')
      .leftJoin({ bio_record: 'biometric_records' }, 'biometric_encounters.record_id', 'bio_record.id')
      .leftJoin({ matched_record: 'biometric_records' }, 'biometric_encounters.matched_record_id', 'matched_record.id')
      .where('biometric_encounters.id', req.params.id)
      .first();
    if (!item) { res.status(404).json({ error: 'Encounter not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
});

router.post('/encounters', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('biometric_encounters').insert({
      id: uuid(),
      encountered_by: req.user!.userId,
      ...req.body,
    }).returning('*');
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.put('/encounters/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('biometric_encounters')
      .where({ id: req.params.id }).update({ ...req.body }).returning('*');
    if (!item) { res.status(404).json({ error: 'Encounter not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/encounters/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('biometric_encounters').where({ id: req.params.id }).del();
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

export default router;
