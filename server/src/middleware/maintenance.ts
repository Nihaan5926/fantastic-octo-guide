import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import type { JwtPayload } from './auth';
import path from 'path';
import fs from 'fs';

const MAINTENANCE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Under Maintenance</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 48px; text-align: center; max-width: 480px; width: 90%; }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
    p { color: #94a3b8; font-size: 14px; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">&#128736;</div>
    <h1>System Maintenance</h1>
    <p>The platform is currently undergoing scheduled maintenance. Administrators can still access the system. Please check back shortly.</p>
  </div>
</body>
</html>`;

export function maintenanceGuard(req: Request, res: Response, next: NextFunction): void {
  if (config.maintenanceMode !== true) {
    next();
    return;
  }

  const authPaths = ['/api/auth/login', '/api/auth/refresh', '/api/auth/login-2fa'];
  if (authPaths.includes(req.path)) {
    next();
    return;
  }

  if (req.user && req.user.role === 'ADMIN') {
    next();
    return;
  }

  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    const token = header.split(' ')[1];
    try {
      const payload = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;
      if (payload.role === 'ADMIN') {
        next();
        return;
      }
    } catch {
      // token invalid, fall through to maintenance
    }
  }

  if (req.path.startsWith('/api')) {
    res.status(503).json({ error: 'System is under maintenance. Only administrators can access.' });
  } else {
    res.status(503).type('html').send(MAINTENANCE_HTML);
  }
}
