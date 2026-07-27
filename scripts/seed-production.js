const axios = require('axios');
const api = axios.create({
  baseURL: 'http://localhost:4000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

let ok = 0;
let fail = 0;
function logOk(msg) {
  ok++;
  console.log('  OK: ' + msg);
}
function logFail(msg, err) {
  fail++;
  const detail = err?.response?.data?.error || err?.message || String(err);
  console.log('  FAIL: ' + msg + ' -> ' + detail);
}

async function seed() {
  console.log('=== Intel Platform Production Seed ===\n');

  // ── Auth ──
  console.log('Authenticating...');
  const { data: auth } = await api.post('/auth/login', {
    email: 'admin@intel.local',
    password: 'admin123!',
  });
  api.defaults.headers.common.Authorization = 'Bearer ' + auth.accessToken;
  const uid = auth.user.id;
  console.log('Admin ID: ' + uid + '\n');

  // ── Reports (5 across all statuses) ──
  console.log('--- Reports ---');
  const reportIds = [];
  for (const r of [
    { title: 'Border Activity Assessment - Northern Corridor', summary: 'Increased patrol activity along northern border corridor over 72 hours. Multiple vehicle crossings observed near checkpoint Gamma.', classification: 'SECRET', status: 'DRAFT', priority: 'HIGH' },
    { title: 'Emerging Threat Actor - Phoenix Group Network', summary: 'Analysis of newly identified Phoenix Group operating in southeastern region. Links to weapons smuggling and cross-border financing.', classification: 'TOP_SECRET', status: 'IN_REVIEW', priority: 'CRITICAL' },
    { title: 'Economic Indicators Report - Q3 FY2024', summary: 'Quarterly economic intelligence summary covering trade patterns, currency fluctuations, and sanctions compliance analysis.', classification: 'CONFIDENTIAL', status: 'APPROVED', priority: 'MEDIUM' },
    { title: 'Signals Intercept Summary - Week 28', summary: 'Compilation of significant signals intercepts across multiple collection platforms. 23 actionable items identified.', classification: 'SECRET', status: 'DISSEMINATED', priority: 'HIGH' },
    { title: 'Open Source Media Monitoring - 27 July', summary: 'Daily summary of relevant open source coverage including social media trends, news reports, and academic publications.', classification: 'UNCLASSIFIED', status: 'DRAFT', priority: 'LOW' },
  ]) {
    try {
      const { data } = await api.post('/reports', r);
      reportIds.push(data.id);
      logOk(r.title);
    } catch (e) { reportIds.push(null); logFail(r.title, e); }
  }

  // ── Sources (6 of different types) ──
  console.log('--- Sources ---');
  const sourceIds = [];
  for (const s of [
    { code_name: 'AZALEA-7', type: 'HUMINT', reliability_rating: 'A-1', status: 'ACTIVE', description: 'Senior official with cabinet-level access providing policy insights and decision-maker intentions.' },
    { code_name: 'OBSIDIAN-9', type: 'OSINT', reliability_rating: 'A-2', status: 'ACTIVE', description: 'Social media scraping pipeline covering 12 platforms in 8 languages. 24/7 automated collection.' },
    { code_name: 'FALCON-EYE', type: 'GEOINT', reliability_rating: 'A-1', status: 'ACTIVE', description: 'Satellite imagery station with access to 0.3m resolution electro-optical and SAR capabilities.' },
    { code_name: 'SHADOW-NET', type: 'TECHINT', reliability_rating: 'B-1', status: 'ACTIVE', description: 'Cyber intelligence platform for dark web monitoring and network traffic analysis.' },
    { code_name: 'CYPRESS-3', type: 'SIGINT', reliability_rating: 'B-2', status: 'ACTIVE', description: 'Signal collection node covering HF/VHF/UHF spectrum with automated processing pipeline.' },
    { code_name: 'JASPER-1', type: 'MASINT', reliability_rating: 'A-3', status: 'ACTIVE', description: 'Measurement and signature intelligence collection at forward operating base. Seismic and acoustic sensors.' },
  ]) {
    try {
      const { data } = await api.post('/sources', s);
      sourceIds.push(data.id);
      logOk(s.code_name + ' (' + s.type + ')');
    } catch (e) { sourceIds.push(null); logFail(s.code_name, e); }
  }

  // ── Cases (5 linked to reports) ──
  console.log('--- Cases ---');
  const caseIds = [];
  for (const c of [
    { title: 'Operation Silent Watch - Northern Border', description: 'Cross-border activity investigation coordinating SIGINT and GEOINT assets. Linked to Border Activity Assessment.', status: 'OPEN', priority: 'HIGH', classification: 'SECRET' },
    { title: 'Phoenix Group Network Mapping', description: 'Comprehensive organizational structure and funding source analysis. Connected to Phoenix Group emerging threat report.', status: 'IN_PROGRESS', priority: 'CRITICAL', classification: 'TOP_SECRET' },
    { title: 'Cyber Intrusion - Banking Sector Q3', description: 'Coordinated cyber attacks targeting regional banking infrastructure. 7 institutions affected.', status: 'OPEN', priority: 'HIGH', classification: 'CONFIDENTIAL' },
    { title: 'Maritime Smuggling - Eastern Coast Corridor', description: 'Weapons and dual-use technology smuggling investigation involving 3 flagged vessels.', status: 'IN_PROGRESS', priority: 'CRITICAL', classification: 'SECRET' },
    { title: 'Diplomatic Personnel Vetting - R1', description: 'Routine security vetting of diplomatic personnel assigned to eastern region posts. 14 individuals in scope.', status: 'CLOSED', priority: 'MEDIUM', classification: 'CONFIDENTIAL' },
  ]) {
    try {
      const { data } = await api.post('/cases', c);
      caseIds.push(data.id);
      logOk(c.title);
    } catch (e) { caseIds.push(null); logFail(c.title, e); }
  }

  // ── Evidence (5 linked to cases) ──
  console.log('--- Evidence ---');
  const evidenceIds = [];
  for (const e of [
    { title: 'Satellite Imagery - Northern Corridor Grid 17K', type: 'IMAGE', classification: 'SECRET', caseId: caseIds[0] },
    { title: 'Intercepted Communication Transcript - Phoenix Cell', type: 'DOCUMENT', classification: 'TOP_SECRET', caseId: caseIds[1] },
    { title: 'Financial Records Analysis - Q2 2024', type: 'DOCUMENT', classification: 'CONFIDENTIAL', caseId: caseIds[1] },
    { title: 'Border Surveillance Footage - Night Ops 24-26 July', type: 'VIDEO', classification: 'SECRET', caseId: caseIds[0] },
    { title: 'Bank Server Access Logs - 14 July', type: 'DATA', classification: 'CONFIDENTIAL', caseId: caseIds[2] },
  ]) {
    try {
      const { data } = await api.post('/evidence', e);
      evidenceIds.push(data.id);
      logOk(e.title);
    } catch (err) { evidenceIds.push(null); logFail(e.title, err); }
  }

  // ── OSINT Tasks (3 with results from running) ──
  console.log('--- OSINT ---');
  const osintTaskIds = [];
  for (const t of [
    { title: 'Social Media Sweep - Phoenix Group Funding', query: 'phoenix group + arms + border', source_types: '["TWITTER","TELEGRAM","FACEBOOK"]', status: 'IDLE' },
    { title: 'News Monitoring - Regional Economic Indicators', query: 'currency OR sanctions OR trade deficit', source_types: '["NEWS","BLOGS","JOURNALS"]', status: 'IDLE' },
    { title: 'Darknet Monitoring - Weapons Marketplace Tracking', query: 'arms OR ammunition OR explosives', source_types: '["DARKNET","FORUMS"]', status: 'IDLE' },
  ]) {
    try {
      const { data } = await api.post('/osint/tasks', t);
      osintTaskIds.push(data.id);
      try { await api.post('/osint/tasks/' + data.id + '/run'); } catch {}
      logOk(t.title);
    } catch (e) { osintTaskIds.push(null); logFail(t.title, e); }
  }

  // ── Threat Actors (4) + Indicators (3-4 each) ──
  console.log('--- Threat Actors ---');
  const actorIds = [];
  const actorSpecs = [
    { name: 'Phoenix Group', aliases: '["Phoenix Collective","PG-13","Firebird Network"]', description: 'Emerging extremist group involved in weapons trafficking and cross-border smuggling. Estimated 150-200 members.', motivation: 'POLITICAL/IDEOLOGICAL', sophistication: 'MEDIUM', status: 'ACTIVE' },
    { name: 'Crimson Dawn', aliases: '["CD-Unit","Red Dawn","APT-47"]', description: 'State-sponsored cyber espionage unit targeting government and defense sectors. Advanced persistent threat.', motivation: 'STATE-SPONSORED', sophistication: 'HIGH', status: 'ACTIVE' },
    { name: 'Shadow Cartel', aliases: '["Shadow Network","Los Sombras","SC-12"]', description: 'Transnational criminal organization controlling major smuggling routes. Diversified revenue streams.', motivation: 'FINANCIAL', sophistication: 'MEDIUM', status: 'ACTIVE' },
    { name: 'Black Tide Maritime', aliases: '["BTM","Tide Group","Sea Wolves"]', description: 'Maritime-focused threat group conducting piracy and illegal transshipment operations in eastern waters.', motivation: 'FINANCIAL', sophistication: 'LOW', status: 'ACTIVE' },
  ];
  for (const a of actorSpecs) {
    try {
      const { data } = await api.post('/threats/actors', a);
      actorIds.push(data.id);
      logOk(a.name);
    } catch (e) { actorIds.push(null); logFail(a.name, e); }
  }

  // Indicators per actor
  console.log('--- Indicators ---');
  const indicatorMap = [
    { threat_actor_id: actorIds[0], items: [
      { type: 'DOMAIN', value: 'phoenix-supply.net', confidence: 85 },
      { type: 'EMAIL', value: 'contact@phoenix-supply.net', confidence: 70 },
      { type: 'HASH', value: 'd4e2fc1a8b93c67e9a0f12b3456789ab', confidence: 65 },
      { type: 'PHONE', value: '+998-555-0147', confidence: 55 },
    ] },
    { threat_actor_id: actorIds[1], items: [
      { type: 'IP', value: '198.51.100.44', confidence: 90 },
      { type: 'DOMAIN', value: 'crimson-dawn.xyz', confidence: 95 },
      { type: 'URL', value: 'https://crimson-dawn.xyz/updates/', confidence: 88 },
      { type: 'IP', value: '203.0.113.89', confidence: 82 },
    ] },
    { threat_actor_id: actorIds[2], items: [
      { type: 'DOMAIN', value: 'shadow-cartel-logistics.tk', confidence: 72 },
      { type: 'HASH', value: 'a1b2c3d4e5f67890abcdef1234567890', confidence: 60 },
      { type: 'EMAIL', value: 'operations@shadow-logistics.tk', confidence: 68 },
    ] },
    { threat_actor_id: actorIds[3], items: [
      { type: 'IP', value: '192.0.2.77', confidence: 75 },
      { type: 'URL', value: 'https://blacktide-maritime.cc/cargo/', confidence: 70 },
      { type: 'DOMAIN', value: 'blacktide-maritime.cc', confidence: 78 },
    ] },
  ];
  for (const group of indicatorMap) {
    for (const i of group.items) {
      try {
        await api.post('/threats/indicators', { ...i, threat_actor_id: group.threat_actor_id });
        logOk(i.type + ': ' + i.value);
      } catch (e) { logFail(i.value, e); }
    }
  }

  // ── Personnel (5 records) ──
  console.log('--- Personnel ---');
  const personnelIds = [];
  const personnelSpecs = [
    { user_id: uid, position_title: 'Senior Intelligence Analyst', clearance_level: 'TOP_SECRET', nationality: 'US', notes: '15 years experience, regional subject matter expert. Specialized in HUMINT analysis and network mapping.' },
    { position_title: 'Deputy Director of Operations', clearance_level: 'TOP_SECRET', nationality: 'US', notes: 'Former special forces commander. 20+ years operational experience in contested environments.' },
    { position_title: 'SIGINT Collection Manager', clearance_level: 'TOP_SECRET', nationality: 'GB', notes: 'Signals intelligence specialist. 12 years running collection operations across multiple theaters.' },
    { position_title: 'Cyber Threat Intelligence Lead', clearance_level: 'TOP_SECRET', nationality: 'US', notes: 'Digital forensics and malware analysis expert. Former private sector threat hunter.' },
    { position_title: 'Regional Desk Officer', clearance_level: 'SECRET', nationality: 'CA', notes: 'Country desk officer covering 5 nations in the eastern region. Language proficiency in regional dialects.' },
  ];
  // Get or create extra users for remaining personnel records
  const staticUserIds = [null, null, null, null, null];
  const extraEmails = [
    'ops.deputy@intel.local',
    'sigint.mgr@intel.local',
    'cyber.lead@intel.local',
    'regional.desk@intel.local',
  ];
  for (let i = 0; i < extraEmails.length; i++) {
    const email = extraEmails[i];
    const password = 'seedpass' + (i + 1) + '!A';
    try {
      const { data: loginResult } = await api.post('/auth/login', { email, password });
      staticUserIds[i] = loginResult.user.id;
      api.defaults.headers.common.Authorization = 'Bearer ' + auth.accessToken;
    } catch {
      try {
        const { data: regResult } = await api.post('/auth/register', {
          email, password,
          firstName: 'Staff',
          lastName: `Member${i + 1}`,
          rank: 'Staff Officer',
          clearance: 'TOP_SECRET',
        });
        staticUserIds[i] = regResult.user.id;
      } catch {
        // user creation failed, will skip
      }
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  for (let idx = 0; idx < personnelSpecs.length; idx++) {
    const p = personnelSpecs[idx];
    try {
      const payload = { ...p };
      if (!p.user_id && idx - 1 < staticUserIds.length) {
        const uid2 = staticUserIds[idx - 1];
        if (uid2) payload.user_id = uid2;
      }
      const { data } = await api.post('/personnel', payload);
      personnelIds.push(data.id);
      logOk(p.position_title);
    } catch (e) {
      personnelIds.push(null);
      logFail(p.position_title, e);
    }
  }

  // ── Org Chart (6 units with hierarchy) ──
  console.log('--- Org Chart ---');
  let dirId = null, opsId = null, anaId = null;
  try {
    const dirRes = await api.post('/org-chart/units', { name: 'Intelligence Directorate', unit_type: 'DIRECTORATE', description: 'Top-level intelligence organization overseeing all collection and analysis operations.' });
    dirId = dirRes.data.id;
    logOk('Intelligence Directorate');
  } catch (e) { logFail('Intelligence Directorate', e); }
  try {
    const opsRes = await api.post('/org-chart/units', { name: 'Operations Division', unit_type: 'DIVISION', parent_id: dirId, description: 'Operational arm handling field collection, covert ops, and liaison coordination.' });
    opsId = opsRes.data.id;
    logOk('Operations Division');
  } catch (e) { logFail('Operations Division', e); }
  try {
    const anaRes = await api.post('/org-chart/units', { name: 'Analysis Division', unit_type: 'DIVISION', parent_id: dirId, description: 'All-source analysis division providing finished intelligence products.' });
    anaId = anaRes.data.id;
    logOk('Analysis Division');
  } catch (e) { logFail('Analysis Division', e); }
  try {
    await api.post('/org-chart/units', { name: 'SIGINT Branch', unit_type: 'BRANCH', parent_id: anaId, description: 'Signals intelligence analysis and processing branch.' });
    logOk('SIGINT Branch');
  } catch (e) { logFail('SIGINT Branch', e); }
  try {
    await api.post('/org-chart/units', { name: 'GEOINT Branch', unit_type: 'BRANCH', parent_id: anaId, description: 'Geospatial intelligence analysis and imagery interpretation branch.' });
    logOk('GEOINT Branch');
  } catch (e) { logFail('GEOINT Branch', e); }
  try {
    await api.post('/org-chart/units', { name: 'HUMINT Section', unit_type: 'SECTION', parent_id: opsId, description: 'Human intelligence handling and source management section.' });
    logOk('HUMINT Section');
  } catch (e) { logFail('HUMINT Section', e); }

  // ── Training (4 courses + 3 enrollments) ──
  console.log('--- Training ---');
  const courseIds = [];
  for (const t of [
    { title: 'Advanced Tradecraft Techniques', description: 'Cover development, dead drops, surveillance detection, and operational security procedures.', course_type: 'FIELD', duration_hours: 40, instructor: 'Senior Ops Officer', is_required: true },
    { title: 'OSINT Collection Fundamentals', description: 'Open source collection methodologies, tools, and analytical techniques for all-source analysts.', course_type: 'TECHNICAL', duration_hours: 24, instructor: 'OSINT Lead', is_required: true },
    { title: 'Threat Analysis and Indicator Development', description: 'Actor profiling, IOC development, and structured analytic techniques for threat assessment.', course_type: 'ANALYTICAL', duration_hours: 16, instructor: 'Senior Threat Analyst', is_required: false },
    { title: 'Secure Communications and COMSEC', description: 'COMSEC procedures, encrypted messaging tools, and communications discipline for field personnel.', course_type: 'TECHNICAL', duration_hours: 8, instructor: 'COMSEC Officer', is_required: true },
  ]) {
    try {
      const { data } = await api.post('/training/courses', t);
      courseIds.push(data.id);
      logOk(t.title);
    } catch (e) { courseIds.push(null); logFail(t.title, e); }
  }

  console.log('--- Training Enrollments ---');
  for (const enrollment of [
    { user_id: uid, course_id: courseIds[0], status: 'COMPLETED', score: 92 },
    { user_id: uid, course_id: courseIds[1], status: 'IN_PROGRESS', score: null },
    { user_id: uid, course_id: courseIds[2], status: 'ENROLLED', score: null },
  ]) {
    try {
      await api.post('/training/enrollments', enrollment);
      logOk('Enrollment in course ' + enrollment.course_id);
    } catch (e) { logFail('Enrollment', e); }
  }

  try {
    await api.post('/training/aar', {
      author_id: uid,
      title: 'Cyber Storm 2024 After Action Report',
      exercise_name: 'Cyber Storm 2024',
      date: '2024-06-15',
      summary: 'Multi-agency simulated APT attack on critical financial infrastructure. 47 participants from 8 agencies.',
      findings: '{"strengths":["Rapid threat detection under 4 minutes","Effective cross-team coordination"],"weaknesses":["Inter-agency notification delays","Inconsistent IOC sharing format"],"lessons_learned":["Standardize threat feed formats","Pre-designate backup comms channels"]}',
      recommendations: '["Implement automated inter-agency notification system","Conduct quarterly joint exercises","Update incident response playbook","Establish redundant comms links"]',
    });
    logOk('AAR: Cyber Storm 2024');
  } catch (e) { logFail('AAR: Cyber Storm 2024', e); }

  // ── Watch Center (2 SITREPs + 2 watch logs + 2 shifts) ──
  console.log('--- Watch Center ---');
  try {
    await api.post('/watch-center/sitreps', {
      author_id: uid,
      title: 'SITREP 2024-07-27 0600 Hours',
      classification: 'SECRET',
      content: '{"summary":"Quiet overnight period. No significant incidents reported. All sectors reporting normal activity levels.","incidents":[],"personnel_on_duty":12,"systems_status":"All collection platforms nominal"}',
      period_start: '2024-07-27T00:00:00Z',
      period_end: '2024-07-27T06:00:00Z',
    });
    logOk('SITREP 2024-07-27 0600');
  } catch (e) { logFail('SITREP 0600', e); }
  try {
    await api.post('/watch-center/sitreps', {
      author_id: uid,
      title: 'SITREP 2024-07-26 1800 Hours',
      classification: 'SECRET',
      content: '{"summary":"Increased activity in Sector 3. UAV sighted near checkpoint Gamma at 14:30 local.","incidents":[{"type":"UAV_SIGHTING","time":"14:30","location":"Sector 3, Grid 37T","confidence":"HIGH","response":"Visual confirmation by observation post","status":"MONITORING"}],"personnel_on_duty":14}',
      period_start: '2024-07-26T12:00:00Z',
      period_end: '2024-07-26T18:00:00Z',
    });
    logOk('SITREP 2024-07-26 1800');
  } catch (e) { logFail('SITREP 1800', e); }
  try {
    await api.post('/watch-center/logs', {
      author_id: uid,
      title: 'Watch Handover - Shift 1 to Shift 2',
      log_type: 'HANDOVER',
      content: 'All nominal shift handover. Two active cases being monitored (Op Silent Watch, Maritime Smuggling). No alerts in queue.',
      severity: 'ROUTINE',
      status: 'ACKNOWLEDGED',
    });
    logOk('Watch Log: Handover');
  } catch (e) { logFail('Watch Log: Handover', e); }
  try {
    await api.post('/watch-center/logs', {
      author_id: uid,
      title: 'ALERT - UAV Sighting Sector 3',
      log_type: 'ALERT',
      content: 'Radar contact detected at 14:30 local near Sector 3 checkpoint Gamma. Visual confirmation by observation post Oscar. UAV type unidentified.',
      severity: 'HIGH',
      status: 'ACTIVE',
    });
    logOk('Watch Log: UAV Alert');
  } catch (e) { logFail('Watch Log: UAV Alert', e); }
  try {
    await api.post('/watch-center/shifts', { user_id: uid, shift_name: 'Day Watch', start_time: '06:00', end_time: '18:00', is_active: true });
    logOk('Shift: Day Watch');
  } catch (e) { logFail('Shift: Day Watch', e); }
  try {
    await api.post('/watch-center/shifts', { user_id: uid, shift_name: 'Night Watch', start_time: '18:00', end_time: '06:00', is_active: true });
    logOk('Shift: Night Watch');
  } catch (e) { logFail('Shift: Night Watch', e); }

  // ── Missions (2 plans with briefs) ──
  console.log('--- Missions ---');
  let missionId1 = null, missionId2 = null;
  try {
    const { data } = await api.post('/missions/plans', {
      commander_id: uid,
      title: 'Operation Northern Shield',
      objective: 'Comprehensive border surveillance coverage across northern corridor. Deploy additional SIGINT and GEOINT assets.',
      status: 'PLANNING',
      priority: 'HIGH',
      classification: 'SECRET',
      location: 'Northern Border Corridor - Sectors 1-7',
      start_date: '2024-08-01',
      end_date: '2024-12-31',
    });
    missionId1 = data.id;
    logOk('Mission: Operation Northern Shield');
  } catch (e) { logFail('Mission: Op Northern Shield', e); }
  try {
    const { data } = await api.post('/missions/plans', {
      commander_id: uid,
      title: 'Operation Night Watch',
      objective: 'Rapid response to border incursions with 15-minute alert posture. Integrated sensor-to-shooter architecture.',
      status: 'ACTIVE',
      priority: 'CRITICAL',
      classification: 'TOP_SECRET',
      location: 'Eastern Border - Sectors Alpha through Delta',
      start_date: '2024-07-01',
      end_date: '2024-12-31',
    });
    missionId2 = data.id;
    logOk('Mission: Operation Night Watch');
  } catch (e) { logFail('Mission: Op Night Watch', e); }

  if (missionId1) {
    try {
      await api.post('/missions/plans/' + missionId1 + '/briefs', {
        title: 'CONOPS Brief - Northern Shield v1',
        content: '{"sections":[{"Objective":"Border surveillance coverage","Forces":"2 UAV teams, 3 SIGINT stations","Timeline":"120 days","Logistics":"Forward operating base Delta","Rules of Engagement":"Standard ROE package A"},{"Collection Plan":"24/7 SIGINT sweep + daily UAV patrols","Assessment":"Moderate threat of cross-border incursions"}]}',
        version: 1,
      });
      logOk('Brief: Northern Shield v1');
    } catch (e) { logFail('Brief: Northern Shield v1', e); }
    try {
      await api.post('/missions/plans/' + missionId1 + '/briefs', {
        title: 'CONOPS Brief - Northern Shield v2',
        content: '{"sections":[{"Objective":"Border surveillance coverage - revised","Forces":"3 UAV teams, 4 SIGINT stations, 1 QRF unit","Timeline":"120 days","Logistics":"Forward operating bases Delta and Echo","Rules of Engagement":"Standard ROE package B - elevated"}]}',
        version: 2,
      });
      logOk('Brief: Northern Shield v2');
    } catch (e) { logFail('Brief: Northern Shield v2', e); }
  }

  // ── Targeting (2 packages with nominations) ──
  console.log('--- Targeting ---');
  let pkgId1 = null, pkgId2 = null;
  try {
    const { data } = await api.post('/targeting/packages', {
      author_id: uid,
      title: 'Alpha-7: Suspected Weapons Storage Facility',
      objective: 'Degrade weapons storage and transshipment capability at Site Alpha-7',
      status: 'NOMINATED',
      priority: 'HIGH',
      classification: 'SECRET',
      target_name: 'Site Alpha-7',
      location: '37.2350,-115.8111',
      cde_estimate: 'LOW',
    });
    pkgId1 = data.id;
    logOk('Target Package: Alpha-7');
  } catch (e) { logFail('Target Package: Alpha-7', e); }
  try {
    const { data } = await api.post('/targeting/packages', {
      author_id: uid,
      title: 'Bravo-3: Phoenix Group Command & Control Hub',
      objective: 'Disrupt C2 capabilities of Phoenix Group through degradation of communications hub',
      status: 'VETTED',
      priority: 'CRITICAL',
      classification: 'TOP_SECRET',
      target_name: 'Phoenix Group Comm Hub Bravo-3',
      location: '37.4189,-116.0234',
      cde_estimate: 'MODERATE',
    });
    pkgId2 = data.id;
    logOk('Target Package: Bravo-3');
  } catch (e) { logFail('Target Package: Bravo-3', e); }

  if (pkgId1) {
    try {
      await api.post('/targeting/packages/' + pkgId1 + '/nominations', {
        title: 'Nomination - Site Alpha-7 Weapons Storage',
        justification: 'Confirmed weapons storage facility. 12-15 personnel observed. Immediate threat to border security.',
        priority: 'HIGH',
        classification: 'SECRET',
      });
      logOk('Nomination: Alpha-7');
    } catch (e) { logFail('Nomination: Alpha-7', e); }
  }
  if (pkgId2) {
    try {
      await api.post('/targeting/packages/' + pkgId2 + '/nominations', {
        title: 'Nomination - Phoenix Group C2 Hub Bravo-3',
        justification: 'C2 node with satellite uplink and encrypted comms. Degrading disrupts group operations.',
        priority: 'CRITICAL',
        classification: 'TOP_SECRET',
      });
      logOk('Nomination: Bravo-3');
    } catch (e) { logFail('Nomination: Bravo-3', e); }
  }

  // ── Collection (2 requirements + 2 assets) ──
  console.log('--- Collection ---');
  try {
    await api.post('/collection/requirements', {
      requester_id: uid,
      title: 'Northern Border 24/7 SIGINT Coverage',
      description: 'Full-spectrum signals intelligence coverage of northern border corridor. Priority on VHF/UHF tactical communications.',
      intelligence_discipline: 'SIGINT',
      priority: 'HIGH',
      status: 'ACTIVE',
    });
    logOk('Collection Req: Northern Border SIGINT');
  } catch (e) { logFail('Collection Req: SIGINT', e); }
  try {
    await api.post('/collection/requirements', {
      requester_id: uid,
      title: 'Phoenix Group Financial Network Mapping',
      description: 'Trace financial transactions linking Phoenix Group operatives to funding sources. Cross-reference with FININT entities.',
      intelligence_discipline: 'FININT',
      priority: 'HIGH',
      status: 'ACTIVE',
    });
    logOk('Collection Req: FININT Mapping');
  } catch (e) { logFail('Collection Req: FININT', e); }
  try {
    await api.post('/collection/assets', {
      name: 'EAGLE-1',
      asset_type: 'SATELLITE',
      platform: 'GEO-INT Constellation',
      capability: '0.3m optical + SAR all-weather capability. Revisit time 4 hours.',
      status: 'OPERATIONAL',
      location: 'Geosynchronous orbit, 105E slot',
    });
    logOk('Collection Asset: EAGLE-1');
  } catch (e) { logFail('Collection Asset: EAGLE-1', e); }
  try {
    await api.post('/collection/assets', {
      name: 'RAVEN-4',
      asset_type: 'UAV',
      platform: 'MQ-9 Reaper Block 5',
      capability: 'Full motion video + SIGINT payload. 24-hour endurance.',
      status: 'OPERATIONAL',
      location: 'Forward Operating Base Delta',
    });
    logOk('Collection Asset: RAVEN-4');
  } catch (e) { logFail('Collection Asset: RAVEN-4', e); }

  // ── Tasking (3 assignments) ──
  console.log('--- Tasking ---');
  try {
    await api.post('/tasking/assignments', {
      assigned_to: uid, assigned_by: uid,
      title: 'Analyze Phoenix Group Financial Network',
      description: 'Complete financial transaction analysis linking shell companies to Phoenix Group operatives. Cross-reference FININT database and SWIFT records.',
      task_type: 'ANALYSIS', priority: 'HIGH', status: 'ASSIGNED', due_date: '2024-08-15',
    });
    logOk('Tasking: Analyze Phoenix Finances');
  } catch (e) { logFail('Tasking: Finances', e); }
  try {
    await api.post('/tasking/assignments', {
      assigned_to: uid, assigned_by: uid,
      title: 'Quarterly Threat Assessment - Crimson Dawn',
      description: 'Update comprehensive threat assessment for Crimson Dawn APT group. Include recent indicators and campaign analysis.',
      task_type: 'ASSESSMENT', priority: 'MEDIUM', status: 'PENDING', due_date: '2024-09-01',
    });
    logOk('Tasking: Crimson Dawn Assessment');
  } catch (e) { logFail('Tasking: Crimson Dawn', e); }
  try {
    await api.post('/tasking/assignments', {
      assigned_to: uid, assigned_by: uid,
      title: 'Prepare Director Monthly Briefing Package',
      description: 'Compile all-source intelligence briefing for Director covering active operations, emerging threats, and collection status.',
      task_type: 'BRIEFING', priority: 'HIGH', status: 'IN_PROGRESS', due_date: '2024-07-30',
    });
    logOk('Tasking: Director Briefing');
  } catch (e) { logFail('Tasking: Director Briefing', e); }
  try {
    await api.post('/tasking/workflows', {
      name: 'Intelligence Report Review Pipeline',
      description: 'Standard review and approval pipeline for finished intelligence reports.',
      steps: '["Draft","Peer Review","Supervisor Review","Classification Review","Quality Assurance","Publish"]',
      is_active: true,
    });
    logOk('Tasking Workflow: Report Review');
  } catch (e) { logFail('Tasking Workflow', e); }

  // ── GEOINT (2 features) ──
  console.log('--- GEOINT ---');
  try {
    await api.post('/geoint/features', {
      title: 'Suspected Facility Grid 37T - Irregular Structure',
      feature_type: 'POLYGON',
      coordinates: '{"type":"Polygon","coordinates":[[[-115.8,37.2],[-115.7,37.2],[-115.7,37.3],[-115.8,37.3],[-115.8,37.2]]]}',
      classification: 'SECRET',
      description: 'Irregular structure with no official registration. Thermal signature indicates occupancy. 3 vehicles observed.',
    });
    logOk('GEOINT: Facility Grid 37T');
  } catch (e) { logFail('GEOINT: Grid 37T', e); }
  try {
    await api.post('/geoint/features', {
      title: 'Supply Route Eastern Corridor - Tire Track Evidence',
      feature_type: 'LINESTRING',
      coordinates: '{"type":"LineString","coordinates":[[-116.0,37.1],[-115.9,37.15],[-115.7,37.2],[-115.5,37.25]]}',
      classification: 'SECRET',
      description: 'Fresh tire tracks indicating heavy vehicle traffic on unmarked route. Pattern consistent with cargo trucks.',
    });
    logOk('GEOINT: Supply Route');
  } catch (e) { logFail('GEOINT: Supply Route', e); }

  // ── SIGINT (2 intercepts + 2 emitters) ──
  console.log('--- SIGINT ---');
  try {
    await api.post('/sigint/intercepts', {
      title: 'Encrypted Burst Transmission - 2450 MHz',
      signal_type: 'BURST',
      frequency: '2450.0',
      modulation: 'QPSK',
      content: 'ENCRYPTED - Unable to decode with current resources. Duration: 2.3 seconds. Signal strength: -65 dBm.',
      collection_date: '2024-07-26T14:30:00Z',
      classification: 'SECRET',
    });
    logOk('SIGINT Intercept: 2450 MHz Burst');
  } catch (e) { logFail('SIGINT Intercept: Burst', e); }
  try {
    await api.post('/sigint/intercepts', {
      title: 'Voice Communication - 8450 kHz HF',
      signal_type: 'VOICE',
      frequency: '8450.0',
      modulation: 'AM',
      content: 'TRANSCRIPT: ...delivery scheduled for next week...route through checkpoint gamma...use alternate frequency after 2200...',
      collection_date: '2024-07-26T09:15:00Z',
      classification: 'CONFIDENTIAL',
    });
    logOk('SIGINT Intercept: 8450 kHz Voice');
  } catch (e) { logFail('SIGINT Intercept: Voice', e); }
  try {
    await api.post('/sigint/emitters', {
      name: 'EMITTER-XB7',
      emitter_type: 'RADAR',
      frequency_range: '{"low":9500,"high":10200}',
      location: '{"lat":37.23,"lng":-115.81}',
      confidence: 75,
      status: 'ACTIVE',
    });
    logOk('SIGINT Emitter: XB7');
  } catch (e) { logFail('SIGINT Emitter: XB7', e); }
  try {
    await api.post('/sigint/emitters', {
      name: 'SATCOM-UPLINK-4',
      emitter_type: 'SATCOM',
      frequency_range: '{"low":14000,"high":14500}',
      confidence: 90,
      status: 'ACTIVE',
    });
    logOk('SIGINT Emitter: SATCOM-4');
  } catch (e) { logFail('SIGINT Emitter: SATCOM-4', e); }

  // ── CI (1 investigation + 2 foreign agents) ──
  console.log('--- CI ---');
  try {
    await api.post('/ci/investigations', {
      title: 'Unauthorized Access Investigation - Delta File Server',
      subject: 'Suspected unauthorized access to classified compartment on Delta file server. 17 files potentially compromised.',
      investigation_type: 'INSIDER',
      classification: 'TOP_SECRET',
      status: 'OPEN',
    });
    logOk('CI Investigation: Delta Files');
  } catch (e) { logFail('CI Investigation: Delta Files', e); }
  try {
    await api.post('/ci/foreign-agents', {
      name: 'Known Foreign Agent X-14',
      aliases: '["Marcus V.","The Professor","Dr. Schmidt"]',
      nationality: 'Foreign State A',
      affiliation: 'FIS-A (Foreign Intelligence Service)',
      threat_level: 'HIGH',
      status: 'ACTIVE',
      description: 'Foreign intelligence officer operating under diplomatic cover at consulate. Suspected handler for multiple assets.',
    });
    logOk('CI Foreign Agent: X-14');
  } catch (e) { logFail('CI Foreign Agent: X-14', e); }
  try {
    await api.post('/ci/foreign-agents', {
      name: 'Suspected Agent Y-7',
      aliases: '["Elena K.","Ms. Koslov"]',
      nationality: 'Foreign State B',
      affiliation: 'Suspected FIS-B operative',
      threat_level: 'MEDIUM',
      status: 'UNDER_SURVEILLANCE',
      description: 'Academic researcher with unusual travel patterns and access patterns. Suspected handler for scientific/technical collection.',
    });
    logOk('CI Foreign Agent: Y-7');
  } catch (e) { logFail('CI Foreign Agent: Y-7', e); }

  // ── FININT (2 entities + 3 transactions) ──
  console.log('--- FININT ---');
  try {
    await api.post('/fint/entities', {
      name: 'NorthStar Trading LLC',
      entity_type: 'SHELL_COMPANY',
      jurisdiction: 'Panama',
      risk_score: 85,
      description: 'Shell company linked to Phoenix Group network. Registered address is a virtual office. Director is nominee.',
    });
    logOk('FININT Entity: NorthStar Trading');
  } catch (e) { logFail('FININT Entity: NorthStar', e); }
  try {
    await api.post('/fint/entities', {
      name: 'Global Imports Ltd',
      entity_type: 'LEGITIMATE_BUSINESS',
      jurisdiction: 'UAE',
      risk_score: 45,
      sanctions_list: '["OFAC Enhanced Due Diligence","EU Consolidated List"]',
      description: 'Import/export business with suspicious transaction patterns inconsistent with declared business activity.',
    });
    logOk('FININT Entity: Global Imports');
  } catch (e) { logFail('FININT Entity: Global Imports', e); }
  try {
    await api.post('/fint/transactions', {
      transaction_ref: 'TXN-2024-07892',
      amount: 450000,
      currency: 'USD',
      transaction_type: 'WIRE_TRANSFER',
      transaction_date: '2024-07-15',
      flagged: true,
      flag_reason: 'Amount exceeds reporting threshold. Recipient account linked to NorthStar Trading LLC.',
    });
    logOk('FININT Transaction: TXN-07892');
  } catch (e) { logFail('FININT TXN: 07892', e); }
  try {
    await api.post('/fint/transactions', {
      transaction_ref: 'TXN-2024-08123',
      amount: 125000,
      currency: 'EUR',
      transaction_type: 'CASH_DEPOSIT',
      transaction_date: '2024-07-18',
      flagged: true,
      flag_reason: 'Structuring suspected. Multiple deposits just below reporting threshold across 3 branches.',
    });
    logOk('FININT Transaction: TXN-08123');
  } catch (e) { logFail('FININT TXN: 08123', e); }
  try {
    await api.post('/fint/transactions', {
      transaction_ref: 'TXN-2024-07901',
      amount: 8750,
      currency: 'USD',
      transaction_type: 'WIRE_TRANSFER',
      transaction_date: '2024-07-16',
      flagged: false,
    });
    logOk('FININT Transaction: TXN-07901');
  } catch (e) { logFail('FININT TXN: 07901', e); }

  // ── Biometrics (2 records + 1 watchlist) ──
  console.log('--- Biometrics ---');
  let bioRecordId1 = null;
  try {
    const { data } = await api.post('/biometrics/records', {
      subject_name: 'Unknown Subject 47B',
      biometric_type: 'FACIAL',
      record_data: 'facial-template-47B',
      confidence_score: 92,
      classification: 'SECRET',
    });
    bioRecordId1 = data.id;
    logOk('Biometric Record: Subject 47B');
  } catch (e) { logFail('Biometric: 47B', e); }
  try {
    await api.post('/biometrics/records', {
      subject_name: 'Detainee D-2847',
      biometric_type: 'FINGERPRINT',
      record_data: 'fp-template-d2847',
      confidence_score: 99,
      classification: 'CONFIDENTIAL',
    });
    logOk('Biometric Record: Detainee D-2847');
  } catch (e) { logFail('Biometric: D-2847', e); }
  try {
    await api.post('/biometrics/watchlists', {
      name: 'Border Crossing Level 1 Watchlist',
      description: 'High-priority persons of interest flagged for immediate notification upon border crossing attempt.',
      list_type: 'WATCHLIST',
      is_active: true,
    });
    logOk('Biometric Watchlist: Border Crossing');
  } catch (e) { logFail('Biometric Watchlist', e); }
  try {
    await api.post('/biometrics/encounters', {
      location: '{"lat":37.235,"lng":-115.811}',
      encounter_date: '2024-07-25T08:30:00Z',
      match_found: false,
      notes: 'Routine border crossing check. Subject flagged for follow-up.',
    });
    logOk('Biometric Encounter');
  } catch (e) { logFail('Biometric Encounter', e); }

  // ── Briefings (2) ──
  console.log('--- Briefings ---');
  try {
    await api.post('/briefings', {
      title: 'Weekly Intelligence Brief - 28 July 2024',
      classification: 'SECRET',
      status: 'DRAFT',
      audience: '["Director","Deputy Director","Division Chiefs","Senior Analysts"]',
      content: '{"sections":[{"Current Threats":"Phoenix Group activity increased. Crimson Dawn targeting defense sector.","Active Operations":"Op Northern Shield planning. Op Night Watch active.","Collection Status":"SIGINT nominal. GEOINT tasking backlog 12 hours. HUMINT: 3 pending source meetings.","Personnel":"2 analysts TDY. IST coverage gap identified.","Upcoming Events":"Director briefing 30 July. Quarterly threat assessment due 1 Aug."}]}',
    });
    logOk('Briefing: Weekly Intel Brief');
  } catch (e) { logFail('Briefing: Weekly', e); }
  try {
    await api.post('/briefings', {
      title: 'Director Morning Brief - 27 July 2024',
      classification: 'TOP_SECRET',
      status: 'DRAFT',
      audience: '["Director"]',
      content: '{"sections":[{"Overnight Incidents":"UAV sighting Sector 3 - monitoring. No other incidents.","Threat Updates":"Phoenix Group comms activity elevated. Crimson Dawn infrastructure scans detected.","Mission Status":"Op Night Watch: 3 patrols completed, 0 interdictions. Op Northern Shield: planning 85% complete.","Intel Gaps":"HUMINT coverage Sector 5 degraded. Requesting surge support."}]}',
    });
    logOk('Briefing: Director Morning Brief');
  } catch (e) { logFail('Briefing: Morning', e); }

  // ── Messaging (3 channels) ──
  console.log('--- Messaging ---');
  for (const ch of [
    { name: 'Watch Floor Alerts', description: 'Real-time alert notifications for watch floor personnel. All shifts.', channel_type: 'TEAM' },
    { name: 'All-Source Analysis Team', description: 'Collaboration channel for all-source analysts. Intel product review and discussion.', channel_type: 'TEAM' },
    { name: 'Executive Broadcast Channel', description: 'Director-level announcements and critical notifications. Read-only for non-executive staff.', channel_type: 'BROADCAST' },
  ]) {
    try {
      await api.post('/messaging/channels', ch);
      logOk('Channel: ' + ch.name);
    } catch (e) { logFail('Channel: ' + ch.name, e); }
  }

  // ── Liaison (2 partners + 1 MOU) ──
  console.log('--- Liaison ---');
  let partnerId = null;
  try {
    const { data } = await api.post('/liaison/partners', {
      name: 'National Security Agency',
      organization: 'NSA',
      partner_type: 'GOVERNMENT',
      status: 'ACTIVE',
      trust_level: 5,
      contact_info: '{"poc":"Liaison Officer Johnson","secure_line":"+1-555-0201","email":"nsa.liaison@nsa.sgov"}',
    });
    partnerId = data.id;
    logOk('Liaison Partner: NSA');
  } catch (e) { logFail('Liaison Partner: NSA', e); }
  try {
    await api.post('/liaison/partners', {
      name: 'INTERPOL National Central Bureau',
      organization: 'INTERPOL',
      partner_type: 'INTERNATIONAL',
      status: 'ACTIVE',
      trust_level: 3,
    });
    logOk('Liaison Partner: INTERPOL');
  } catch (e) { logFail('Liaison Partner: INTERPOL', e); }
  if (partnerId) {
    try {
      await api.post('/liaison/agreements', {
        title: 'NSA Data Sharing Agreement 2024',
        partner_id: partnerId,
        agreement_type: 'DATA_SHARING',
        scope: 'SIGINT sharing for counter-terrorism operations. Automated feed of select intercepts.',
        classification: 'TOP_SECRET',
        status: 'ACTIVE',
      });
      logOk('Liaison MOU: NSA Data Sharing');
    } catch (e) { logFail('Liaison MOU: NSA', e); }
  }

  // ── Legal (2 reviews + 1 compliance) ──
  console.log('--- Legal ---');
  try {
    await api.post('/legal/reviews', {
      requested_by: uid,
      title: 'Legal Review - Operation Northern Shield',
      classification: 'SECRET',
      priority: 'HIGH',
      status: 'PENDING_REVIEW',
      due_date: '2024-08-01',
    });
    logOk('Legal Review: Op Northern Shield');
  } catch (e) { logFail('Legal Review: Op NS', e); }
  try {
    await api.post('/legal/reviews', {
      requested_by: uid,
      title: 'FISA Renewal Review - Target Alpha Surveillance',
      classification: 'TOP_SECRET',
      priority: 'CRITICAL',
      status: 'IN_REVIEW',
      due_date: '2024-07-30',
    });
    logOk('Legal Review: FISA Renewal');
  } catch (e) { logFail('Legal Review: FISA', e); }
  try {
    await api.post('/legal/compliance', {
      title: 'Quarterly FISA Section 702 Compliance Audit',
      regulation: 'FISA Section 702',
      check_type: 'AUDIT',
      status: 'SCHEDULED',
      findings: '{"scope":"Review of all FISA 702 collections for Q2 2024","sample_size":47,"preliminary":"No major violations identified. 3 procedural documentation gaps noted."}',
    });
    logOk('Legal Compliance: FISA Audit');
  } catch (e) { logFail('Legal Compliance: FISA', e); }

  // ── Archive (2 records) ──
  console.log('--- Archive ---');
  try {
    await api.post('/archive/records', {
      archived_by: uid,
      title: 'Closed Case - Embassy Staff Vetting 2023',
      entity_type: 'CASE',
      classification: 'CONFIDENTIAL',
      retention_period_days: 1825,
      status: 'ARCHIVED',
    });
    logOk('Archive: Embassy Vetting 2023');
  } catch (e) { logFail('Archive: Embassy Vetting', e); }
  try {
    await api.post('/archive/records', {
      archived_by: uid,
      title: 'Historical Intelligence Report - Border Assessment 2020',
      entity_type: 'REPORT',
      classification: 'SECRET',
      retention_period_days: 3650,
      status: 'ARCHIVED',
    });
    logOk('Archive: Border Assessment 2020');
  } catch (e) { logFail('Archive: Border Assessment', e); }

  // ── Budget (2 budgets + 1 contract) ──
  console.log('--- Budget ---');
  try {
    await api.post('/budget/budgets', {
      manager_id: uid,
      program_name: 'Northern Border Surveillance Program',
      fiscal_year: 2024,
      total_amount: 12500000,
      allocated_amount: 8200000,
      spent_amount: 3700000,
      status: 'ACTIVE',
      description: 'Comprehensive border surveillance program including SIGINT, GEOINT, and UAV operations.',
    });
    logOk('Budget: Border Surveillance');
  } catch (e) { logFail('Budget: Border', e); }
  try {
    await api.post('/budget/budgets', {
      manager_id: uid,
      program_name: 'Cyber Defense Initiative FY2024',
      fiscal_year: 2024,
      total_amount: 8900000,
      allocated_amount: 8900000,
      spent_amount: 6100000,
      status: 'ACTIVE',
      description: 'Defensive cyber operations, threat hunting, and infrastructure hardening.',
    });
    logOk('Budget: Cyber Defense');
  } catch (e) { logFail('Budget: Cyber', e); }
  try {
    await api.post('/budget/contracts', {
      contracting_officer_id: uid,
      vendor_name: 'AeroTech Defense Systems Inc.',
      description: 'High-resolution satellite imagery subscription. 0.3m resolution, daily coverage of priority areas.',
      contract_type: 'SERVICE',
      value: 3400000,
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      status: 'ACTIVE',
    });
    logOk('Contract: AeroTech');
  } catch (e) { logFail('Contract: AeroTech', e); }

  // ── Analysis Relationships (5 linking entities) ──
  console.log('--- Analysis ---');
  const validItems = { reportIds, caseIds, actorIds, sourceIds, evidenceIds, personnelIds };
  const relPairs = [
    { source_type: 'threat_actor', source_id: actorIds[0], target_type: 'case', target_id: caseIds[1], relationship_type: 'TARGET_OF', description: 'Phoenix Group is primary target of network mapping investigation', confidence: 95 },
    { source_type: 'case', source_id: caseIds[0], target_type: 'case', target_id: caseIds[1], relationship_type: 'RELATED_TO', description: 'Both investigations share geographic overlap and Phoenix Group nexus', confidence: 80 },
    { source_type: 'threat_actor', source_id: actorIds[1], target_type: 'case', target_id: caseIds[2], relationship_type: 'ATTRIBUTED_TO', description: 'Crimson Dawn linked to banking sector intrusions via malware signature match', confidence: 88 },
    { source_type: 'source', source_id: sourceIds[0], target_type: 'report', target_id: reportIds[0], relationship_type: 'CONTRIBUTED_TO', description: 'Source AZALEA-7 provided initial indicators for border activity assessment', confidence: 75 },
    { source_type: 'threat_actor', source_id: actorIds[2], target_type: 'threat_actor', target_id: actorIds[0], relationship_type: 'ASSOCIATED_WITH', description: 'Shadow Cartel provides logistics support to Phoenix Group operations', confidence: 72 },
  ];

  for (const rel of relPairs) {
    if (!rel.source_id || !rel.target_id) {
      logFail('Analysis Rel: ' + rel.description, 'Missing source or target ID');
      continue;
    }
    try {
      await api.post('/analysis/relationships', rel);
      logOk('Analysis Rel: ' + rel.relationship_type + ' (' + rel.description.substring(0, 60) + ')');
    } catch (e) { logFail('Analysis Rel: ' + rel.relationship_type, e); }
  }

  // ── Summary ──
  console.log('\n======== SEED RESULTS ========');
  console.log('  OK:  ' + ok);
  console.log('  FAIL: ' + fail);
  console.log('  Total: ' + (ok + fail));
  console.log('\nRefresh http://localhost:5173 and login with admin@intel.local / admin123!');
}

seed().catch((err) => {
  console.error('\nFATAL ERROR:', err.message);
  process.exit(1);
});
