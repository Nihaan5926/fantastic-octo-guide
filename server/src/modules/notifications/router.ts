import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../../db/knex';
import { authenticate } from '../../middleware/auth';
import { auditLog } from '../../middleware/audit';

const router = Router();

router.use(authenticate);

async function ensureTable(): Promise<boolean> {
  try {
    if (!await db.schema.hasTable('notifications')) {
      await db.schema.createTable('notifications', (t) => {
        t.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
        t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE').index();
        t.string('type', 100).notNullable();
        t.string('title', 500).notNullable();
        t.text('message').nullable();
        t.boolean('is_read').defaultTo(false).index();
        t.string('related_type', 100).nullable();
        t.uuid('related_id').nullable();
        t.jsonb('metadata').defaultTo('{}');
        t.timestamp('created_at').defaultTo(db.fn.now());
      });
      console.log('[Notifications] Table created');
    }
    return true;
  } catch {
    return false;
  }
}

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureTable();
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const unreadOnly = req.query.unread === 'true';

    let query = db('notifications').where({ user_id: req.user!.userId });
    if (unreadOnly) query = query.where({ is_read: false });

    const [items, total] = await Promise.all([
      query.clone().select('*').orderBy('created_at', 'desc').limit(limit).offset(offset),
      query.clone().clearSelect().count('id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.put('/:id/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureTable();
    await db('notifications').where({ id: req.params.id, user_id: req.user!.userId }).update({ is_read: true });
    res.json({ message: 'Marked as read' });
  } catch (e) { next(e); }
});

router.post('/read-all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureTable();
    await db('notifications').where({ user_id: req.user!.userId, is_read: false }).update({ is_read: true });
    res.json({ message: 'All marked as read' });
  } catch (e) { next(e); }
});

router.get('/unread-count', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await ensureTable();
    const result = await db('notifications').where({ user_id: req.user!.userId, is_read: false }).count('id').first();
    const count = result ? parseInt((result as any).count, 10) : 0;
    res.json({ count });
  } catch (e) { next(e); }
});

export default router;
