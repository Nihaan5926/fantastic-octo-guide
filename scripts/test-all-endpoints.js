const axios = require('axios');
const api = axios.create({ baseURL: 'http://localhost:4000/api', headers: { 'Content-Type': 'application/json' } });

async function testAll() {
  const { data: auth } = await api.post('/auth/login', { email: 'admin@intel.local', password: 'admin123!' });
  api.defaults.headers.common.Authorization = 'Bearer ' + auth.accessToken;
  const uid = auth.user.id;

  const endpoints = [
    // GET endpoints
    { name: 'Reports', method: 'get', url: '/reports' },
    { name: 'Sources', method: 'get', url: '/sources' },
    { name: 'Cases', method: 'get', url: '/cases' },
    { name: 'Evidence', method: 'get', url: '/evidence' },
    { name: 'OSINT Tasks', method: 'get', url: '/osint/tasks' },
    { name: 'Threat Actors', method: 'get', url: '/threats/actors' },
    { name: 'Indicators', method: 'get', url: '/threats/indicators' },
    { name: 'Analysis Graph', method: 'get', url: '/analysis/graph' },
    { name: 'Analysis Stats', method: 'get', url: '/analysis/graph/stats' },
    { name: 'Analysis Timeline', method: 'get', url: '/analysis/timeline' },
    { name: 'Personnel', method: 'get', url: '/personnel' },
    { name: 'Org Units', method: 'get', url: '/org-chart/units' },
    { name: 'Org Tree', method: 'get', url: '/org-chart/units/tree' },
    { name: 'Org Assignments', method: 'get', url: '/org-chart/assignments' },
    { name: 'Training', method: 'get', url: '/training/courses' },
    { name: 'Training AAR', method: 'get', url: '/training/aar' },
    { name: 'Watch Shifts', method: 'get', url: '/watch-center/shifts' },
    { name: 'Watch Logs', method: 'get', url: '/watch-center/logs' },
    { name: 'SITREPs', method: 'get', url: '/watch-center/sitreps' },
    { name: 'Missions', method: 'get', url: '/missions/plans' },
    { name: 'Targeting', method: 'get', url: '/targeting/packages' },
    { name: 'Collection Reqs', method: 'get', url: '/collection/requirements' },
    { name: 'Collection Assets', method: 'get', url: '/collection/assets' },
    { name: 'Tasking', method: 'get', url: '/tasking/assignments' },
    { name: 'GEOINT', method: 'get', url: '/geoint/features' },
    { name: 'SIGINT', method: 'get', url: '/sigint/intercepts' },
    { name: 'CI', method: 'get', url: '/ci/investigations' },
    { name: 'FININT Txns', method: 'get', url: '/fint/transactions' },
    { name: 'FININT Entities', method: 'get', url: '/fint/entities' },
    { name: 'Biometrics', method: 'get', url: '/biometrics/records' },
    { name: 'Briefings', method: 'get', url: '/briefings' },
    { name: 'Messaging', method: 'get', url: '/messaging/channels' },
    { name: 'Liaison', method: 'get', url: '/liaison/partners' },
    { name: 'Legal', method: 'get', url: '/legal/reviews' },
    { name: 'Archive', method: 'get', url: '/archive/records' },
    { name: 'Budget', method: 'get', url: '/budget/budgets' },
    { name: 'Admin Users', method: 'get', url: '/admin/users' },
    { name: 'Admin Roles', method: 'get', url: '/admin/roles' },
    { name: 'Admin Logs', method: 'get', url: '/admin/audit-logs' },
    { name: 'Admin Health', method: 'get', url: '/admin/health' },
    { name: 'Notifications', method: 'get', url: '/notifications' },
    { name: 'Search', method: 'get', url: '/search?q=test' },
    { name: 'Dashboard KPIs', method: 'get', url: '/dashboard/kpis' },
    { name: 'Sources Matrix', method: 'get', url: '/sources/reliability-matrix' },
    { name: 'Threats Import', method: 'post', url: '/threats/import', data: { actors: [], indicators: [] } },
  ];

  console.log('Testing ' + endpoints.length + ' endpoints...\n');
  let ok = 0, fail = 0;

  for (const ep of endpoints) {
    try {
      if (ep.method === 'get') {
        await api.get(ep.url);
      } else {
        await api.post(ep.url, ep.data || {});
      }
      ok++;
    } catch (e) {
      fail++;
      const msg = e.response?.data?.error || e.message;
      console.log('FAIL: ' + ep.name + ' -> ' + msg.substring(0, 100));
    }
  }

  console.log('\nResults: ' + ok + ' OK, ' + fail + ' FAIL out of ' + endpoints.length);
}

testAll();
