import { Request, Response, NextFunction } from 'express';
import { db } from '../db/knex';

export function auditLog(action: string, entityType?: string, getEntityId?: (req: Request) => string | undefined) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const originalJson = res.json.bind(res);

    res.json = function (body: any): Response {
      if (res.statusCode < 400 && req.user) {
        const entityId = getEntityId ? getEntityId(req) : req.params.id;

        db('audit_logs').insert({
          user_id: req.user.userId,
          action,
          entity_type: entityType || undefined,
          entity_id: entityId || undefined,
          changes: JSON.stringify({
            method: req.method,
            path: req.path,
          }),
          ip_address: req.ip || req.socket.remoteAddress,
        }).catch((err: Error) => console.error('[Audit] Failed to log:', err.message));
      }
      return originalJson(body);
    };

    next();
  };
}
