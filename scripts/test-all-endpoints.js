const axios = require('axios');
const api = axios.create({ baseURL: 'http://localhost:4000/api', headers: { 'Content-Type': 'application/json' }, validateStatus: () => true });

async function testAll() {
  const { data: auth } = await api.post('/auth/login', { email: 'admin@intel.local', password: 'admin123!' });
  api.defaults.headers.common.Authorization = 'Bearer ' + auth.accessToken;
  const uid = auth.user.id;

  const endpoints = [
    // All GET endpoints
    { n: 'Reports list', m: 'get', u: '/reports' },
    { n: 'Sources list', m: 'get', u: '/sources' },
    { n: 'Sources matrix', m: 'get', u: '/sources/reliability-matrix' },
    { n: 'Cases list', m: 'get', u: '/cases' },
    { n: 'Evidence list', m: 'get', u: '/evidence' },
    { n: 'OSINT tasks', m: 'get', u: '/osint/tasks' },
    { n: 'Threat actors', m: 'get', u: '/threats/actors' },
    { n: 'Threat indicators', m: 'get', u: '/threats/indicators' },
    { n: 'Threat screening', m: 'post', u: '/threats/screening', d: { values: ['test'] } },
    { n: 'Analysis relationships', m: 'get', u: '/analysis/relationships' },
    { n: 'Analysis graph', m: 'get', u: '/analysis/graph' },
    { n: 'Analysis stats', m: 'get', u: '/analysis/graph/stats' },
    { n: 'Analysis timeline', m: 'get', u: '/analysis/timeline' },
    { n: 'Personnel list', m: 'get', u: '/personnel' },
    { n: 'Org units', m: 'get', u: '/org-chart/units' },
    { n: 'Org tree', m: 'get', u: '/org-chart/units/tree' },
    { n: 'Org assignments', m: 'get', u: '/org-chart/assignments' },
    { n: 'Training courses', m: 'get', u: '/training/courses' },
    { n: 'Training enrollments', m: 'get', u: '/training/enrollments' },
    { n: 'Training AAR', m: 'get', u: '/training/aar' },
    { n: 'Watch shifts', m: 'get', u: '/watch-center/shifts' },
    { n: 'Watch logs', m: 'get', u: '/watch-center/logs' },
    { n: 'Watch sitreps', m: 'get', u: '/watch-center/sitreps' },
    { n: 'Missions plans', m: 'get', u: '/missions/plans' },
    { n: 'Targeting packages', m: 'get', u: '/targeting/packages' },
    { n: 'Collection reqs', m: 'get', u: '/collection/requirements' },
    { n: 'Collection assets', m: 'get', u: '/collection/assets' },
    { n: 'Tasking assignments', m: 'get', u: '/tasking/assignments' },
    { n: 'Tasking workflows', m: 'get', u: '/tasking/workflows' },
    { n: 'GEOINT features', m: 'get', u: '/geoint/features' },
    { n: 'SIGINT intercepts', m: 'get', u: '/sigint/intercepts' },
    { n: 'SIGINT emitters', m: 'get', u: '/sigint/emitters' },
    { n: 'CI investigations', m: 'get', u: '/ci/investigations' },
    { n: 'CI foreign agents', m: 'get', u: '/ci/foreign-agents' },
    { n: 'FININT transactions', m: 'get', u: '/fint/transactions' },
    { n: 'FININT entities', m: 'get', u: '/fint/entities' },
    { n: 'Biometrics records', m: 'get', u: '/biometrics/records' },
    { n: 'Biometrics watchlists', m: 'get', u: '/biometrics/watchlists' },
    { n: 'Biometrics encounters', m: 'get', u: '/biometrics/encounters' },
    { n: 'Briefings', m: 'get', u: '/briefings' },
    { n: 'Messaging channels', m: 'get', u: '/messaging/channels' },
    { n: 'Messaging messages', m: 'get', u: '/messaging/messages' },
    { n: 'Liaison partners', m: 'get', u: '/liaison/partners' },
    { n: 'Liaison agreements', m: 'get', u: '/liaison/agreements' },
    { n: 'Liaison contact-logs', m: 'get', u: '/liaison/contact-logs' },
    { n: 'Legal reviews', m: 'get', u: '/legal/reviews' },
    { n: 'Legal compliance', m: 'get', u: '/legal/compliance' },
    { n: 'Archive records', m: 'get', u: '/archive/records' },
    { n: 'Archive declass', m: 'get', u: '/archive/declassification' },
    { n: 'Budget programs', m: 'get', u: '/budget/budgets' },
    { n: 'Budget contracts', m: 'get', u: '/budget/contracts' },
    { n: 'Admin users', m: 'get', u: '/admin/users' },
    { n: 'Admin roles', m: 'get', u: '/admin/roles' },
    { n: 'Admin audit', m: 'get', u: '/admin/audit-logs' },
    { n: 'Admin health', m: 'get', u: '/admin/health' },
    { n: 'Notifications', m: 'get', u: '/notifications' },
    { n: 'Notif unread', m: 'get', u: '/notifications/unread-count' },
    { n: 'Search', m: 'get', u: '/search?q=test' },
    { n: 'Dashboard KPIs', m: 'get', u: '/dashboard/kpis' },
    { n: 'Deploy version', m: 'get', u: '/deploy-version' },
    { n: 'Auth me', m: 'get', u: '/auth/me' },
    { n: 'Login history', m: 'get', u: '/auth/login-history' },
    { n: 'Sessions', m: 'get', u: '/auth/sessions' },
    { n: 'Auth activity', m: 'get', u: '/auth/activity' },
    // POST tests
    { n: 'Create report', m: 'post', u: '/reports', d: { title: 'Test', summary: 'T', classification: 'UNCLASSIFIED', priority: 'LOW' } },
    { n: 'Create case', m: 'post', u: '/cases', d: { title: 'Test', description: 'T', status: 'OPEN', priority: 'LOW', classification: 'UNCLASSIFIED' } },
    { n: 'Create evidence', m: 'post', u: '/evidence', d: { title: 'Test', type: 'DOCUMENT', classification: 'UNCLASSIFIED' } },
  ];

  console.log('Testing ' + endpoints.length + ' endpoints...\n');
  let ok = 0, fail = 0;
  const errors = [];

  for (const ep of endpoints) {
    try {
      const res = ep.m === 'get' ? await api.get(ep.u) : await api.post(ep.u, ep.d || {});
      if (res.status >= 500) {
        fail++;
        errors.push(ep.n + ': ' + res.status + ' - ' + JSON.stringify(res.data).substring(0, 100));
      } else {
        ok++;
      }
    } catch (e) {
      fail++;
      errors.push(ep.n + ': ' + (e.response?.status || 'ERR') + ' - ' + (e.response?.data?.error || e.message).substring(0, 100));
    }
  }

  console.log('OK: ' + ok + '/FAIL: ' + fail + ' out of ' + endpoints.length);
  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.forEach(e => console.log('  ' + e));
  }
}

testAll();
