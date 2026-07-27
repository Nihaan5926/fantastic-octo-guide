import { Router, Request, Response, NextFunction } from 'express';
import * as service from './service';
import { registerSchema, loginSchema, refreshSchema } from './validator';
import { authenticate } from '../../middleware/auth';
import { loginRateLimiter } from '../../middleware/rate-limiter';
import { eventBus } from '../../core/event-bus';
import { logger } from '../../utils/logger';

const router = Router();

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
    const result = await service.login(req.body);
    logger.info(`User logged in: ${req.body.email}`);
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
    if (token) await service.logout(token);
    res.json({ message: 'Logged out' });
  } catch (e) { next(e); }
});

router.patch('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await service.updateProfile(req.user!.userId, req.body);
    res.json(profile);
  } catch (e) { next(e); }
});

export default router;
