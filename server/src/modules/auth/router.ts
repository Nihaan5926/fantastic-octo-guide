import { Router, Request, Response, NextFunction } from 'express';
import * as service from './service';
import { registerSchema, loginSchema, refreshSchema, totpTokenSchema, login2faSchema, forgotPasswordSchema, resetPasswordSchema, deleteAccountSchema } from './validator';
import { authenticate } from '../../middleware/auth';
import { loginRateLimiter } from '../../middleware/rate-limiter';
import { eventBus } from '../../core/event-bus';
import { logger } from '../../utils/logger';
import multer from 'multer';
import path from 'path';
import { config } from '../../config';
import { db } from '../../db/knex';
import { v4 as uuid } from 'uuid';
import fs from 'fs';

const router = Router();

router.get('/ping', (_req, res) => { res.json({ pong: true }); });

function validate(schema: any) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: 'Validation failed', details: result.error.errors });
      return;
    }
    req.body = result.data;
    next();
  };
}

function getClientInfo(req: Request) {
  return {
    ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || req.socket.remoteAddress || '',
    userAgent: req.headers['user-agent'] || '',
  };
}

router.post('/register', validate(registerSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await service.register(req.body);
    eventBus.emit('entity:created', {
      entityType: 'user',
      entityId: result.user?.id || '',
      title: result.user?.email || 'New user',
      userId: result.user?.id || req.body.email,
    });
    res.status(201).json(result);
  } catch (e) { next(e); }
});

router.post('/login', loginRateLimiter, validate(loginSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ip, userAgent } = getClientInfo(req);
    const result = await service.login(req.body, ip, userAgent);
    if ((result as any).requires2FA) {
      logger.info(`User requires 2FA: ${req.body.email}`);
      res.json(result);
      return;
    }
    logger.info(`User logged in: ${req.body.email}`);
    res.json(result);
  } catch (e) { next(e); }
});

router.post('/login-2fa', validate(login2faSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ip, userAgent } = getClientInfo(req);
    const result = await service.completeLogin2fa(req.body.tempToken, req.body.totpCode, ip, userAgent);
    logger.info(`User completed 2FA login`);
    res.json(result);
  } catch (e) { next(e); }
});

router.post('/refresh', validate(refreshSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await service.refreshToken(req.body.refreshToken);
    res.json(result);
  } catch (e) { next(e); }
});

router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await service.getProfile(req.user!.userId);
    res.json(profile);
  } catch (e) { next(e); }
});

router.post('/logout', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) await service.logout(token, req.user!.userId);
    res.json({ message: 'Logged out' });
  } catch (e) { next(e); }
});

router.patch('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await service.updateProfile(req.user!.userId, req.body);
    res.json(profile);
  } catch (e) { next(e); }
});

// ─── TOTP / Two-Factor Routes ───

router.post('/2fa/setup', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await service.setupTOTP(req.user!.userId);
    res.json(result);
  } catch (e) { next(e); }
});

router.post('/2fa/enable', authenticate, validate(totpTokenSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await service.enableTOTP(req.user!.userId, req.body.token);
    res.json(result);
  } catch (e) { next(e); }
});

router.post('/2fa/disable', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await service.disableTOTP(req.user!.userId);
    res.json(result);
  } catch (e) { next(e); }
});

// ─── Session Management Routes ───

router.get('/sessions', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const sessions = await service.getActiveSessions(req.user!.userId, token);
    res.json({ data: sessions });
  } catch (e) { next(e); }
});

router.delete('/sessions/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await service.revokeSession(req.user!.userId, req.params.id);
    res.json(result);
  } catch (e) { next(e); }
});

router.delete('/sessions', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) throw new Error('No token provided');
    const result = await service.revokeOtherSessions(req.user!.userId, token);
    res.json(result);
  } catch (e) { next(e); }
});

router.post('/forgot-password', validate(forgotPasswordSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.generateResetToken(req.body.email);
    res.json({ message: 'If account exists, reset link sent' });
  } catch (e) { next(e); }
});

router.post('/reset-password', validate(resetPasswordSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.resetPassword(req.body.token, req.body.newPassword);
    res.json({ message: 'Password reset successful' });
  } catch (e) { next(e); }
});

router.get('/login-history', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const history = await service.getLoginHistory(req.user!.userId);
    res.json(history);
  } catch (e) { next(e); }
});

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(config.upload.dir, 'avatars');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuid()}${ext}`);
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed'));
    }
  },
});

router.post('/avatar', authenticate, avatarUpload.single('avatar'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = req.file;
    if (!file) { res.status(400).json({ error: 'Image file is required' }); return; }
    const avatarUrl = `uploads/avatars/${file.filename}`;
    await db('users').where({ id: req.user!.userId }).update({ avatar_url: avatarUrl, updated_at: db.fn.now() });
    res.json({ avatarUrl });
  } catch (e) { next(e); }
});

router.get('/avatar', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await db('users').where({ id: req.user!.userId }).select('avatar_url').first();
    if (!user?.avatar_url) { res.status(404).json({ error: 'No avatar' }); return; }
    const avatarPath = path.resolve(config.upload.dir, '..', user.avatar_url);
    res.sendFile(avatarPath);
  } catch (e) { next(e); }
});

router.get('/activity', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activity = await service.getUserActivity(req.user!.userId);
    res.json({ data: activity });
  } catch (e) { next(e); }
});

router.delete('/me', authenticate, validate(deleteAccountSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await service.deleteAccount(req.user!.userId, req.body.password);
    res.json({ message: 'Account deleted successfully' });
  } catch (e) { next(e); }
});

router.get('/export-data', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await service.exportUserData(req.user!.userId);
    res.setHeader('Content-Disposition', `attachment; filename="export-${req.user!.userId}.json"`);
    res.json(data);
  } catch (e) { next(e); }
});

export default router;