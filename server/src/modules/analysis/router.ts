import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../../db/knex';
import { authenticate } from '../../middleware/auth';
import { eventBus } from '../../core/event-bus';
import { v4 as uuid } from 'uuid';

const router = Router();
router.use(authenticate);

router.get('/relationships', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sourceType, sourceId, targetType, relationshipType } = req.query;
    let query = db('entity_relationships').select('*');

    if (sourceType) query = query.where('source_type', sourceType);
    if (sourceId) query = query.where('source_id', sourceId);
    if (targetType) query = query.where('target_type', targetType);
    if (relationshipType) query = query.where('relationship_type', relationshipType);

    const items = await query.orderBy('created_at', 'desc');
    res.json({ data: items });
  } catch (e) { next(e); }
});

router.post('/relationships', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [item] = await db('entity_relationships').insert({
      id: uuid(), created_by: req.user!.userId, ...req.body,
    }).returning('*');
    eventBus.emit('entity:created', {
      entityType: 'relationship',
      entityId: item.id,
      title: item.relationship_type || 'New relationship',
      userId: req.user!.userId,
    });
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.post('/relationships/import', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { csv } = req.body;
    if (!csv || !csv.trim()) {
      res.status(400).json({ error: 'CSV data is required' });
      return;
    }

    const lines = csv.trim().split('\n').filter((l: string) => l.trim());
    if (lines.length < 2) {
      res.status(400).json({ error: 'CSV must have a header row and at least one data row' });
      return;
    }

    const headers = lines[0].split(',').map((h: string) => h.trim().replace(/^"|"$/g, ''));
    const dataRows = lines.slice(1);

    const created: any[] = [];
    const errors: string[] = [];

    for (let i = 0; i < dataRows.length; i++) {
      const values = dataRows[i].split(',').map((v: string) => v.trim().replace(/^"|"$/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((h: string, idx: number) => { row[h] = values[idx] || ''; });

      const { source_type, source_id, target_type, target_id, relationship_type } = row;
      if (!source_type || !source_id || !target_type || !target_id || !relationship_type) {
        errors.push(`Row ${i + 2}: missing required fields`);
        continue;
      }

      try {
        const [item] = await db('entity_relationships').insert({
          id: uuid(),
          source_type, source_id, target_type, target_id,
          relationship_type, created_by: req.user!.userId,
        }).returning('*');
        created.push(item);
      } catch (e: any) {
        errors.push(`Row ${i + 2}: ${e.message}`);
      }
    }

    res.json({ created: created.length, errors, items: created });
  } catch (e) { next(e); }
});

router.delete('/relationships/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await db('entity_relationships').where({ id: req.params.id }).del();
    eventBus.emit('entity:deleted', {
      entityType: 'relationship',
      entityId: req.params.id,
      title: req.params.id,
      userId: req.user!.userId,
    });
    res.json({ message: 'Deleted' });
  } catch (e) { next(e); }
});

router.get('/graph', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const relationships = await db('entity_relationships').select('*');

    const nodeSet = new Map<string, any>();
    const edges: any[] = [];

    for (const rel of relationships) {
      const sourceKey = `${rel.source_type}:${rel.source_id}`;
      const targetKey = `${rel.target_type}:${rel.target_id}`;

      if (!nodeSet.has(sourceKey)) {
        nodeSet.set(sourceKey, { id: sourceKey, type: rel.source_type, entityId: rel.source_id });
      }
      if (!nodeSet.has(targetKey)) {
        nodeSet.set(targetKey, { id: targetKey, type: rel.target_type, entityId: rel.target_id });
      }

      edges.push({
        id: rel.id,
        source: sourceKey,
        target: targetKey,
        type: rel.relationship_type,
        description: rel.description,
        confidence: rel.confidence,
      });
    }

    res.json({ nodes: Array.from(nodeSet.values()), edges });
  } catch (e) { next(e); }
});

router.get('/graph/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const relationships = await db('entity_relationships').select('*');

    const nodeMap = new Map<string, string>();
    for (const r of relationships) {
      nodeMap.set(`${r.source_type}:${r.source_id}`, r.source_type);
      nodeMap.set(`${r.target_type}:${r.target_id}`, r.target_type);
    }

    const nodesByType: Record<string, number> = {};
    for (const type of nodeMap.values()) {
      nodesByType[type] = (nodesByType[type] || 0) + 1;
    }

    const edgesByType: Record<string, number> = {};
    for (const r of relationships) {
      edgesByType[r.relationship_type] = (edgesByType[r.relationship_type] || 0) + 1;
    }

    res.json({
      totalNodes: nodeMap.size,
      totalEdges: relationships.length,
      nodesByType,
      edgesByType,
    });
  } catch (e) { next(e); }
});

router.get('/timeline', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sql = `
      SELECT * FROM (
        SELECT 'report' as entity_type, id as entity_id, title, summary as description, created_at FROM intelligence_reports
        UNION ALL
        SELECT 'case', id, title, description, created_at FROM cases
        UNION ALL
        SELECT 'evidence', id, title, COALESCE(description, '') as description, created_at FROM evidence
        UNION ALL
        SELECT 'source', id, code_name as title, COALESCE(description, '') as description, created_at FROM sources
        UNION ALL
        SELECT 'threat_actor', id, name as title, COALESCE(description, '') as description, created_at FROM threat_actors
        UNION ALL
        SELECT 'mission_plan', id, title, COALESCE(objective, '') as description, created_at FROM mission_plans
        UNION ALL
        SELECT 'target_package', id, title, COALESCE(objective, '') as description, created_at FROM target_packages
        UNION ALL
        SELECT 'sitrep', id, title, '' as description, created_at FROM sitreps
        UNION ALL
        SELECT 'tasking_assignment', id, title, COALESCE(description, '') as description, created_at FROM tasking_assignments
      ) AS all_events
      ORDER BY created_at DESC
      LIMIT 100
    `;
    const items = await db.raw(sql);
    res.json({ data: items.rows });
  } catch (e) { next(e); }
});

export default router;
