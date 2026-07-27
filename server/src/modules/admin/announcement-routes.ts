import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../../db/knex';

const router = Router();

router.get('/announcements', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const now = db.fn.now();
    const items = await db('announcements')
      .select('announcements.*', 'users.first_name as creator_first', 'users.last_name as creator_last')
      .leftJoin('users', 'announcements.created_by', 'users.id')
      .where('announcements.is_active', true)
      .where(function () {
        this.whereNull('announcements.starts_at').orWhere('announcements.starts_at', '<=', now);
      })
      .where(function () {
        this.whereNull('announcements.expires_at').orWhere('announcements.expires_at', '>=', now);
      })
      .orderBy('announcements.created_at', 'desc');

    res.json({ data: items });
  } catch (e: any) {
    if (e.message?.includes('does not exist')) { res.json({ data: [] }); return; }
    next(e);
  }
});

router.post('/announcements', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, content, severity, starts_at, expires_at } = req.body;
    const [announcement] = await db('announcements').insert({
      id: uuid(),
      title,
      content,
      severity: severity || 'info',
      starts_at: starts_at || null,
      expires_at: expires_at || null,
      is_active: true,
      created_by: req.user!.userId,
    }).returning('*');

    res.status(201).json(announcement);
  } catch (e: any) {
    if (e.message?.includes('does not exist')) { res.status(400).json({ error: 'Announcements not available. Please run database migrations.' }); return; }
    next(e);
  }
});

router.put('/announcements/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const update: any = { ...req.body, updated_at: db.fn.now() };
    delete update.id;
    delete update.created_by;
    delete update.created_at;

    const [announcement] = await db('announcements').where({ id: req.params.id }).update(update).returning('*');
    if (!announcement) { res.status(404).json({ error: 'Announcement not found' }); return; }
    res.json(announcement);
  } catch (e: any) {
    if (e.message?.includes('does not exist')) { res.status(404).json({ error: 'Announcement not found' }); return; }
    next(e);
  }
});

router.delete('/announcements/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = await db('announcements').where({ id: req.params.id }).del();
    if (!deleted) { res.status(404).json({ error: 'Announcement not found' }); return; }
    res.json({ message: 'Announcement deleted' });
  } catch (e: any) {
    if (e.message?.includes('does not exist')) { res.json({ message: 'Announcement deleted' }); return; }
    next(e);
  }
});

export default router;
