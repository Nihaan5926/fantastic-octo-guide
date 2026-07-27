const axios = require('axios');
const api = axios.create({ baseURL: 'http://localhost:4000/api', headers: { 'Content-Type': 'application/json' } });

async function test() {
  const { data: auth } = await api.post('/auth/login', { email: 'admin@intel.local', password: 'admin123!' });
  api.defaults.headers.common.Authorization = 'Bearer ' + auth.accessToken;
  const uid = auth.user.id;

  const tests = [
    { name: 'Reports', method: 'post', url: '/reports', data: { title: 'Test Report', summary: 'T', classification: 'UNCLASSIFIED', priority: 'LOW' } },
    { name: 'Sources', method: 'post', url: '/sources', data: { code_name: 'TEST-SRC-' + Date.now(), type: 'OSINT', reliability_rating: 'A-1', status: 'ACTIVE' } },
    { name: 'Cases', method: 'post', url: '/cases', data: { title: 'Test Case ' + Date.now(), description: 'T', status: 'OPEN', priority: 'LOW', classification: 'UNCLASSIFIED' } },
    { name: 'Evidence', method: 'post', url: '/evidence', data: { title: 'Test Evidence ' + Date.now(), type: 'DOCUMENT', classification: 'UNCLASSIFIED' } },
    { name: 'OSINT Tasks', method: 'post', url: '/osint/tasks', data: { title: 'Test Task ' + Date.now(), query: 'test', source_types: '[]', status: 'IDLE' } },
    { name: 'Threat Actors', method: 'post', url: '/threats/actors', data: { name: 'TestActor-' + Date.now(), aliases: '[]', description: 'T', motivation: 'TEST', sophistication: 'LOW', status: 'ACTIVE' } },
    { name: 'Indicators', method: 'post', url: '/threats/indicators', data: { threat_actor_id: uid, type: 'IP', value: '10.0.0.' + (Math.floor(Math.random() * 255)), confidence: 50 } },
    { name: 'Personnel', method: 'post', url: '/personnel', data: { user_id: uid, position_title: 'Test ' + Date.now(), clearance_level: 'UNCLASSIFIED', nationality: 'US' } },
    { name: 'Org Units', method: 'post', url: '/org-chart/units', data: { name: 'Test Unit ' + Date.now(), unit_type: 'SECTION' } },
    { name: 'Training', method: 'post', url: '/training/courses', data: { title: 'Test Course ' + Date.now(), description: 'T', course_type: 'TECHNICAL', duration_hours: 8, instructor: 'Test', is_required: false } },
    { name: 'Watch SITREPs', method: 'post', url: '/watch-center/sitreps', data: { author_id: uid, title: 'Test SITREP ' + Date.now(), classification: 'UNCLASSIFIED', content: '{}', period_start: '2024-01-01T00:00:00Z', period_end: '2024-01-01T06:00:00Z' } },
    { name: 'Missions', method: 'post', url: '/missions/plans', data: { commander_id: uid, title: 'Test Miss ' + Date.now(), objective: 'T', status: 'PLANNING', priority: 'LOW', classification: 'UNCLASSIFIED', start_date: '2024-01-01', end_date: '2024-12-31' } },
    { name: 'Targeting', method: 'post', url: '/targeting/packages', data: { author_id: uid, title: 'Test Target ' + Date.now(), objective: 'T', status: 'DRAFT', priority: 'LOW', classification: 'UNCLASSIFIED', target_name: 'T', cde_estimate: 'LOW' } },
    { name: 'Collection Reqs', method: 'post', url: '/collection/requirements', data: { requester_id: uid, title: 'Test Req ' + Date.now(), description: 'T', intelligence_discipline: 'SIGINT', priority: 'LOW', status: 'DRAFT' } },
    { name: 'Tasking', method: 'post', url: '/tasking/assignments', data: { assigned_to: uid, assigned_by: uid, title: 'Test Task ' + Date.now(), description: 'T', task_type: 'ANALYSIS', priority: 'LOW', status: 'DRAFT' } },
    { name: 'GEOINT', method: 'post', url: '/geoint/features', data: { title: 'Test Geo ' + Date.now(), feature_type: 'POINT', coordinates: '{"type":"Point","coordinates":[0,0]}', classification: 'UNCLASSIFIED', description: 'T' } },
    { name: 'SIGINT', method: 'post', url: '/sigint/intercepts', data: { title: 'Test SIG ' + Date.now(), signal_type: 'CW', frequency: '1000', modulation: 'AM', content: 'TEST', collection_date: '2024-01-01', classification: 'UNCLASSIFIED' } },
    { name: 'CI', method: 'post', url: '/ci/investigations', data: { title: 'Test CI ' + Date.now(), subject: 'T', investigation_type: 'SCREENING', classification: 'UNCLASSIFIED', status: 'DRAFT' } },
    { name: 'FININT', method: 'post', url: '/fint/entities', data: { name: 'TestFin-' + Date.now(), entity_type: 'SHELL_COMPANY', jurisdiction: 'XX', risk_score: 50 } },
    { name: 'Biometrics', method: 'post', url: '/biometrics/records', data: { subject_name: 'Test Bio ' + Date.now(), biometric_type: 'FACIAL', record_data: 'test', confidence_score: 90, classification: 'UNCLASSIFIED' } },
    { name: 'Briefings', method: 'post', url: '/briefings', data: { title: 'Test Brief ' + Date.now(), classification: 'UNCLASSIFIED', status: 'DRAFT', audience: '[]', content: '{}' } },
    { name: 'Messaging Channels', method: 'post', url: '/messaging/channels', data: { name: 'Test-Ch-' + Date.now(), description: 'T', channel_type: 'TEAM' } },
    { name: 'Liaison', method: 'post', url: '/liaison/partners', data: { name: 'TestPartner-' + Date.now(), organization: 'T', partner_type: 'GOVERNMENT', status: 'ACTIVE', trust_level: 3 } },
    { name: 'Legal', method: 'post', url: '/legal/reviews', data: { requested_by: uid, title: 'Test Legal ' + Date.now(), classification: 'UNCLASSIFIED', priority: 'LOW', status: 'DRAFT' } },
    { name: 'Archive', method: 'post', url: '/archive/records', data: { archived_by: uid, title: 'Test Archive ' + Date.now(), entity_type: 'REPORT', classification: 'UNCLASSIFIED', retention_period_days: 365, status: 'ARCHIVED' } },
    { name: 'Budget', method: 'post', url: '/budget/budgets', data: { manager_id: uid, program_name: 'Test Budget ' + Date.now(), fiscal_year: 2024, total_amount: 1000, allocated_amount: 500, spent_amount: 200, status: 'ACTIVE' } },
  ];

  let ok = 0, fail = 0;
  for (const t of tests) {
    try {
      await api[t.method](t.url, t.data);
      ok++;
    } catch (e) {
      fail++;
      console.log('FAIL:', t.name, '->', e.response?.data?.error || e.message);
    }
  }
  console.log(`\nResults: ${ok} OK, ${fail} FAIL`);
}

test();
