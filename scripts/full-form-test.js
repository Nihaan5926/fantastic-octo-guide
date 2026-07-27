const axios = require('axios');
const api = axios.create({ baseURL: 'http://localhost:4000/api', headers: { 'Content-Type': 'application/json' } });

async function testAll() {
  const { data: auth } = await api.post('/auth/login', { email: 'admin@intel.local', password: 'admin123!' });
  api.defaults.headers.common.Authorization = 'Bearer ' + auth.accessToken;
  const uid = auth.user.id;
  console.log('Auth OK. User:', auth.user.email, '\n');

  let ok = 0, fail = 0;
  const failures = [];

  async function testPost(name, url, body) {
    try {
      const r = await api.post(url, body);
      if (r.data && r.data.id) ok++;
      else { fail++; failures.push(name + ': No ID returned'); }
      return r.data;
    } catch(e) {
      fail++;
      const msg = (e.response?.data?.error || e.message).substring(0,120);
      failures.push(name + ': ' + msg);
    }
  }

  const t = (n,u,b) => testPost(n,u,b);

  // ─── CORE INTEL ───
  console.log('--- Core Intel ---');
  const report = await t('Reports', '/reports', { title:'QA Test Report', summary:'Testing', classification:'UNCLASSIFIED', priority:'LOW' });
  await t('Sources', '/sources', { code_name:'QA-SRC-'+Date.now(), type:'OSINT', reliability_rating:'A-1', status:'ACTIVE' });
  await t('Sources (HUMINT)', '/sources', { code_name:'QA-HUM-'+Date.now(), type:'HUMINT', reliability_rating:'B-2', status:'ACTIVE' });
  const cse = await t('Cases', '/cases', { title:'QA Test Case '+Date.now(), description:'Testing', status:'OPEN', priority:'HIGH', classification:'SECRET' });
  await t('Evidence (DOCUMENT)', '/evidence', { title:'QA Doc Ev', type:'DOCUMENT', classification:'CONFIDENTIAL' });
  await t('Evidence (IMAGE)', '/evidence', { title:'QA Image Ev', type:'IMAGE', classification:'UNCLASSIFIED' });
  await t('Evidence (VIDEO)', '/evidence', { title:'QA Video Ev', type:'VIDEO', classification:'SECRET' });
  await t('Evidence (DATA)', '/evidence', { title:'QA Data Ev', type:'DATA', classification:'UNCLASSIFIED' });
  await t('Evidence (OTHER)', '/evidence', { title:'QA Other Ev', type:'OTHER', classification:'UNCLASSIFIED' });
  await t('OSINT Task', '/osint/tasks', { title:'QA OSINT Task '+Date.now(), query:'qa test', source_types:'[]', status:'IDLE' });
  const actor = await t('Threat Actor', '/threats/actors', { name:'QA-Actor-'+Date.now(), aliases:'[]', description:'QA test actor', motivation:'POLITICAL', sophistication:'MEDIUM', status:'ACTIVE' });
  if (actor) {
    await t('Threat Indicator (IP)', '/threats/indicators', { threat_actor_id:actor.id, type:'IP', value:'192.168.'+(ok+1)+'.1', confidence:75 });
    await t('Threat Indicator (DOMAIN)', '/threats/indicators', { threat_actor_id:actor.id, type:'DOMAIN', value:'qa-test-'+Date.now()+'.com', confidence:85 });
    await t('Threat Indicator (EMAIL)', '/threats/indicators', { threat_actor_id:actor.id, type:'EMAIL', value:'qa@test-'+Date.now()+'.com', confidence:60 });
    await t('Threat Indicator (HASH)', '/threats/indicators', { threat_actor_id:actor.id, type:'HASH', value:'d4e2fc1a8b'+Date.now(), confidence:50 });
    await t('Threat Indicator (URL)', '/threats/indicators', { threat_actor_id:actor.id, type:'URL', value:'https://qa-'+Date.now()+'.com', confidence:40 });
  }
  if (report && cse) {
    await t('Analysis Relationship', '/analysis/relationships', { source_type:'report', source_id:report.id, target_type:'case', target_id:cse.id, relationship_type:'SUPPORTS', confidence:80 });
  }

  // ─── PERSONNEL ───
  console.log('--- Personnel ---');
  await t('Personnel (full)', '/personnel', { position_title:'QA Officer '+Date.now(), clearance_level:'TOP_SECRET', nationality:'US', notes:'QA test record' });
  await t('Personnel (minimal)', '/personnel', { position_title:'QA Analyst '+Date.now(), clearance_level:'SECRET', nationality:'UK' });
  await t('Personnel (no user)', '/personnel', { position_title:'QA External '+Date.now(), clearance_level:'CONFIDENTIAL', nationality:'CA' });
  const unit = await t('Org Unit', '/org-chart/units', { name:'QA Section '+Date.now(), unit_type:'SECTION' });
  const subUnit = await t('Org Unit (child)', '/org-chart/units', { name:'QA Team '+Date.now(), unit_type:'TEAM', parent_id:unit?.id || null });

  // ─── TRAINING ───
  console.log('--- Training ---');
  const course = await t('Training Course', '/training/courses', { title:'QA Course '+Date.now(), description:'QA test course', course_type:'TECHNICAL', duration_hours:16, instructor:'QA Instructor', is_required:true });
  await t('Training Course (optional)', '/training/courses', { title:'QA Optional '+Date.now(), description:'Optional', course_type:'FIELD', duration_hours:8, instructor:'QA', is_required:false });
  await t('Training AAR', '/training/aar', { title:'QA AAR '+Date.now(), exercise_name:'QA Exercise', date:'2024-06-15', summary:'QA test AAR', findings:'{}', recommendations:'[]' });
  await t('Training Enrollment', '/training/enrollments', { course_id:course?.id, user_id:uid, status:'ENROLLED' });

  // ─── WATCH CENTER ───
  console.log('--- Watch Center ---');
  await t('SITREP', '/watch-center/sitreps', { title:'QA SITREP '+Date.now(), classification:'SECRET', content:'{}', period_start:'2024-01-01T00:00:00Z', period_end:'2024-01-01T06:00:00Z' });
  await t('Watch Log (ROUTINE)', '/watch-center/logs', { title:'QA Routine Log '+Date.now(), log_type:'ROUTINE', content:'All clear', severity:'ROUTINE', status:'PENDING' });
  await t('Watch Log (ALERT)', '/watch-center/logs', { title:'QA Alert Log '+Date.now(), log_type:'ALERT', content:'Suspicious activity', severity:'HIGH', status:'ACTIVE' });
  await t('Watch Log (HANDOVER)', '/watch-center/logs', { title:'QA Handover '+Date.now(), log_type:'HANDOVER', content:'Shift change', severity:'ROUTINE', status:'COMPLETED' });
  await t('Shift Schedule', '/watch-center/shifts', { shift_name:'QA Shift '+Date.now(), start_time:'06:00', end_time:'18:00', is_active:true });

  // ─── OPERATIONS ───
  console.log('--- Operations ---');
  const mission = await t('Mission Plan', '/missions/plans', { commander_id:uid, title:'QA Mission '+Date.now(), objective:'Test mission', status:'PLANNING', priority:'HIGH', classification:'SECRET', start_date:'2024-01-01', end_date:'2024-12-31' });
  if (mission) await t('Mission Brief', '/missions/plans/'+mission.id+'/briefs', { title:'QA Brief v1', content:'{}', version:1 });
  if (mission) await t('Mission Debrief', '/missions/plans/'+mission.id+'/debriefs', { title:'QA Debrief', summary:'T', findings:'{}' });
  await t('Target Package', '/targeting/packages', { author_id:uid, title:'QA Target '+Date.now(), objective:'Test', status:'DRAFT', priority:'HIGH', classification:'SECRET', target_name:'Site QA', cde_estimate:'LOW' });
  await t('Collection Requirement', '/collection/requirements', { requester_id:uid, title:'QA Req '+Date.now(), description:'T', intelligence_discipline:'SIGINT', priority:'HIGH', status:'ACTIVE' });
  await t('Collection Requirement (GEOINT)', '/collection/requirements', { requester_id:uid, title:'QA GEOINT Req '+Date.now(), description:'T', intelligence_discipline:'GEOINT', priority:'MEDIUM', status:'DRAFT' });
  await t('Collection Asset', '/collection/assets', { name:'QA-Asset-'+Date.now(), asset_type:'SATELLITE', platform:'GEO', capability:'Imaging', status:'OPERATIONAL', location:'Orbit' });
  await t('Collection Asset (UAV)', '/collection/assets', { name:'QA-UAV-'+Date.now(), asset_type:'UAV', platform:'Drone', capability:'Video', status:'MAINTENANCE', location:'Base' });
  await t('Tasking Assignment', '/tasking/assignments', { assigned_to:uid, assigned_by:uid, title:'QA Task '+Date.now(), description:'T', task_type:'ANALYSIS', priority:'HIGH', status:'ASSIGNED' });
  await t('Tasking Assignment (BRIEFING)', '/tasking/assignments', { assigned_to:uid, assigned_by:uid, title:'QA Brief Task '+Date.now(), description:'T', task_type:'BRIEFING', priority:'MEDIUM', status:'PENDING' });
  await t('Tasking Workflow', '/tasking/workflows', { name:'QA Workflow '+Date.now(), description:'Test workflow', steps:'[]', is_active:true });

  // ─── INT DISCIPLINES ───
  console.log('--- INT Disciplines ---');
  await t('GEOINT (POINT)', '/geoint/features', { title:'QA Point '+Date.now(), feature_type:'POINT', coordinates:'{"type":"Point","coordinates":[51.5,-0.1]}', classification:'UNCLASSIFIED', description:'London' });
  await t('GEOINT (POLYGON)', '/geoint/features', { title:'QA Zone '+Date.now(), feature_type:'POLYGON', coordinates:'{"type":"Polygon","coordinates":[[[0,0],[1,0],[1,1],[0,1],[0,0]]]}', classification:'SECRET', description:'Test zone' });
  await t('GEOINT (LINESTRING)', '/geoint/features', { title:'QA Route '+Date.now(), feature_type:'LINESTRING', coordinates:'{"type":"LineString","coordinates":[[0,0],[1,1],[2,0]]}', classification:'CONFIDENTIAL', description:'Test route' });
  await t('SIGINT Intercept', '/sigint/intercepts', { title:'QA Intercept '+Date.now(), signal_type:'BURST', frequency:'2450.0', modulation:'QPSK', content:'Encrypted burst', collection_date:'2024-01-01', classification:'SECRET' });
  await t('SIGINT Intercept (VOICE)', '/sigint/intercepts', { title:'QA Voice '+Date.now(), signal_type:'VOICE', frequency:'8450.0', modulation:'AM', content:'Testing', collection_date:'2024-01-01', classification:'CONFIDENTIAL' });
  await t('SIGINT Emitter', '/sigint/emitters', { name:'QA-EMIT-'+Date.now(), emitter_type:'RADAR', frequency_range:'{"low":9500,"high":10200}', confidence:75, status:'ACTIVE' });
  await t('CI Investigation', '/ci/investigations', { title:'QA CI '+Date.now(), subject:'Unauthorized access', investigation_type:'INSIDER', classification:'TOP_SECRET', status:'OPEN' });
  await t('CI Investigation (SCREENING)', '/ci/investigations', { title:'QA Screening '+Date.now(), subject:'Asset vetting', investigation_type:'SCREENING', classification:'SECRET', status:'IN_PROGRESS' });
  await t('CI Foreign Agent', '/ci/foreign-agents', { name:'QA-Agent-'+Date.now(), aliases:'[]', nationality:'Unknown', affiliation:'FIS', threat_level:'HIGH', status:'ACTIVE', description:'Suspected' });
  await t('CI Insider Threat', '/ci/insider-threats', { description:'QA insider case', risk_level:'MEDIUM', status:'UNDER_INVESTIGATION' });
  await t('FININT Entity', '/fint/entities', { name:'QA-Ent-'+Date.now(), entity_type:'SHELL_COMPANY', jurisdiction:'Panama', risk_score:85 });
  await t('FININT Entity (BUSINESS)', '/fint/entities', { name:'QA-Biz-'+Date.now(), entity_type:'LEGITIMATE_BUSINESS', jurisdiction:'UAE', risk_score:30 });
  await t('FININT Entity (BANK)', '/fint/entities', { name:'QA-Bank-'+Date.now(), entity_type:'BANK', jurisdiction:'CH', risk_score:15 });
  await t('FININT Transaction', '/fint/transactions', { transaction_ref:'QA-TXN-'+Date.now(), amount:50000, currency:'USD', transaction_type:'WIRE_TRANSFER', transaction_date:'2024-01-15', flagged:true, flag_reason:'Suspicious amount' });
  await t('FININT Transaction (CLEAN)', '/fint/transactions', { transaction_ref:'QA-CLN-'+Date.now(), amount:500, currency:'EUR', transaction_type:'CASH_DEPOSIT', transaction_date:'2024-01-16', flagged:false });
  await t('Biometric Record', '/biometrics/records', { subject_name:'QA-Subject '+Date.now(), biometric_type:'FACIAL', record_data:'qa-template-data', confidence_score:95, classification:'SECRET' });
  await t('Biometric Record (FINGERPRINT)', '/biometrics/records', { subject_name:'QA-FP '+Date.now(), biometric_type:'FINGERPRINT', record_data:'qa-fp-data', confidence_score:99, classification:'CONFIDENTIAL' });
  await t('Biometric Record (DNA)', '/biometrics/records', { subject_name:'QA-DNA '+Date.now(), biometric_type:'DNA', record_data:'qa-dna-data', confidence_score:100, classification:'TOP_SECRET' });
  await t('Biometric Watchlist', '/biometrics/watchlists', { name:'QA Watchlist '+Date.now(), description:'QA test watchlist', list_type:'WATCHLIST', is_active:true });
  await t('Biometric Watchlist (DATABASE)', '/biometrics/watchlists', { name:'QA DB '+Date.now(), description:'QA test DB', list_type:'DATABASE', is_active:true });
  await t('Biometric Encounter', '/biometrics/encounters', { location:'{"lat":51.5,"lng":-0.1}', encounter_date:'2024-01-01T08:00:00Z', match_found:false, notes:'Routine check' });

  // ─── DISSEMINATION ───
  console.log('--- Dissemination ---');
  await t('Briefing', '/briefings', { title:'QA Briefing '+Date.now(), classification:'SECRET', status:'DRAFT', audience:'[]', content:'{}' });
  await t('Briefing (TOP SECRET)', '/briefings', { title:'QA TS Brief '+Date.now(), classification:'TOP_SECRET', status:'DRAFT', audience:'[]', content:'{}' });
  await t('Message Channel (TEAM)', '/messaging/channels', { name:'QA-Team-'+Date.now(), description:'QA team channel', channel_type:'TEAM' });
  await t('Message Channel (BROADCAST)', '/messaging/channels', { name:'QA-BC-'+Date.now(), description:'QA broadcast', channel_type:'BROADCAST' });
  await t('Message Channel (DIRECT)', '/messaging/channels', { name:'QA-DM-'+Date.now(), description:'QA direct', channel_type:'DIRECT' });
  await t('Liaison Partner', '/liaison/partners', { name:'QA-Partner-'+Date.now(), organization:'QA Org', partner_type:'GOVERNMENT', status:'ACTIVE', trust_level:3 });
  await t('Liaison Partner (NGO)', '/liaison/partners', { name:'QA-NGO-'+Date.now(), organization:'QA NGO', partner_type:'NGO', status:'ACTIVE', trust_level:2 });
  await t('Liaison Partner (INTERNATIONAL)', '/liaison/partners', { name:'QA-Intl-'+Date.now(), organization:'QA Intl', partner_type:'INTERNATIONAL', status:'ACTIVE', trust_level:4 });

  // ─── OVERSIGHT ───
  console.log('--- Oversight ---');
  await t('Legal Review', '/legal/reviews', { requested_by:uid, title:'QA Legal '+Date.now(), classification:'SECRET', priority:'HIGH', status:'PENDING_REVIEW' });
  await t('Legal Review (CONFIDENTIAL)', '/legal/reviews', { requested_by:uid, title:'QA Legal C '+Date.now(), classification:'CONFIDENTIAL', priority:'MEDIUM', status:'IN_REVIEW' });
  await t('Legal Compliance', '/legal/compliance', { title:'QA Compliance '+Date.now(), regulation:'GDPR Art. 25', check_type:'AUDIT', status:'SCHEDULED' });
  await t('Legal Compliance (ASSESSMENT)', '/legal/compliance', { title:'QA Assessment '+Date.now(), regulation:'FISA 702', check_type:'ASSESSMENT', status:'IN_PROGRESS' });
  await t('Archive Record', '/archive/records', { archived_by:uid, title:'QA Archive '+Date.now(), entity_type:'REPORT', classification:'SECRET', retention_period_days:1825, status:'ARCHIVED' });
  await t('Archive Record (CASE)', '/archive/records', { archived_by:uid, title:'QA Archive C '+Date.now(), entity_type:'CASE', classification:'CONFIDENTIAL', retention_period_days:3650, status:'ARCHIVED' });
  await t('Declassification Request', '/archive/declassification', { record_id:uid, current_classification:'SECRET', requested_classification:'UNCLASSIFIED', reason:'Historical record' });
  await t('Budget Program', '/budget/budgets', { manager_id:uid, program_name:'QA Program '+Date.now(), fiscal_year:2024, total_amount:1000000, allocated_amount:750000, spent_amount:500000, status:'ACTIVE' });
  await t('Budget Program (PLANNING)', '/budget/budgets', { manager_id:uid, program_name:'QA Future '+Date.now(), fiscal_year:2025, total_amount:2000000, allocated_amount:0, spent_amount:0, status:'PLANNING' });
  await t('Budget Contract', '/budget/contracts', { contracting_officer_id:uid, vendor_name:'QA Vendor '+Date.now(), description:'QA service contract', contract_type:'SERVICE', value:500000, start_date:'2024-01-01', end_date:'2024-12-31', status:'ACTIVE' });
  await t('Budget Contract (PRODUCT)', '/budget/contracts', { contracting_officer_id:uid, vendor_name:'QA Product '+Date.now(), description:'QA product', contract_type:'PRODUCT', value:250000, start_date:'2024-06-01', end_date:'2024-06-30', status:'COMPLETED' });

  // ─── ADMIN ───
  console.log('--- Admin ---');
  await t('Admin Create User', '/admin/users', { email:'qa-test-'+Date.now()+'@intel.local', password:'password123456', firstName:'QA', lastName:'Tester', clearance:'SECRET', roleName:'ANALYST' });
  await t('Admin Create User (VIEWER)', '/admin/users', { email:'qa-viewer-'+Date.now()+'@intel.local', password:'password123456', firstName:'QA', lastName:'Viewer', clearance:'UNCLASSIFIED', roleName:'VIEWER' });

  // ─── AUTH ───
  console.log('--- Auth ---');
  await t('Register User', '/auth/register', { email:'qa-reg-'+Date.now()+'@test.com', password:'password123456', firstName:'QA', lastName:'Register' });

  console.log('\n======= RESULTS: ' + ok + ' OK / ' + fail + ' FAIL =======');
  if (failures.length > 0) {
    console.log('\nFAILURES:');
    failures.forEach(f => console.log('  ' + f));
  } else {
    console.log('\nALL TESTS PASSED — 0 ERRORS');
  }
}

testAll();
