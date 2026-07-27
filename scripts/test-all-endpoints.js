const axios = require('axios');
const api = axios.create({ baseURL: 'http://localhost:4000/api', headers: { 'Content-Type': 'application/json' } });

async function testAll() {
  const { data: auth } = await api.post('/auth/login', { email: 'admin@intel.local', password: 'admin123!' });
  api.defaults.headers.common.Authorization = 'Bearer ' + auth.accessToken;
  const uid = auth.user.id;
  console.log('Auth OK. User:', auth.user.email, '\n');

  const results = [];

  // GET endpoints
  const gets = [
    '/reports','/sources','/sources/reliability-matrix','/cases','/evidence',
    '/osint/tasks','/threats/actors','/threats/indicators','/analysis/relationships',
    '/analysis/graph','/analysis/graph/stats','/analysis/timeline',
    '/personnel','/org-chart/units','/org-chart/units/tree','/org-chart/assignments',
    '/training/courses','/training/enrollments','/training/aar',
    '/watch-center/shifts','/watch-center/logs','/watch-center/sitreps',
    '/missions/plans','/targeting/packages','/collection/requirements','/collection/assets',
    '/tasking/assignments','/tasking/workflows','/geoint/features',
    '/sigint/intercepts','/sigint/emitters','/ci/investigations','/ci/foreign-agents',
    '/fint/transactions','/fint/entities','/biometrics/records','/biometrics/watchlists',
    '/biometrics/encounters','/briefings','/messaging/channels',
    '/liaison/partners','/liaison/agreements','/liaison/contact-logs',
    '/legal/reviews','/legal/compliance','/archive/records','/archive/declassification',
    '/budget/budgets','/budget/contracts','/admin/users','/admin/roles',
    '/admin/audit-logs','/admin/health','/notifications','/notifications/unread-count',
    '/search?q=test','/dashboard/kpis','/auth/me','/auth/login-history','/auth/sessions',
    '/auth/activity','/deploy-version',
  ];

  console.log('Testing ' + gets.length + ' GET endpoints...');
  for (const url of gets) {
    try { await api.get(url); results.push({ name: 'GET ' + url, ok: true }); }
    catch(e) { results.push({ name: 'GET ' + url, ok: false, err: e.response?.status + ' ' + (e.response?.data?.error || '').substring(0,80) }); }
  }

  // POST endpoints (CREATE)
  const posts = [
    { name: 'Create Report', body: { title:'Test', summary:'T', classification:'UNCLASSIFIED', priority:'LOW' }, url: '/reports' },
    { name: 'Create Source', body: { code_name:'TST-SRC-'+Date.now(), type:'OSINT', reliability_rating:'A-1', status:'ACTIVE' }, url: '/sources' },
    { name: 'Create Case', body: { title:'Test Case '+Date.now(), description:'T', status:'OPEN', priority:'LOW', classification:'UNCLASSIFIED' }, url: '/cases' },
    { name: 'Create Evidence', body: { title:'Test Ev', type:'DOCUMENT', classification:'UNCLASSIFIED' }, url: '/evidence' },
    { name: 'Create OSINT Task', body: { title:'Test Task '+Date.now(), query:'test', source_types:'[]', status:'IDLE' }, url: '/osint/tasks' },
    { name: 'Create Threat Actor', body: { name:'TestActor-'+Date.now(), aliases:'[]', description:'T', motivation:'TEST', sophistication:'LOW', status:'ACTIVE' }, url: '/threats/actors' },
    { name: 'Create Personnel', body: { position_title:'Officer '+Date.now(), clearance_level:'SECRET', nationality:'US' }, url: '/personnel' },
    { name: 'Create Org Unit', body: { name:'Section '+Date.now(), unit_type:'SECTION' }, url: '/org-chart/units' },
    { name: 'Create Course', body: { title:'Course '+Date.now(), description:'T', course_type:'TECHNICAL', duration_hours:8, instructor:'T', is_required:false }, url: '/training/courses' },
    { name: 'Create SITREP', body: { title:'SITREP '+Date.now(), classification:'UNCLASSIFIED', content:'{}', period_start:'2024-01-01T00:00:00Z', period_end:'2024-01-01T06:00:00Z' }, url: '/watch-center/sitreps' },
    { name: 'Create Watch Log', body: { title:'Log '+Date.now(), log_type:'ROUTINE', content:'T', severity:'ROUTINE', status:'PENDING' }, url: '/watch-center/logs' },
    { name: 'Create Shift', body: { shift_name:'Shift '+Date.now(), start_time:'06:00', end_time:'18:00', is_active:true }, url: '/watch-center/shifts' },
    { name: 'Create Mission', body: { commander_id:uid, title:'Mission '+Date.now(), objective:'T', status:'PLANNING', priority:'LOW', classification:'UNCLASSIFIED', start_date:'2024-01-01', end_date:'2024-12-31' }, url: '/missions/plans' },
    { name: 'Create Target', body: { author_id:uid, title:'Target '+Date.now(), objective:'T', status:'DRAFT', priority:'LOW', classification:'UNCLASSIFIED', target_name:'T', cde_estimate:'LOW' }, url: '/targeting/packages' },
    { name: 'Create Collection Req', body: { requester_id:uid, title:'Req '+Date.now(), description:'T', intelligence_discipline:'SIGINT', priority:'LOW', status:'DRAFT' }, url: '/collection/requirements' },
    { name: 'Create Collection Asset', body: { name:'Asset-'+Date.now(), asset_type:'SATELLITE', platform:'GEO', capability:'Imaging', status:'OPERATIONAL', location:'Orbit' }, url: '/collection/assets' },
    { name: 'Create Task', body: { assigned_to:uid, assigned_by:uid, title:'Task '+Date.now(), description:'T', task_type:'ANALYSIS', priority:'LOW', status:'DRAFT' }, url: '/tasking/assignments' },
    { name: 'Create GEOINT', body: { title:'Geo '+Date.now(), feature_type:'POINT', coordinates:'{"type":"Point","coordinates":[0,0]}', classification:'UNCLASSIFIED', description:'T' }, url: '/geoint/features' },
    { name: 'Create SIGINT', body: { title:'Sig '+Date.now(), signal_type:'CW', frequency:'1000', modulation:'AM', content:'T', collection_date:'2024-01-01', classification:'UNCLASSIFIED' }, url: '/sigint/intercepts' },
    { name: 'Create CI Investigation', body: { title:'CI '+Date.now(), subject:'T', investigation_type:'SCREENING', classification:'UNCLASSIFIED', status:'DRAFT' }, url: '/ci/investigations' },
    { name: 'Create FININT Entity', body: { name:'FinEnt-'+Date.now(), entity_type:'SHELL_COMPANY', jurisdiction:'XX', risk_score:50 }, url: '/fint/entities' },
    { name: 'Create Biometric', body: { subject_name:'Subj '+Date.now(), biometric_type:'FACIAL', record_data:'test', confidence_score:90, classification:'UNCLASSIFIED' }, url: '/biometrics/records' },
    { name: 'Create Briefing', body: { title:'Brief '+Date.now(), classification:'UNCLASSIFIED', status:'DRAFT', audience:'[]', content:'{}' }, url: '/briefings' },
    { name: 'Create Channel', body: { name:'Ch-'+Date.now(), description:'T', channel_type:'TEAM' }, url: '/messaging/channels' },
    { name: 'Create Partner', body: { name:'Partner-'+Date.now(), organization:'T', partner_type:'GOVERNMENT', status:'ACTIVE', trust_level:3 }, url: '/liaison/partners' },
    { name: 'Create Legal Review', body: { requested_by:uid, title:'Legal '+Date.now(), classification:'UNCLASSIFIED', priority:'LOW', status:'DRAFT' }, url: '/legal/reviews' },
    { name: 'Create Archive', body: { archived_by:uid, title:'Archive '+Date.now(), entity_type:'REPORT', classification:'UNCLASSIFIED', retention_period_days:365, status:'ARCHIVED' }, url: '/archive/records' },
    { name: 'Create Budget', body: { manager_id:uid, program_name:'Budget '+Date.now(), fiscal_year:2024, total_amount:1000, allocated_amount:500, spent_amount:200, status:'ACTIVE' }, url: '/budget/budgets' },
    { name: 'Create Admin User', body: { email:'test'+Date.now()+'@test.com', password:'password123', firstName:'Test', lastName:'User', clearance:'UNCLASSIFIED' }, url: '/admin/users' },
  ];

  console.log('Testing ' + posts.length + ' POST endpoints...');
  for (const p of posts) {
    try { await api.post(p.url, p.body); results.push({ name: p.name, ok: true }); }
    catch(e) { results.push({ name: p.name, ok: false, err: (e.response?.status || 'ERR') + ' ' + (e.response?.data?.error || e.message).substring(0,100) }); }
  }

  const ok = results.filter(r => r.ok).length;
  const fail = results.filter(r => !r.ok).length;
  console.log('\n====== RESULTS: ' + ok + ' OK / ' + fail + ' FAIL ======');
  const failures = results.filter(r => !r.ok);
  if (failures.length > 0) {
    console.log('\nFAILURES:');
    failures.forEach(f => console.log('  ' + f.name + ' -> ' + f.err));
  }
}

testAll();
