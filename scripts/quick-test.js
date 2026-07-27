const axios = require('axios');
const api = axios.create({ baseURL: 'http://localhost:4000/api', headers: { 'Content-Type': 'application/json' } });
api.interceptors.response.use(r=>r, e=>{console.log('FAIL:', e.config.method.toUpperCase(), e.config.url, '->', e.response?.status, e.response?.data?.error); return Promise.reject(e);});

async function t() {
  const {data:a} = await api.post('/auth/login', { email: 'admin@intel.local', password: 'admin123!' });
  api.defaults.headers.common.Authorization = 'Bearer ' + a.accessToken;
  const uid = a.user.id;
  
  // Test endpoints
  await api.post('/missions/plans', { commander_id: uid, title: 'T', objective: 'T', status: 'DRAFT', priority: 'LOW', classification: 'UNCLASSIFIED', start_date: '2024-01-01', end_date: '2024-12-31' }).then(()=>console.log('OK: /missions/plans'));
  await api.post('/targeting/packages', { author_id: uid, title: 'T', objective: 'T', status: 'DRAFT', priority: 'LOW', classification: 'UNCLASSIFIED', target_name: 'T', cde_estimate: 'LOW' }).then(()=>console.log('OK: /targeting/packages'));
  await api.post('/collection/requirements', { requester_id: uid, title: 'T', description: 'T', intelligence_discipline: 'SIGINT', priority: 'LOW', status: 'DRAFT' }).then(()=>console.log('OK: /collection/requirements'));
  await api.post('/collection/assets', { name: 'TEST-ASSET', asset_type: 'DRONE', platform: 'TEST', capability: 'TEST', status: 'DRAFT' }).then(()=>console.log('OK: /collection/assets'));
  await api.post('/tasking/assignments', { assigned_to: uid, assigned_by: uid, title: 'T', description: 'T', task_type: 'ANALYSIS', priority: 'LOW', status: 'DRAFT' }).then(()=>console.log('OK: /tasking/assignments'));
  await api.post('/tasking/workflows', { name: 'T-WF', description: 'T', steps: '[]', is_active: true }).then(()=>console.log('OK: /tasking/workflows'));
  await api.post('/geoint/features', { title: 'T', feature_type: 'POINT', coordinates: '{"type":"Point","coordinates":[0,0]}', classification: 'UNCLASSIFIED', description: 'T' }).then(()=>console.log('OK: /geoint/features'));
  await api.post('/sigint/intercepts', { title: 'T', signal_type: 'CW', frequency: '1000', modulation: 'AM', content: 'TEST', collection_date: '2024-01-01', classification: 'UNCLASSIFIED' }).then(()=>console.log('OK: /sigint/intercepts'));
  await api.post('/sigint/emitters', { name: 'T-EMIT', emitter_type: 'RADAR', frequency_range: '{}', confidence: 50, status: 'DRAFT' }).then(()=>console.log('OK: /sigint/emitters'));
  await api.post('/ci/investigations', { lead_investigator_id: uid, title: 'T', subject: 'T', investigation_type: 'SCREENING', classification: 'UNCLASSIFIED', status: 'DRAFT' }).then(()=>console.log('OK: /ci/investigations'));
  await api.post('/ci/foreign-agents', { name: 'T-AGENT', aliases: '["T"]', nationality: 'X', affiliation: 'Y', threat_level: 'LOW', status: 'DRAFT', description: 'T' }).then(()=>console.log('OK: /ci/foreign-agents'));
  await api.post('/ci/insider-threats', { user_id: uid, description: 'T', risk_level: 'LOW', status: 'DRAFT' }).then(()=>console.log('OK: /ci/insider-threats'));
  await api.post('/fint/entities', { name: 'T-ENT', entity_type: 'SHELL_COMPANY', jurisdiction: 'XX', risk_score: 50 }).then(()=>console.log('OK: /fint/entities'));
  await api.post('/fint/transactions', { transaction_ref: 'TX-TEST', amount: 100, currency: 'USD', transaction_type: 'WIRE_TRANSFER', transaction_date: '2024-01-01', flagged: false }).then(()=>console.log('OK: /fint/transactions'));
  await api.post('/biometrics/records', { subject_name: 'T-SUBJ', biometric_type: 'FACIAL', record_data: 'test', confidence_score: 90, classification: 'UNCLASSIFIED' }).then(()=>console.log('OK: /biometrics/records'));
  await api.post('/biometrics/watchlists', { name: 'T-WL', description: 'T', list_type: 'WATCHLIST', is_active: true }).then(()=>console.log('OK: /biometrics/watchlists'));
  await api.post('/biometrics/encounters', { location: '{"lat":0,"lng":0}', encounter_date: '2024-01-01T00:00:00Z', match_found: false, notes: 'T' }).then(()=>console.log('OK: /biometrics/encounters'));
  await api.post('/briefings', { title: 'T BREF', classification: 'UNCLASSIFIED', status: 'DRAFT', audience: '[]', content: '{}' }).then(()=>console.log('OK: /briefings'));
  await api.post('/messaging/channels', { name: 'T-CH-' + Date.now(), description: 'T', channel_type: 'TEAM' }).then(()=>console.log('OK: /messaging/channels'));
  await api.post('/liaison/partners', { name: 'T-PART-' + Date.now(), organization: 'T', partner_type: 'GOVERNMENT', status: 'ACTIVE', trust_level: 'LOW' }).then(()=>console.log('OK: /liaison/partners'));
  await api.post('/legal/reviews', { requested_by: uid, title: 'T', classification: 'UNCLASSIFIED', priority: 'LOW', status: 'DRAFT' }).then(()=>console.log('OK: /legal/reviews'));
  await api.post('/legal/compliance', { title: 'T', regulation: 'TEST', check_type: 'AUDIT', status: 'SCHEDULED' }).then(()=>console.log('OK: /legal/compliance'));
  await api.post('/archive/records', { archived_by: uid, title: 'T', entity_type: 'REPORT', classification: 'UNCLASSIFIED', retention_period_days: 365, status: 'ARCHIVED' }).then(()=>console.log('OK: /archive/records'));
  await api.post('/budget/budgets', { manager_id: uid, program_name: 'T-PROG-' + Date.now(), fiscal_year: 2024, total_amount: 1000, allocated_amount: 500, spent_amount: 200, status: 'ACTIVE' }).then(()=>console.log('OK: /budget/budgets'));
  await api.post('/budget/contracts', { contracting_officer_id: uid, vendor_name: 'T-VEND-' + Date.now(), description: 'T', contract_type: 'SERVICE', value: 1000, start_date: '2024-01-01', end_date: '2024-12-31', status: 'ACTIVE' }).then(()=>console.log('OK: /budget/contracts'));
  await api.post('/analysis/relationships', { source_type: 'threat_actor', source_id: uid, target_type: 'case', target_id: uid, relationship_type: 'RELATED_TO', confidence: 50, created_by: uid }).then(()=>console.log('OK: /analysis/relationships'));
  console.log('\nAll tests done');
}
t();
