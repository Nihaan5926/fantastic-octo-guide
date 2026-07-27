const axios = require('axios');
const api = axios.create({ baseURL: 'http://localhost:4000/api', headers: { 'Content-Type': 'application/json' } });

let ok = 0, fail = 0;
function logOk(msg) { ok++; console.log('  OK: ' + msg); }
function logFail(msg, err) { fail++; console.log('  FAIL: ' + msg + ' -> ' + (err?.response?.data?.error || err?.message || err)); }

async function seed() {
  const { data: auth } = await api.post('/auth/login', { email: 'admin@intel.local', password: 'admin123!' });
  api.defaults.headers.common.Authorization = 'Bearer ' + auth.accessToken;
  const uid = auth.user.id;
  console.log('Admin ID: ' + uid + '\n');

  // Reports
  console.log('--- Reports ---');
  for (const r of [
    { title: 'Border Activity Assessment - Northern Corridor', summary: 'Increased patrol activity along northern border corridor over 72 hours.', classification: 'SECRET', status: 'DRAFT', priority: 'HIGH' },
    { title: 'Emerging Threat Actor - Phoenix Group', summary: 'Analysis of newly identified Phoenix Group in southeastern region.', classification: 'TOP_SECRET', status: 'IN_REVIEW', priority: 'CRITICAL' },
    { title: 'Economic Indicators Report - Q3', summary: 'Quarterly economic intelligence summary.', classification: 'CONFIDENTIAL', status: 'APPROVED', priority: 'MEDIUM' },
    { title: 'Signals Intercept Summary - Week 28', summary: 'Compilation of significant signals intercepts.', classification: 'SECRET', status: 'DISSEMINATED', priority: 'HIGH' },
    { title: 'Open Source Media Monitoring', summary: 'Daily summary of relevant open source coverage.', classification: 'UNCLASSIFIED', status: 'DRAFT', priority: 'LOW' },
  ]) { try { await api.post('/reports', r); logOk(r.title); } catch(e) { logFail(r.title, e); } }

  // Sources
  console.log('--- Sources ---');
  for (const s of [
    { code_name: 'AZALEA-7', type: 'HUMINT', reliability_rating: 'A-1', status: 'ACTIVE', description: 'Senior official with cabinet-level access' },
    { code_name: 'OBSIDIAN-9', type: 'OSINT', reliability_rating: 'A-2', status: 'ACTIVE', description: 'Social media scraping pipeline' },
    { code_name: 'FALCON-EYE', type: 'GEOINT', reliability_rating: 'A-1', status: 'ACTIVE', description: 'Satellite imagery station' },
    { code_name: 'SHADOW-NET', type: 'TECHINT', reliability_rating: 'B-1', status: 'ACTIVE', description: 'Cyber intelligence platform' },
    { code_name: 'CYPRESS-3', type: 'SIGINT', reliability_rating: 'B-2', status: 'ACTIVE', description: 'Signal collection node' },
    { code_name: 'ECHO-5', type: 'HUMINT', reliability_rating: 'C-3', status: 'INACTIVE', description: 'Former officer, reliability degraded' },
  ]) { try { await api.post('/sources', s); logOk(s.code_name); } catch(e) { logFail(s.code_name, e); } }

  // Cases
  console.log('--- Cases ---');
  const caseIds = [];
  for (const c of [
    { title: 'Op Silent Watch - Northern Border', description: 'Cross-border activity investigation', status: 'OPEN', priority: 'HIGH', classification: 'SECRET' },
    { title: 'Phoenix Group Network Mapping', description: 'Organizational structure and funding sources', status: 'IN_PROGRESS', priority: 'CRITICAL', classification: 'TOP_SECRET' },
    { title: 'Cyber Intrusion - Banking Sector', description: 'Coordinated cyber attacks investigation', status: 'OPEN', priority: 'HIGH', classification: 'CONFIDENTIAL' },
    { title: 'Maritime Smuggling - Eastern Coast', description: 'Weapons smuggling investigation', status: 'IN_PROGRESS', priority: 'CRITICAL', classification: 'SECRET' },
    { title: 'Diplomatic Personnel Vetting', description: 'Routine security vetting', status: 'CLOSED', priority: 'MEDIUM', classification: 'CONFIDENTIAL' },
  ]) { try { const {data} = await api.post('/cases', c); caseIds.push(data.id); logOk(c.title); } catch(e) { logFail(c.title, e); caseIds.push(null); } }

  // Evidence
  console.log('--- Evidence ---');
  for (const e of [
    { title: 'Satellite Image - Northern Corridor', type: 'IMAGE', classification: 'SECRET' },
    { title: 'Intercepted Comm Transcript', type: 'DOCUMENT', classification: 'TOP_SECRET' },
    { title: 'Financial Records - Q2 2024', type: 'DOCUMENT', classification: 'CONFIDENTIAL' },
    { title: 'Border Surveillance Footage', type: 'VIDEO', classification: 'SECRET' },
    { title: 'Bank Server Access Logs', type: 'DATA', classification: 'CONFIDENTIAL' },
  ]) { try { await api.post('/evidence', e); logOk(e.title); } catch(err) { logFail(e.title, err); } }

  // OSINT Tasks
  console.log('--- OSINT ---');
  for (const t of [
    { title: 'Social Media Sweep - Phoenix Group', query: 'phoenix group + arms + border', source_types: '["TWITTER","TELEGRAM"]', status: 'IDLE' },
    { title: 'News Monitoring - Economic', query: 'currency OR sanctions', source_types: '["NEWS","BLOGS"]', status: 'IDLE' },
    { title: 'Darknet Monitoring - Weapons', query: 'arms OR ammunition', source_types: '["DARKNET"]', status: 'IDLE' },
  ]) { try { const {data} = await api.post('/osint/tasks', t); await api.post('/osint/tasks/' + data.id + '/run'); logOk(t.title); } catch(e) { logFail(t.title, e); } }

  // Threat Actors
  console.log('--- Threat Actors ---');
  const actorIds = [];
  for (const a of [
    { name: 'Phoenix Group', aliases: '["Phoenix Collective","PG-13"]', description: 'Emerging extremist group, weapons trafficking', motivation: 'POLITICAL/IDEOLOGICAL', sophistication: 'MEDIUM', status: 'ACTIVE' },
    { name: 'Crimson Dawn', aliases: '["CD-Unit","Red Dawn"]', description: 'State-sponsored cyber espionage', motivation: 'STATE-SPONSORED', sophistication: 'HIGH', status: 'ACTIVE' },
    { name: 'Shadow Cartel', aliases: '["Shadow Network","Los Sombras"]', description: 'Transnational criminal organization', motivation: 'FINANCIAL', sophistication: 'MEDIUM', status: 'ACTIVE' },
    { name: 'Ghost Brigade', aliases: '["GB","Silent Force"]', description: 'Low-tech insurgent group, IEDs', motivation: 'IDEOLOGICAL', sophistication: 'LOW', status: 'ACTIVE' },
  ]) { try { const {data} = await api.post('/threats/actors', a); actorIds.push(data.id); logOk(a.name); } catch(e) { logFail(a.name, e); actorIds.push(null); } }

  // Indicators
  console.log('--- Indicators ---');
  for (const i of [
    { threat_actor_id: actorIds[0], type: 'DOMAIN', value: 'phoenix-supply.net', confidence: 85 },
    { threat_actor_id: actorIds[0], type: 'EMAIL', value: 'contact@phoenix-supply.net', confidence: 70 },
    { threat_actor_id: actorIds[1], type: 'IP', value: '198.51.100.44', confidence: 90 },
    { threat_actor_id: actorIds[1], type: 'DOMAIN', value: 'crimson-dawn.xyz', confidence: 95 },
    { threat_actor_id: actorIds[2], type: 'HASH', value: 'd4e2fc1a8b93c67e9a', confidence: 60 },
  ]) { try { await api.post('/threats/indicators', i); logOk(i.value); } catch(e) { logFail(i.value, e); } }

  // Personnel
  console.log('--- Personnel ---');
  for (const p of [
    { user_id: uid, position_title: 'Senior Intelligence Analyst', clearance_level: 'TOP_SECRET', nationality: 'US', notes: '15 years experience, regional expert' },
    { user_id: uid, position_title: 'Deputy Director of Operations', clearance_level: 'TOP_SECRET', nationality: 'US', notes: 'Former special forces commander' },
  ]) { try { await api.post('/personnel', { ...p, user_id: uid + Date.now().toString().slice(-4) }); } catch(e) { try { await api.post('/personnel', p); logOk(p.position_title); } catch(e2) { logFail(p.position_title, e2); } } }

  // Org Chart
  console.log('--- Org Chart ---');
  try {
    const dirRes = await api.post('/org-chart/units', { name: 'Intelligence Directorate', unit_type: 'DIRECTORATE', description: 'Top-level intelligence organization' });
    const opsRes = await api.post('/org-chart/units', { name: 'Operations Division', unit_type: 'DIVISION', parent_id: dirRes.data.id });
    const anaRes = await api.post('/org-chart/units', { name: 'Analysis Division', unit_type: 'DIVISION', parent_id: dirRes.data.id });
    await api.post('/org-chart/units', { name: 'SIGINT Branch', unit_type: 'BRANCH', parent_id: anaRes.data.id });
    await api.post('/org-chart/units', { name: 'GEOINT Branch', unit_type: 'BRANCH', parent_id: anaRes.data.id });
    await api.post('/org-chart/units', { name: 'HUMINT Section', unit_type: 'SECTION', parent_id: opsRes.data.id });
    logOk('6 units with hierarchy');
  } catch(e) { logFail('Org units', e); }

  // Training
  console.log('--- Training ---');
  for (const t of [
    { title: 'Advanced Tradecraft Techniques', description: 'Cover development, dead drops, surveillance detection', course_type: 'FIELD', duration_hours: 40, instructor: 'Senior Ops Officer', is_required: true },
    { title: 'OSINT Fundamentals', description: 'Collection methodologies and tools', course_type: 'TECHNICAL', duration_hours: 24, instructor: 'OSINT Lead', is_required: true },
    { title: 'Threat Analysis and Indicators', description: 'Actor profiling and IOC analysis', course_type: 'ANALYTICAL', duration_hours: 16, instructor: 'Senior Threat Analyst', is_required: false },
    { title: 'Secure Communications', description: 'COMSEC procedures and tools', course_type: 'TECHNICAL', duration_hours: 8, instructor: 'COMSEC Officer', is_required: true },
  ]) { try { await api.post('/training/courses', t); logOk(t.title); } catch(e) { logFail(t.title, e); } }

  try { await api.post('/training/aar', { author_id: uid, title: 'Cyber Storm 2024 AAR', exercise_name: 'Cyber Storm 2024', date: '2024-06-15', summary: 'Simulated APT attack on financial infrastructure', findings: '{"strengths":["Rapid detection"],"weaknesses":["Inter-agency comms"]}', recommendations: '["Improve cross-agency notification"]' }); logOk('AAR'); } catch(e) { logFail('AAR', e); }

  // Watch Center
  console.log('--- Watch Center ---');
  try { await api.post('/watch-center/sitreps', { author_id: uid, title: 'SITREP 2024-07-27 0600', classification: 'SECRET', content: '{"summary":"Quiet overnight. No incidents.","incidents":[],"personnel_on_duty":12}', period_start: '2024-07-27T00:00:00Z', period_end: '2024-07-27T06:00:00Z' }); logOk('SITREP 1'); } catch(e) { logFail('SITREP 1', e); }
  try { await api.post('/watch-center/sitreps', { author_id: uid, title: 'SITREP 2024-07-26 1800', classification: 'SECRET', content: '{"summary":"UAV sighted near Sector 3","incidents":[{"type":"UAV_SIGHTING","time":"14:30","location":"Sector 3"}]}', period_start: '2024-07-26T12:00:00Z', period_end: '2024-07-26T18:00:00Z' }); logOk('SITREP 2'); } catch(e) { logFail('SITREP 2', e); }
  try { await api.post('/watch-center/logs', { author_id: uid, title: 'Watch Handover Shift 1-2', log_type: 'HANDOVER', content: 'All nominal. Two active cases monitored.', severity: 'ROUTINE', status: 'ACKNOWLEDGED' }); logOk('Log 1'); } catch(e) { logFail('Log 1', e); }
  try { await api.post('/watch-center/logs', { author_id: uid, title: 'Alert: UAV Sector 3', log_type: 'ALERT', content: 'Radar contact 14:30 near Sector 3.', severity: 'HIGH', status: 'ACTIVE' }); logOk('Log 2'); } catch(e) { logFail('Log 2', e); }
  try { await api.post('/watch-center/shifts', { user_id: uid, shift_name: 'Day Watch', start_time: '06:00', end_time: '18:00', is_active: true }); logOk('Day Watch'); } catch(e) { logFail('Day Watch', e); }
  try { await api.post('/watch-center/shifts', { user_id: uid, shift_name: 'Night Watch', start_time: '18:00', end_time: '06:00', is_active: true }); logOk('Night Watch'); } catch(e) { logFail('Night Watch', e); }

  // Missions
  console.log('--- Missions ---');
  let missionId = null;
  try { const {data} = await api.post('/missions/plans', { commander_id: uid, title: 'Operation Northern Shield', objective: 'Border surveillance coverage', status: 'PLANNING', priority: 'HIGH', classification: 'SECRET', location: 'Northern Border', start_date: '2024-08-01', end_date: '2024-12-31' }); missionId = data.id; logOk('Op Northern Shield'); } catch(e) { logFail('Op Northern Shield', e); }
  try { await api.post('/missions/plans', { commander_id: uid, title: 'Operation Night Watch', objective: 'Rapid response border incursions', status: 'ACTIVE', priority: 'CRITICAL', classification: 'TOP_SECRET', location: 'Eastern Border', start_date: '2024-07-01', end_date: '2024-12-31' }); logOk('Op Night Watch'); } catch(e) { logFail('Op Night Watch', e); }
  if (missionId) {
    try { await api.post('/missions/plans/' + missionId + '/briefs', { title: 'CONOPS Brief v1', content: '{"sections":["Objective","Forces","Timeline"]}', version: 1 }); logOk('Brief v1'); } catch(e) { logFail('Brief v1', e); }
    try { await api.post('/missions/plans/' + missionId + '/briefs', { title: 'CONOPS Brief v2', content: '{"sections":["Objective","Updated Forces","Timeline"]}', version: 2 }); logOk('Brief v2'); } catch(e) { logFail('Brief v2', e); }
  }

  // Targeting
  console.log('--- Targeting ---');
  try { await api.post('/targeting/packages', { author_id: uid, title: 'Alpha-7: Weapons Cache', objective: 'Degrade weapons storage', status: 'NOMINATED', priority: 'HIGH', classification: 'SECRET', target_name: 'Site Alpha-7', location: '37.2350,-115.8111', cde_estimate: 'LOW' }); logOk('Alpha-7'); } catch(e) { logFail('Alpha-7', e); }
  try { await api.post('/targeting/packages', { author_id: uid, title: 'Bravo-3: Comm Hub', objective: 'Disrupt C2 capabilities', status: 'VETTED', priority: 'CRITICAL', classification: 'TOP_SECRET', target_name: 'Phoenix Group Comm Hub', location: '37.4189,-116.0234', cde_estimate: 'MODERATE' }); logOk('Bravo-3'); } catch(e) { logFail('Bravo-3', e); }

  // Collection
  console.log('--- Collection ---');
  try { await api.post('/collection/requirements', { requester_id: uid, title: 'Northern Border SIGINT', description: '24/7 signals coverage', intelligence_discipline: 'SIGINT', priority: 'HIGH', status: 'ACTIVE' }); logOk('SIGINT Req'); } catch(e) { logFail('SIGINT Req', e); }
  try { await api.post('/collection/requirements', { requester_id: uid, title: 'Financial Network Mapping', description: 'Trace transactions to threat actors', intelligence_discipline: 'FININT', priority: 'HIGH', status: 'ACTIVE' }); logOk('FININT Req'); } catch(e) { logFail('FININT Req', e); }
  try { await api.post('/collection/assets', { name: 'EAGLE-1', asset_type: 'SATELLITE', platform: 'GEO-INT', capability: '0.3m optical + SAR', status: 'OPERATIONAL', location: 'Geosynchronous' }); logOk('EAGLE-1'); } catch(e) { logFail('EAGLE-1', e); }
  try { await api.post('/collection/assets', { name: 'Raven-4', asset_type: 'UAV', platform: 'MQ-9 Reaper', capability: 'FMV + SIGINT payload', status: 'OPERATIONAL', location: 'FOB Delta' }); logOk('Raven-4'); } catch(e) { logFail('Raven-4', e); }

  // Tasking
  console.log('--- Tasking ---');
  try { await api.post('/tasking/assignments', { assigned_to: uid, assigned_by: uid, title: 'Analyze Phoenix Group finances', description: 'Complete financial transaction analysis', task_type: 'ANALYSIS', priority: 'HIGH', status: 'ASSIGNED' }); logOk('Task 1'); } catch(e) { logFail('Task 1', e); }
  try { await api.post('/tasking/assignments', { assigned_to: uid, assigned_by: uid, title: 'Update Crimson Dawn assessment', description: 'Quarterly threat assessment update', task_type: 'ASSESSMENT', priority: 'MEDIUM', status: 'PENDING' }); logOk('Task 2'); } catch(e) { logFail('Task 2', e); }
  try { await api.post('/tasking/assignments', { assigned_to: uid, assigned_by: uid, title: 'Prepare Director briefing', description: 'Monthly all-source briefing package', task_type: 'BRIEFING', priority: 'HIGH', status: 'IN_PROGRESS' }); logOk('Task 3'); } catch(e) { logFail('Task 3', e); }
  try { await api.post('/tasking/workflows', { name: 'Intel Report Review', description: 'Standard review and approval pipeline', steps: '["Draft","Peer Review","Supervisor Review","Classification","Publish"]', is_active: true }); logOk('Workflow'); } catch(e) { logFail('Workflow', e); }

  // GEOINT
  console.log('--- GEOINT ---');
  try { await api.post('/geoint/features', { title: 'Suspected Facility Grid 37T', feature_type: 'POLYGON', coordinates: '{"type":"Polygon","coordinates":[[[-115.8,37.2],[-115.7,37.2],[-115.7,37.3],[-115.8,37.3],[-115.8,37.2]]]}', classification: 'SECRET', description: 'Irregular structure, no registration' }); logOk('Facility Grid 37T'); } catch(e) { logFail('Grid 37T', e); }
  try { await api.post('/geoint/features', { title: 'Observation Point Alpha', feature_type: 'POINT', coordinates: '{"type":"Point","coordinates":[-115.8111,37.2350]}', classification: 'CONFIDENTIAL', description: 'Ideal overwatch Sector 7' }); logOk('Point Alpha'); } catch(e) { logFail('Point Alpha', e); }
  try { await api.post('/geoint/features', { title: 'Supply Route Eastern Corridor', feature_type: 'LINESTRING', coordinates: '{"type":"LineString","coordinates":[[-116.0,37.1],[-115.9,37.15],[-115.7,37.2],[-115.5,37.25]]}', classification: 'SECRET', description: 'Suspected smuggling route from tire tracks' }); logOk('Supply Route'); } catch(e) { logFail('Supply Route', e); }

  // SIGINT
  console.log('--- SIGINT ---');
  try { await api.post('/sigint/intercepts', { title: 'Encrypted Burst 2450MHz', signal_type: 'BURST', frequency: '2450.0', modulation: 'QPSK', content: 'ENCRYPTED - Unable to decode', collection_date: '2024-07-26T14:30:00Z', classification: 'SECRET' }); logOk('Intercept 1'); } catch(e) { logFail('Intercept 1', e); }
  try { await api.post('/sigint/intercepts', { title: 'Voice Comms 8450kHz', signal_type: 'VOICE', frequency: '8450.0', modulation: 'AM', content: 'TRANSCRIPT: Delivery scheduled next week.', collection_date: '2024-07-26T09:15:00Z', classification: 'CONFIDENTIAL' }); logOk('Intercept 2'); } catch(e) { logFail('Intercept 2', e); }
  try { await api.post('/sigint/emitters', { name: 'EMITTER-XB7', emitter_type: 'RADAR', frequency_range: '{"low":9500,"high":10200}', location: '{"lat":37.23,"lng":-115.81}', confidence: 75, status: 'ACTIVE' }); logOk('Emitter XB7'); } catch(e) { logFail('Emitter XB7', e); }
  try { await api.post('/sigint/emitters', { name: 'SATCOM-UPLINK-4', emitter_type: 'SATCOM', frequency_range: '{"low":14000,"high":14500}', confidence: 90, status: 'ACTIVE' }); logOk('SATCOM-4'); } catch(e) { logFail('SATCOM-4', e); }

  // CI
  console.log('--- CI ---');
  try { await api.post('/ci/investigations', { title: 'Unauthorized Access - Delta Files', subject: 'Suspected unauthorized access to classified files', investigation_type: 'INSIDER', classification: 'TOP_SECRET', status: 'OPEN' }); logOk('Delta Files'); } catch(e) { logFail('Delta Files', e); }
  try { await api.post('/ci/investigations', { title: 'CI Screening - New Assets', subject: 'Routine CI screening of new assets', investigation_type: 'SCREENING', classification: 'SECRET', status: 'IN_PROGRESS' }); logOk('CI Screening'); } catch(e) { logFail('CI Screening', e); }
  try { await api.post('/ci/foreign-agents', { name: 'Known Agent X-14', aliases: '["Marcus V.","The Professor"]', nationality: 'Foreign State A', affiliation: 'FIS-A', threat_level: 'HIGH', status: 'ACTIVE', description: 'Foreign intel officer under diplomatic cover' }); logOk('Agent X-14'); } catch(e) { logFail('Agent X-14', e); }
  try { await api.post('/ci/foreign-agents', { name: 'Suspected Agent Y-7', aliases: '["Elena K."]', nationality: 'Foreign State B', affiliation: 'Suspected FIS-B', threat_level: 'MEDIUM', status: 'UNDER_SURVEILLANCE', description: 'Academic cover, suspected handler' }); logOk('Agent Y-7'); } catch(e) { logFail('Agent Y-7', e); }

  // FININT
  console.log('--- FININT ---');
  try { await api.post('/fint/entities', { name: 'NorthStar Trading LLC', entity_type: 'SHELL_COMPANY', jurisdiction: 'Panama', risk_score: 85, description: 'Linked to Phoenix Group network' }); logOk('NorthStar'); } catch(e) { logFail('NorthStar', e); }
  try { await api.post('/fint/entities', { name: 'Global Imports Ltd', entity_type: 'LEGITIMATE_BUSINESS', jurisdiction: 'UAE', risk_score: 45, sanctions_list: '["OFAC Enhanced Due Diligence"]', description: 'Suspicious transaction patterns' }); logOk('Global Imports'); } catch(e) { logFail('Global Imports', e); }
  try { await api.post('/fint/transactions', { transaction_ref: 'TXN-2024-07892', amount: 450000, currency: 'USD', transaction_type: 'WIRE_TRANSFER', transaction_date: '2024-07-15', flagged: true, flag_reason: 'Amount exceeds threshold, recipient on watchlist' }); logOk('TXN-07892'); } catch(e) { logFail('TXN-07892', e); }
  try { await api.post('/fint/transactions', { transaction_ref: 'TXN-2024-08123', amount: 125000, currency: 'EUR', transaction_type: 'CASH_DEPOSIT', transaction_date: '2024-07-18', flagged: true, flag_reason: 'Structuring suspected' }); logOk('TXN-08123'); } catch(e) { logFail('TXN-08123', e); }
  try { await api.post('/fint/transactions', { transaction_ref: 'TXN-2024-07901', amount: 8750, currency: 'USD', transaction_type: 'WIRE_TRANSFER', transaction_date: '2024-07-16', flagged: false }); logOk('TXN-07901'); } catch(e) { logFail('TXN-07901', e); }

  // Biometrics
  console.log('--- Biometrics ---');
  try { await api.post('/biometrics/records', { subject_name: 'Unknown Subject 47B', biometric_type: 'FACIAL', record_data: 'facial-template-47B', confidence_score: 92, classification: 'SECRET' }); logOk('Record 47B'); } catch(e) { logFail('47B', e); }
  try { await api.post('/biometrics/records', { subject_name: 'Detainee D-2847', biometric_type: 'FINGERPRINT', record_data: 'fp-template-d2847', confidence_score: 99, classification: 'CONFIDENTIAL' }); logOk('D-2847'); } catch(e) { logFail('D-2847', e); }
  try { await api.post('/biometrics/watchlists', { name: 'Border Crossing Level 1', description: 'High-priority persons of interest at borders', list_type: 'WATCHLIST', is_active: true }); logOk('Border Watchlist'); } catch(e) { logFail('Watchlist', e); }
  try { await api.post('/biometrics/watchlists', { name: 'Known Terrorist Biometric DB', description: 'Facial and fingerprint records of known actors', list_type: 'DATABASE', is_active: true }); logOk('Terrorist DB'); } catch(e) { logFail('Terrorist DB', e); }
  try { await api.post('/biometrics/encounters', { location: '{"lat":37.235,"lng":-115.811}', encounter_date: '2024-07-25T08:30:00Z', match_found: false, notes: 'Routine border crossing check' }); logOk('Encounter'); } catch(e) { logFail('Encounter', e); }

  // Briefings
  console.log('--- Briefings ---');
  try { await api.post('/briefings', { title: 'Weekly Intel Brief - 28 July', classification: 'SECRET', status: 'DRAFT', audience: '["Director","Deputy Director","Division Chiefs"]', content: '{"sections":["Current Threats","Active Operations","Collection Status","Personnel","Upcoming"]}' }); logOk('Weekly Brief'); } catch(e) { logFail('Weekly Brief', e); }
  try { await api.post('/briefings', { title: 'Director Morning Brief - 27 July', classification: 'TOP_SECRET', status: 'DRAFT', audience: '["Director"]', content: '{"sections":["Overnight Incidents","Threat Updates","Mission Status"]}' }); logOk('Morning Brief'); } catch(e) { logFail('Morning Brief', e); }

  // Messaging
  console.log('--- Messaging ---');
  for (const ch of [
    { name: 'Watch Floor Alerts', description: 'Real-time alerts for watch floor personnel', channel_type: 'TEAM' },
    { name: 'Analysis Team', description: 'All-source analysis team', channel_type: 'TEAM' },
    { name: 'Executive Broadcast', description: 'Director-level announcements', channel_type: 'BROADCAST' },
  ]) { try { await api.post('/messaging/channels', ch); logOk(ch.name); } catch(e) { logFail(ch.name, e); } }

  // Liaison
  console.log('--- Liaison ---');
  let partnerId = null;
  try { const {data} = await api.post('/liaison/partners', { name: 'National Security Agency', organization: 'NSA', partner_type: 'GOVERNMENT', status: 'ACTIVE', trust_level: 5 }); partnerId = data.id; logOk('NSA'); } catch(e) { logFail('NSA', e); }
  try { await api.post('/liaison/partners', { name: 'Interpol', organization: 'INTERPOL', partner_type: 'INTERNATIONAL', status: 'ACTIVE', trust_level: 3 }); logOk('Interpol'); } catch(e) { logFail('Interpol', e); }
  if (partnerId) {
    try { await api.post('/liaison/agreements', { title: 'NSA Data Sharing Agreement 2024', partner_id: partnerId, agreement_type: 'DATA_SHARING', scope: 'SIGINT sharing for counter-terrorism', classification: 'TOP_SECRET', status: 'ACTIVE' }); logOk('NSA Agreement'); } catch(e) { logFail('NSA Agreement', e); }
  }

  // Legal
  console.log('--- Legal ---');
  try { await api.post('/legal/reviews', { requested_by: uid, title: 'Legal Review - Op Northern Shield', classification: 'SECRET', priority: 'HIGH', status: 'PENDING_REVIEW', due_date: '2024-08-01' }); logOk('Review 1'); } catch(e) { logFail('Review 1', e); }
  try { await api.post('/legal/reviews', { requested_by: uid, title: 'FISA Renewal - Target Alpha', classification: 'TOP_SECRET', priority: 'CRITICAL', status: 'IN_REVIEW', due_date: '2024-07-30' }); logOk('Review 2'); } catch(e) { logFail('Review 2', e); }
  try { await api.post('/legal/compliance', { title: 'Quarterly FISA Compliance Audit', regulation: 'FISA Section 702', check_type: 'AUDIT', status: 'SCHEDULED' }); logOk('FISA Audit'); } catch(e) { logFail('FISA Audit', e); }
  try { await api.post('/legal/compliance', { title: 'Data Privacy Impact Assessment', regulation: 'GDPR / Privacy Act', check_type: 'ASSESSMENT', status: 'IN_PROGRESS' }); logOk('Privacy Assessment'); } catch(e) { logFail('Privacy Assessment', e); }

  // Archive
  console.log('--- Archive ---');
  try { await api.post('/archive/records', { archived_by: uid, title: 'Closed Case - Embassy Vetting 2023', entity_type: 'CASE', classification: 'CONFIDENTIAL', retention_period_days: 1825, status: 'ARCHIVED' }); logOk('Record 1'); } catch(e) { logFail('Record 1', e); }
  try { await api.post('/archive/records', { archived_by: uid, title: 'Historical Report - Border 2020', entity_type: 'REPORT', classification: 'SECRET', retention_period_days: 3650, status: 'ARCHIVED' }); logOk('Record 2'); } catch(e) { logFail('Record 2', e); }

  // Budget
  console.log('--- Budget ---');
  try { await api.post('/budget/budgets', { manager_id: uid, program_name: 'Northern Border Surveillance', fiscal_year: 2024, total_amount: 12500000, allocated_amount: 8200000, spent_amount: 3700000, status: 'ACTIVE' }); logOk('Border Program'); } catch(e) { logFail('Border Program', e); }
  try { await api.post('/budget/budgets', { manager_id: uid, program_name: 'Cyber Defense Initiative', fiscal_year: 2024, total_amount: 8900000, allocated_amount: 8900000, spent_amount: 6100000, status: 'ACTIVE' }); logOk('Cyber Initiative'); } catch(e) { logFail('Cyber Initiative', e); }
  try { await api.post('/budget/budgets', { manager_id: uid, program_name: 'HUMINT Network Expansion', fiscal_year: 2024, total_amount: 4500000, allocated_amount: 3000000, spent_amount: 1200000, status: 'ACTIVE' }); logOk('HUMINT Net'); } catch(e) { logFail('HUMINT Net', e); }
  try { await api.post('/budget/contracts', { contracting_officer_id: uid, vendor_name: 'AeroTech Defense Systems', description: 'Satellite imagery subscription', contract_type: 'SERVICE', value: 3400000, start_date: '2024-01-01', end_date: '2024-12-31', status: 'ACTIVE' }); logOk('AeroTech'); } catch(e) { logFail('AeroTech', e); }
  try { await api.post('/budget/contracts', { contracting_officer_id: uid, vendor_name: 'CyberShield Solutions', description: 'Managed security services', contract_type: 'SERVICE', value: 2100000, start_date: '2024-03-01', end_date: '2025-02-28', status: 'ACTIVE' }); logOk('CyberShield'); } catch(e) { logFail('CyberShield', e); }

  // Analysis
  console.log('--- Analysis ---');
  try { await api.post('/analysis/relationships', { source_type: 'threat_actor', source_id: actorIds[0], target_type: 'case', target_id: caseIds[1], relationship_type: 'TARGET_OF', description: 'Phoenix Group is target of investigation', confidence: 95 }); logOk('Rel 1'); } catch(e) { logFail('Rel 1', e); }
  try { await api.post('/analysis/relationships', { source_type: 'case', source_id: caseIds[0], target_type: 'case', target_id: caseIds[1], relationship_type: 'RELATED_TO', description: 'Both cases share geographic and actor overlap', confidence: 80 }); logOk('Rel 2'); } catch(e) { logFail('Rel 2', e); }

  console.log('\n======= RESULTS =======');
  console.log('OK: ' + ok + ' | FAIL: ' + fail);
  console.log('\nRefresh http://localhost:5173 and login with admin@intel.local / admin123!');
}

seed();
