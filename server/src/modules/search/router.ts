import { Router, Request, Response, NextFunction } from 'express';
import { db } from '../../db/knex';
import { authenticate } from '../../middleware/auth';
import { convertEmptyToNull } from '../../utils/validators';

const router = Router();
router.use(authenticate);


router.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') {
    req.body = convertEmptyToNull(req.body);
  }
  next();
});

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

    // OSINT Collection Tasks
    const osintTasks = await db('osint_collection_tasks')
      .select('id', 'title')
      .whereRaw('title ILIKE ?', [term])
      .limit(3);
    for (const o of osintTasks) {
      results.push({ entity_type: 'OSINT Task', entity_id: o.id, title: o.title, subtitle: '', path: `/osint/tasks/${o.id}` });
    }

    // Targeting Packages
    const targets = await db('target_packages')
      .select('id', 'title', 'target_name')
      .whereRaw('title ILIKE ? OR target_name ILIKE ?', [term, term])
      .limit(3);
    for (const t of targets) {
      results.push({ entity_type: 'Target', entity_id: t.id, title: t.title, subtitle: (t.target_name || '').slice(0, 120), path: `/targeting/${t.id}` });
    }

    // Collection Requirements
    const collReqs = await db('collection_requirements')
      .select('id', 'title', 'description')
      .whereRaw('title ILIKE ? OR description ILIKE ?', [term, term])
      .limit(3);
    for (const c of collReqs) {
      results.push({ entity_type: 'Collection Req', entity_id: c.id, title: c.title, subtitle: (c.description || '').slice(0, 120), path: `/collection/requirements/${c.id}` });
    }

    // Collection Assets
    const assets = await db('collection_assets')
      .select('id', 'name', 'platform')
      .whereRaw('name ILIKE ? OR platform ILIKE ?', [term, term])
      .limit(3);
    for (const a of assets) {
      results.push({ entity_type: 'Asset', entity_id: a.id, title: a.name, subtitle: (a.platform || '').slice(0, 120), path: `/collection/assets/${a.id}` });
    }

    // Tasking Assignments
    const tasks = await db('tasking_assignments')
      .select('id', 'title', 'description')
      .whereRaw('title ILIKE ? OR description ILIKE ?', [term, term])
      .limit(3);
    for (const t of tasks) {
      results.push({ entity_type: 'Task', entity_id: t.id, title: t.title, subtitle: (t.description || '').slice(0, 120), path: `/tasking/${t.id}` });
    }

    // GEOINT Features
    const geoint = await db('geoint_features')
      .select('id', 'title', 'description')
      .whereRaw('title ILIKE ? OR description ILIKE ?', [term, term])
      .limit(3);
    for (const g of geoint) {
      results.push({ entity_type: 'GEOINT', entity_id: g.id, title: g.title, subtitle: (g.description || '').slice(0, 120), path: `/geoint/${g.id}` });
    }

    // SIGINT Intercepts
    const sigint = await db('sigint_intercepts')
      .select('id', 'title', 'content')
      .whereRaw('title ILIKE ? OR content ILIKE ?', [term, term])
      .limit(3);
    for (const s of sigint) {
      results.push({ entity_type: 'SIGINT', entity_id: s.id, title: s.title, subtitle: (s.content || '').slice(0, 120), path: `/sigint/${s.id}` });
    }

    // CI Investigations
    const ci = await db('ci_investigations')
      .select('id', 'title', 'subject')
      .whereRaw('title ILIKE ? OR subject ILIKE ?', [term, term])
      .limit(3);
    for (const c of ci) {
      results.push({ entity_type: 'CI', entity_id: c.id, title: c.title, subtitle: (c.subject || '').slice(0, 120), path: `/ci/${c.id}` });
    }

    // FININT Entities
    const fintEntities = await db('fint_entities')
      .select('id', 'name', 'description')
      .whereRaw('name ILIKE ? OR description ILIKE ?', [term, term])
      .limit(3);
    for (const f of fintEntities) {
      results.push({ entity_type: 'FININT', entity_id: f.id, title: f.name, subtitle: (f.description || '').slice(0, 120), path: `/fint/${f.id}` });
    }

    // FININT Transactions
    const transactions = await db('fint_transactions')
      .select('id', 'transaction_ref')
      .whereRaw('transaction_ref ILIKE ?', [term])
      .limit(3);
    for (const t of transactions) {
      results.push({ entity_type: 'Transaction', entity_id: t.id, title: t.transaction_ref, subtitle: '', path: `/fint/${t.id}` });
    }

    // Biometric Records
    const biometrics = await db('biometric_records')
      .select('id', 'subject_name')
      .whereRaw('subject_name ILIKE ?', [term])
      .limit(3);
    for (const b of biometrics) {
      results.push({ entity_type: 'Biometric', entity_id: b.id, title: b.subject_name, subtitle: '', path: `/biometrics/${b.id}` });
    }

    // Briefings
    const briefings = await db('briefings')
      .select('id', 'title')
      .whereRaw('title ILIKE ?', [term])
      .limit(3);
    for (const b of briefings) {
      results.push({ entity_type: 'Briefing', entity_id: b.id, title: b.title, subtitle: '', path: `/briefings/${b.id}` });
    }

    // Message Channels
    const channels = await db('message_channels')
      .select('id', 'name')
      .whereRaw('name ILIKE ?', [term])
      .limit(3);
    for (const c of channels) {
      results.push({ entity_type: 'Channel', entity_id: c.id, title: c.name, subtitle: '', path: `/messages/${c.id}` });
    }

    // External Partners
    const partners = await db('external_partners')
      .select('id', 'name', 'organization')
      .whereRaw('name ILIKE ? OR organization ILIKE ?', [term, term])
      .limit(3);
    for (const p of partners) {
      results.push({ entity_type: 'Partner', entity_id: p.id, title: p.name, subtitle: (p.organization || '').slice(0, 120), path: `/liaison/${p.id}` });
    }

    // Legal Reviews
    const legal = await db('legal_reviews')
      .select('id', 'title')
      .whereRaw('title ILIKE ?', [term])
      .limit(3);
    for (const l of legal) {
      results.push({ entity_type: 'Legal', entity_id: l.id, title: l.title, subtitle: '', path: `/legal/${l.id}` });
    }

    // Archive Records
    const archives = await db('archive_records')
      .select('id', 'title')
      .whereRaw('title ILIKE ?', [term])
      .limit(3);
    for (const a of archives) {
      results.push({ entity_type: 'Archive', entity_id: a.id, title: a.title, subtitle: '', path: `/archive/${a.id}` });
    }

    // Program Budgets
    const budgets = await db('program_budgets')
      .select('id', 'program_name')
      .whereRaw('program_name ILIKE ?', [term])
      .limit(3);
    for (const b of budgets) {
      results.push({ entity_type: 'Budget', entity_id: b.id, title: b.program_name, subtitle: '', path: `/budget/${b.id}` });
    }

    // Org Units
    const orgUnits = await db('org_units')
      .select('id', 'name', 'description')
      .whereRaw('name ILIKE ? OR description ILIKE ?', [term, term])
      .limit(3);
    for (const o of orgUnits) {
      results.push({ entity_type: 'Org Unit', entity_id: o.id, title: o.name, subtitle: (o.description || '').slice(0, 120), path: `/org-chart/${o.id}` });
    }

    // Training Courses
    const courses = await db('training_courses')
      .select('id', 'title', 'description')
      .whereRaw('title ILIKE ? OR description ILIKE ?', [term, term])
      .limit(3);
    for (const c of courses) {
      results.push({ entity_type: 'Course', entity_id: c.id, title: c.title, subtitle: (c.description || '').slice(0, 120), path: `/training/${c.id}` });
    }

    // Watch Center SITREPs
    const sitreps = await db('sitreps')
      .select('id', 'title')
      .whereRaw('title ILIKE ?', [term])
      .limit(3);
    for (const s of sitreps) {
      results.push({ entity_type: 'SITREP', entity_id: s.id, title: s.title, subtitle: '', path: `/watch-center/${s.id}` });
    }

    // Mission Plans (already searched as 'Mission')
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
