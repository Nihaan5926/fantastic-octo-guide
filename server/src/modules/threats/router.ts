import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../../db/knex';
import { authenticate } from '../../middleware/auth';
import { auditLog } from '../../middleware/audit';
import { eventBus } from '../../core/event-bus';
import { v4 as uuid } from 'uuid';
import multer from 'multer';
import path from 'path';
import { config } from '../../config';

const storage = multer.diskStorage({
  destination: config.upload.dir,
  filename: (_req, file, cb) => {
    cb(null, `${uuid()}-${file.originalname}`);
  },
});
const upload = multer({ storage, limits: { fileSize: config.upload.maxFileSize } });

const router = Router();
router.use(authenticate);

// ── Threat Actors Collection ──

router.get('/actors', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const { status, sophistication, search } = req.query;

    let query = db('threat_actors').select('*');
    if (status) query = query.where('status', status);
    if (sophistication) query = query.where('sophistication', sophistication);
    if (search) query = query.where(function () {
      this.where('name', 'ilike', `%${search}%`).orWhere('description', 'ilike', `%${search}%`);
    });

    const [items, total] = await Promise.all([
      query.clone().orderBy('created_at', 'desc').limit(limit).offset(offset),
      query.clone().clearSelect().count('id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.post('/actors', auditLog('threat_actor:create', 'threat_actor'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = { ...req.body };
    const [item] = await db('threat_actors').insert({ id: uuid(), ...body }).returning('*');
    const riskScore = calculateRiskScore(item.sophistication, []);
    const currentMeta = typeof item.metadata === 'string' ? JSON.parse(item.metadata || '{}') : (item.metadata || {});
    await db('threat_actors').where({ id: item.id }).update({ metadata: JSON.stringify({ ...currentMeta, risk_score: riskScore }) });
    eventBus.emit('entity:created', {
      entityType: 'threat_actor',
      entityId: item.id,
      title: item.name || 'New threat actor',
      userId: req.user!.userId,
    });
    res.status(201).json({ ...item, risk_score: riskScore });
  } catch (e) { next(e); }
});

// ── Sub-Routes (must come before generic /:id) ──

router.get('/actors/:id/relationships', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actorId = req.params.id;
    const relationships = await db('entity_relationships')
      .select('*')
      .where(function () {
        this.where(function () {
          this.where('source_type', 'threat_actor').andWhere('source_id', actorId);
        }).orWhere(function () {
          this.where('target_type', 'threat_actor').andWhere('target_id', actorId);
        });
      })
      .orderBy('created_at', 'desc');

    res.json({ data: relationships });
  } catch (e) { next(e); }
});

router.get('/actors/:id/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actorId = req.params.id;

    const [indicatorCount] = await db('indicators')
      .where({ threat_actor_id: actorId })
      .count('id as count');

    const [relatedCaseCount] = await db('entity_relationships')
      .where(function () {
        this.where(function () {
          this.where('source_type', 'threat_actor').andWhere('source_id', actorId);
        }).orWhere(function () {
          this.where('target_type', 'threat_actor').andWhere('target_id', actorId);
        });
      })
      .andWhere(function () {
        this.where('source_type', 'case').orWhere('target_type', 'case');
      })
      .count('id as count');

    const confidenceRows = await db('indicators')
      .where({ threat_actor_id: actorId })
      .select('confidence');

    const confidenceOrder: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
    const confScores = confidenceRows
      .map((r: any) => confidenceOrder[r.confidence] || 0)
      .filter((s: number) => s > 0);
    const avgScore = confScores.length > 0
      ? confScores.reduce((a: number, b: number) => a + b, 0) / confScores.length
      : 0;

    const avgLabel = avgScore > 0
      ? Object.entries(confidenceOrder).find(([, v]) => v === Math.round(avgScore))?.[0] || null
      : null;

    res.json({
      indicatorCount: parseInt(String(indicatorCount.count), 10),
      relatedCaseCount: parseInt(String(relatedCaseCount.count), 10),
      avgConfidence: avgLabel,
    });
  } catch (e) { next(e); }
});

router.get('/actors/:id/attachments', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const attachments = await db('entity_attachments')
      .where({ entity_type: 'threat_actor', entity_id: req.params.id })
      .orderBy('created_at', 'desc');
    res.json({ data: attachments });
  } catch (e) { next(e); }
});

router.post('/actors/:id/attachments', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = req.file;
    if (!file) { res.status(400).json({ error: 'File is required' }); return; }
    const [attachment] = await db('entity_attachments').insert({
      id: uuid(),
      entity_type: 'threat_actor',
      entity_id: req.params.id,
      filename: file.filename,
      original_name: file.originalname,
      mime_type: file.mimetype,
      size: file.size,
      storage_path: `uploads/${file.filename}`,
      uploaded_by: req.user!.userId,
      metadata: req.body.label ? { label: req.body.label } : {},
    }).returning('*');
    res.status(201).json(attachment);
  } catch (e) { next(e); }
});

router.get('/actors/:id/attachments/:aid/download', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const attachment = await db('entity_attachments')
      .where({ id: req.params.aid, entity_type: 'threat_actor', entity_id: req.params.id })
      .first();
    if (!attachment) { res.status(404).json({ error: 'Attachment not found' }); return; }
    const filePath = path.join(config.upload.dir, attachment.filename);
    res.download(filePath, attachment.original_name);
  } catch (e) { next(e); }
});

router.delete('/actors/:id/attachments/:aid', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('entity_attachments')
      .where({ id: req.params.aid, entity_type: 'threat_actor', entity_id: req.params.id })
      .del();
    res.json({ message: 'Attachment removed' });
  } catch (e) { next(e); }
});

// ── Risk Scoring ──

router.post('/actors/:id/calculate-risk', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = await db('threat_actors').where({ id: req.params.id }).first();
    if (!actor) { res.status(404).json({ error: 'Not found' }); return; }
    const indicators = await db('indicators').where({ threat_actor_id: req.params.id });

    const sophisticationWeight: Record<string, number> = { LOW: 20, MEDIUM: 50, HIGH: 80, ADVANCED: 90, NATION_STATE: 100 };
    const confidenceOrder: Record<string, number> = { LOW: 25, MEDIUM: 50, HIGH: 75, CRITICAL: 100 };

    const sophWeight = sophisticationWeight[actor.sophistication] || 20;
    const avgConfObj = indicators.length > 0
      ? indicators.reduce((sum: number, ind: any) => sum + (confidenceOrder[ind.confidence] || 25), 0) / indicators.length
      : 0;

    const riskScore = indicators.length === 0
      ? Math.round(sophWeight * 0.6)
      : Math.round(sophWeight * 0.5 + avgConfObj * 0.5);

    const breakdown = {
      sophistication_level: actor.sophistication || 'UNKNOWN',
      sophistication_weight: sophWeight,
      indicator_count: indicators.length,
      avg_indicator_confidence: indicators.length > 0 ? Math.round(avgConfObj) : null,
      formula: indicators.length > 0
        ? `(${sophWeight} * 0.5) + (${Math.round(avgConfObj)} * 0.5) = ${riskScore}`
        : `${sophWeight} * 0.6 = ${riskScore}`,
      risk_score: riskScore,
    };

    const existingMeta = typeof actor.metadata === 'string' ? JSON.parse(actor.metadata || '{}') : (actor.metadata || {});
    await db('threat_actors').where({ id: req.params.id }).update({
      metadata: JSON.stringify({ ...existingMeta, risk_score: riskScore }),
    });

    res.json({ risk_score: riskScore, breakdown });
  } catch (e) { next(e); }
});

router.put('/actors/:id/assessment', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const actor = await db('threat_actors').where({ id: req.params.id }).first();
    if (!actor) { res.status(404).json({ error: 'Not found' }); return; }

    const { likelihood, impact } = req.body;
    if (!likelihood || !impact || likelihood < 1 || likelihood > 5 || impact < 1 || impact > 5) {
      res.status(400).json({ error: 'Likelihood and impact must be between 1 and 5' });
      return;
    }

    const existingMeta = typeof actor.metadata === 'string' ? JSON.parse(actor.metadata || '{}') : (actor.metadata || {});
    const riskScore = likelihood * impact;
    const updatedMeta = {
      ...existingMeta,
      riskAssessment: { likelihood, impact },
      risk_score: riskScore,
    };

    await db('threat_actors').where({ id: req.params.id }).update({
      metadata: JSON.stringify(updatedMeta),
    });

    eventBus.emit('entity:updated', {
      entityType: 'threat_actor',
      entityId: actor.id,
      title: actor.name || 'Updated threat actor',
      userId: req.user!.userId,
    });

    res.json({
      id: actor.id,
      likelihood,
      impact,
      risk_score: riskScore,
      metadata: updatedMeta,
    });
  } catch (e) { next(e); }
});

// ── Generic Threat Actor Routes (must come LAST among same method) ──

router.get('/actors/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const item = await db('threat_actors').where({ id: req.params.id }).first();
    if (!item) { res.status(404).json({ error: 'Not found' }); return; }
    const indicators = await db('indicators').where({ threat_actor_id: req.params.id });
    res.json({ ...item, indicators });
  } catch (e) { next(e); }
});

router.put('/actors/:id', auditLog('threat_actor:update', 'threat_actor'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('threat_actors').where({ id: req.params.id })
      .update({ ...req.body, updated_at: db.fn.now() }).returning('*');
    if (!item) { res.status(404).json({ error: 'Not found' }); return; }
    const indicators = await db('indicators').where({ threat_actor_id: req.params.id });
    const riskScore = calculateRiskScore(item.sophistication, indicators);
    const currentMeta = typeof item.metadata === 'string' ? JSON.parse(item.metadata || '{}') : (item.metadata || {});
    await db('threat_actors').where({ id: item.id }).update({ metadata: JSON.stringify({ ...currentMeta, risk_score: riskScore }) });
    eventBus.emit('entity:updated', {
      entityType: 'threat_actor',
      entityId: item.id,
      title: item.name || 'Updated threat actor',
      userId: req.user!.userId,
    });
    res.json({ ...item, risk_score: riskScore });
  } catch (e) { next(e); }
});

router.delete('/actors/:id', auditLog('threat_actor:delete', 'threat_actor'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('threat_actors').where({ id: req.params.id }).del();
    eventBus.emit('entity:deleted', {
      entityType: 'threat_actor',
      entityId: req.params.id,
      title: req.params.id,
      userId: req.user!.userId,
    });
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

// ── Indicators ──

router.get('/indicators', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const { type, search } = req.query;

    let query = db('indicators')
      .select('indicators.*', 'threat_actors.name as actor_name')
      .leftJoin('threat_actors', 'indicators.threat_actor_id', 'threat_actors.id');

    if (type) query = query.where('indicators.type', type);
    if (search) query = query.where('indicators.value', 'ilike', `%${search}%`);

    const [items, total] = await Promise.all([
      query.clone().orderBy('indicators.created_at', 'desc').limit(limit).offset(offset),
      query.clone().clearSelect().count('indicators.id').first().then((r: any) => parseInt(r.count, 10)),
    ]);

    res.json({ data: items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (e) { next(e); }
});

router.post('/indicators', auditLog('indicator:create', 'indicator'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('indicators').insert({ id: uuid(), ...req.body, confidence: parseInt(req.body.confidence) || 50 }).returning('*');
    eventBus.emit('entity:created', {
      entityType: 'indicator',
      entityId: item.id,
      title: item.value || 'New indicator',
      userId: req.user!.userId,
    });
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.delete('/indicators/:id', auditLog('indicator:delete', 'indicator'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('indicators').where({ id: req.params.id }).del();
    eventBus.emit('entity:deleted', {
      entityType: 'indicator',
      entityId: req.params.id,
      title: req.params.id,
      userId: req.user!.userId,
    });
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

function calculateRiskScore(sophistication: string | null, indicators: any[]): number {
  const sophisticationWeight: Record<string, number> = { LOW: 20, MEDIUM: 50, HIGH: 80, ADVANCED: 90, NATION_STATE: 100 };
  const sophWeight = sophisticationWeight[sophistication || ''] || 20;
  if (indicators.length === 0) return Math.round(sophWeight * 0.6);
  const confidenceOrder: Record<string, number> = { LOW: 25, MEDIUM: 50, HIGH: 75, CRITICAL: 100 };
  const avgConf = indicators.reduce((sum: number, ind: any) => sum + (confidenceOrder[ind.confidence] || 25), 0) / indicators.length;
  return Math.round(sophWeight * 0.5 + avgConf * 0.5);
}

// ── Watchlist Screening ──

router.post('/screening', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { values } = req.body;
    if (!Array.isArray(values) || values.length === 0) {
      res.status(400).json({ error: 'values array is required' });
      return;
    }

    const trimmedValues = values.map((v: string) => String(v).trim()).filter(Boolean);

    const results: any[] = [];

    for (const input of trimmedValues) {
      const exactMatches = await db('indicators')
        .select('indicators.*', 'threat_actors.name as actor_name')
        .leftJoin('threat_actors', 'indicators.threat_actor_id', 'threat_actors.id')
        .where(function () {
          this.where('indicators.value', 'ilike', input)
            .orWhere('indicators.value', 'ilike', `%${input}%`);
        });

      if (exactMatches.length > 0) {
        for (const match of exactMatches) {
          const isExact = match.value.toLowerCase() === input.toLowerCase();
          results.push({
            input,
            matched: true,
            matchType: isExact ? 'exact' : 'contains',
            indicatorId: match.id,
            indicatorType: match.type,
            indicatorValue: match.value,
            confidence: match.confidence,
            actorName: match.actor_name || 'Unknown',
            actorId: match.threat_actor_id,
          });
        }
      } else {
        results.push({
          input,
          matched: false,
        });
      }
    }

    const matchCount = results.filter((r) => r.matched).length;
    const uniqueMatchedInputs = new Set(results.filter((r) => r.matched).map((r) => r.input)).size;

    res.json({
      data: results,
      summary: {
        totalInputs: trimmedValues.length,
        totalMatches: matchCount,
        uniqueMatchedInputs,
        inputsWithNoMatch: trimmedValues.length - uniqueMatchedInputs,
      },
    });
  } catch (e) { next(e); }
});

// ── Bulk Import ──

router.post('/import', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { actors = [], indicators = [] } = req.body;
    const errors: any[] = [];
    const createdActors: any[] = [];
    const createdIndicators: any[] = [];

    for (const actorData of actors) {
      try {
        if (!actorData.name) {
          errors.push({ type: 'actor', row: actorData._row, error: 'Name is required' });
          continue;
        }
        const [actor] = await db('threat_actors').insert({
          id: uuid(),
          name: actorData.name,
          aliases: typeof actorData.aliases === 'string' ? JSON.parse(actorData.aliases || '[]') : (Array.isArray(actorData.aliases) ? actorData.aliases : []),
          description: actorData.description || null,
          motivation: actorData.motivation || null,
          sophistication: actorData.sophistication || 'MEDIUM',
          status: actorData.status || 'ACTIVE',
        }).returning('*');
        createdActors.push(actor);

        eventBus.emit('entity:created', {
          entityType: 'threat_actor',
          entityId: actor.id,
          title: actor.name,
          userId: req.user!.userId,
        });
      } catch (err: any) {
        errors.push({ type: 'actor', row: actorData._row, error: err.message });
      }
    }

    for (const indData of indicators) {
      try {
        if (!indData.value || !indData.type) {
          errors.push({ type: 'indicator', row: indData._row, error: 'Value and type are required' });
          continue;
        }
        let actorId = indData.threat_actor_id;
        if (!actorId && indData.actor_name) {
          const actor = await db('threat_actors').where('name', 'ilike', indData.actor_name.trim()).first();
          if (actor) {
            actorId = actor.id;
          } else {
            errors.push({ type: 'indicator', row: indData._row, error: `Actor "${indData.actor_name}" not found` });
            continue;
          }
        }
        if (!actorId) {
          errors.push({ type: 'indicator', row: indData._row, error: 'threat_actor_id or actor_name is required' });
          continue;
        }
        const [indicator] = await db('indicators').insert({
          id: uuid(),
          threat_actor_id: actorId,
          type: indData.type,
          value: indData.value,
          confidence: parseInt(indData.confidence) || 50,
        }).returning('*');
        createdIndicators.push(indicator);
      } catch (err: any) {
        errors.push({ type: 'indicator', row: indData._row, error: err.message });
      }
    }

    res.status(201).json({
      created: { actors: createdActors.length, indicators: createdIndicators.length },
      total: { actors: actors.length, indicators: indicators.length },
      errors,
    });
  } catch (e) { next(e); }
});

export default router;
