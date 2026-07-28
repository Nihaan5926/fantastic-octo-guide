import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../../db/knex';
import { authenticate } from '../../middleware/auth';
import { eventBus } from '../../core/event-bus';
import { v4 as uuid } from 'uuid';
import { convertEmptyToNull } from '../../utils/validators';

const router = Router();
router.use(authenticate);


router.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') {
    req.body = convertEmptyToNull(req.body);
  }
  next();
});

router.get('/channels', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const { channel_type, is_active, search } = req.query;

    let query = db('message_channels')
      .select('message_channels.*', 'users.first_name as creator_first', 'users.last_name as creator_last')
      .leftJoin('users', 'message_channels.created_by', 'users.id');

    if (channel_type) query = query.where('message_channels.channel_type', channel_type);
    if (is_active !== undefined) query = query.where('message_channels.is_active', is_active === 'true');
    if (search) query = query.where(function () {
      this.where('message_channels.name', 'ilike', `%${search}%`)
        .orWhere('message_channels.description', 'ilike', `%${search}%`);
    });

    const [items, total] = await Promise.all([
      query.clone().orderBy('message_channels.created_at', 'desc').limit(limit).offset(offset),
      query.clone().clearSelect().count('message_channels.id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.get('/channels/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await db('message_channels')
      .select('message_channels.*', 'users.first_name as creator_first', 'users.last_name as creator_last')
      .leftJoin('users', 'message_channels.created_by', 'users.id')
      .where('message_channels.id', req.params.id).first();
    if (!item) { res.status(404).json({ error: 'Channel not found' }); return; }

    const members = await db('channel_members')
      .select('channel_members.*', 'users.first_name', 'users.last_name', 'users.email')
      .leftJoin('users', 'channel_members.user_id', 'users.id')
      .where('channel_members.channel_id', req.params.id);

    res.json({ ...item, members });
  } catch (e) { next(e); }
});

router.post('/channels', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('message_channels').insert({...req.body, id: uuid(), created_by: req.user!.userId,
    }).returning('*');
    eventBus.emit('entity:created', {
      entityType: 'message_channel',
      entityId: item.id,
      title: item.name || 'New channel',
      userId: req.user!.userId,
    });
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.put('/channels/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('message_channels').where({ id: req.params.id })
      .update({ ...req.body, updated_at: db.fn.now() }).returning('*');
    if (!item) { res.status(404).json({ error: 'Channel not found' }); return; }
    eventBus.emit('entity:updated', {
      entityType: 'message_channel',
      entityId: item.id,
      title: item.name || 'Updated channel',
      userId: req.user!.userId,
    });
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/channels/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('message_channels').where({ id: req.params.id }).del();
    eventBus.emit('entity:deleted', {
      entityType: 'message_channel',
      entityId: req.params.id,
      title: req.params.id,
      userId: req.user!.userId,
    });
    res.json({ message: 'Channel deleted' });
  } catch (e) { next(e); }
});

router.get('/channels/:id/members', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const members = await db('channel_members')
      .select('channel_members.*', 'users.email', 'users.first_name', 'users.last_name')
      .leftJoin('users', 'channel_members.user_id', 'users.id')
      .where('channel_members.channel_id', req.params.id);
    res.json({ data: members });
  } catch (e) { next(e); }
});

router.post('/channels/:id/members', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user_id, role } = req.body;
    const [member] = await db('channel_members').insert({
      id: uuid(), channel_id: req.params.id, user_id, role: role || 'MEMBER',
    }).returning('*');
    res.status(201).json(member);
  } catch (e) { next(e); }
});

router.delete('/channels/:id/members/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('channel_members').where({ channel_id: req.params.id, user_id: req.params.userId }).del();
    res.json({ message: 'Member removed' });
  } catch (e) { next(e); }
});

router.get('/messages', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const { classification, is_read, channel_id, search } = req.query;

    let query = db('secure_messages')
      .select(
        'secure_messages.*',
        's.first_name as sender_first',
        's.last_name as sender_last',
        'r.first_name as recipient_first',
        'r.last_name as recipient_last',
      )
      .leftJoin('users as s', 'secure_messages.sender_id', 's.id')
      .leftJoin('users as r', 'secure_messages.recipient_id', 'r.id');

    if (classification) query = query.where('secure_messages.classification', classification);
    if (is_read !== undefined) query = query.where('secure_messages.is_read', is_read === 'true');
    if (channel_id) query = query.where('secure_messages.channel_id', channel_id);
    if (search) query = query.where(function () {
      this.where('secure_messages.subject', 'ilike', `%${search}%`)
        .orWhere('secure_messages.body', 'ilike', `%${search}%`);
    });

    const [items, total] = await Promise.all([
      query.clone().orderBy('secure_messages.created_at', 'desc').limit(limit).offset(offset),
      query.clone().clearSelect().count('secure_messages.id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.get('/messages/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await db('secure_messages')
      .select(
        'secure_messages.*',
        's.first_name as sender_first',
        's.last_name as sender_last',
        'r.first_name as recipient_first',
        'r.last_name as recipient_last',
      )
      .leftJoin('users as s', 'secure_messages.sender_id', 's.id')
      .leftJoin('users as r', 'secure_messages.recipient_id', 'r.id')
      .where('secure_messages.id', req.params.id).first();
    if (!item) { res.status(404).json({ error: 'Message not found' }); return; }
    res.json(item);
  } catch (e) { next(e); }
});

router.post('/messages', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload: any = {...req.body, id: uuid(), sender_id: req.user!.userId };
    const [item] = await db('secure_messages').insert(payload).returning('*');
    eventBus.emit('entity:created', {
      entityType: 'secure_message',
      entityId: item.id,
      title: item.subject || 'New message',
      userId: req.user!.userId,
    });
    res.status(201).json(item);
  } catch (e: any) {
    if (e.message?.includes('does not exist')) {
      try {
        const { parent_id, ...rest } = req.body as any;
        const payload = { id: uuid(), sender_id: req.user!.userId, ...rest };
        const [item] = await db('secure_messages').insert(payload).returning('*');
        eventBus.emit('entity:created', {
          entityType: 'secure_message',
          entityId: item.id,
          title: item.subject || 'New message',
          userId: req.user!.userId,
        });
        res.status(201).json(item);
        return;
      } catch (innerE: any) {
        next(innerE);
      }
    }
    next(e);
  }
});

router.put('/messages/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updateData: any = { ...req.body };
    delete updateData.parent_id;
    const [item] = await db('secure_messages').where({ id: req.params.id })
      .update(updateData).returning('*');
    if (!item) { res.status(404).json({ error: 'Message not found' }); return; }
    eventBus.emit('entity:updated', {
      entityType: 'secure_message',
      entityId: item.id,
      title: item.subject || 'Updated message',
      userId: req.user!.userId,
    });
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/messages/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('secure_messages').where({ id: req.params.id }).del();
    eventBus.emit('entity:deleted', {
      entityType: 'secure_message',
      entityId: req.params.id,
      title: req.params.id,
      userId: req.user!.userId,
    });
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

export default router;

