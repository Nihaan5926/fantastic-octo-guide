import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../../db/knex';
import { authenticate } from '../../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = (req.query.q as string || '').trim();
    if (!q || q.length < 2) {
      res.json({ results: [] });
      return;
    }

    const term = `%${q}%`;
    const results: any[] = [];

    // Reports
    const reports = await db('intelligence_reports')
      .select('id', 'title', 'summary')
      .whereRaw('title ILIKE ? OR summary ILIKE ?', [term, term])
      .limit(3);
    for (const r of reports) {
      results.push({ entity_type: 'Report', entity_id: r.id, title: r.title, subtitle: (r.summary || '').slice(0, 120), path: `/reports/${r.id}` });
    }

    // Sources
    const sources = await db('sources')
      .select('id', 'code_name', 'description')
      .whereRaw('code_name ILIKE ? OR description ILIKE ?', [term, term])
      .limit(3);
    for (const s of sources) {
      results.push({ entity_type: 'Source', entity_id: s.id, title: s.code_name, subtitle: (s.description || '').slice(0, 120), path: `/sources/${s.id}` });
    }

    // Cases
    const cases = await db('cases')
      .select('id', 'title', 'description')
      .whereRaw('title ILIKE ? OR description ILIKE ?', [term, term])
      .limit(3);
    for (const c of cases) {
      results.push({ entity_type: 'Case', entity_id: c.id, title: c.title, subtitle: (c.description || '').slice(0, 120), path: `/cases/${c.id}` });
    }

    // Threat Actors
    const threats = await db('threat_actors')
      .select('id', 'name', 'description')
      .whereRaw('name ILIKE ? OR description ILIKE ?', [term, term])
      .limit(3);
    for (const t of threats) {
      results.push({ entity_type: 'Threat', entity_id: t.id, title: t.name, subtitle: (t.description || '').slice(0, 120), path: `/threats/actors/${t.id}` });
    }

    // Evidence
    const evidence = await db('evidence')
      .select('id', 'title')
      .whereRaw('title ILIKE ?', [term])
      .limit(3);
    for (const e of evidence) {
      results.push({ entity_type: 'Evidence', entity_id: e.id, title: e.title, subtitle: '', path: `/evidence/${e.id}` });
    }

    // Personnel
    const personnel = await db('personnel_records')
      .select('id', 'position_title', 'notes')
      .whereRaw('position_title ILIKE ? OR notes ILIKE ?', [term, term])
      .limit(3);
    for (const p of personnel) {
      results.push({ entity_type: 'Personnel', entity_id: p.id, title: p.position_title, subtitle: (p.notes || '').slice(0, 120), path: `/personnel/${p.id}` });
    }

    // Missions
    const missions = await db('mission_plans')
      .select('id', 'title', 'objective')
      .whereRaw('title ILIKE ? OR objective ILIKE ?', [term, term])
      .limit(3);
    for (const m of missions) {
      results.push({ entity_type: 'Mission', entity_id: m.id, title: m.title, subtitle: (m.objective || '').slice(0, 120), path: `/missions/${m.id}` });
    }

    res.json({ results });
  } catch (e) {
    next(e);
  }
});

export default router;
