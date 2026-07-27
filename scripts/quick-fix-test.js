const axios = require('axios');
const api = axios.create({ baseURL: 'http://localhost:4000/api', headers: { 'Content-Type': 'application/json' } });

async function test() {
  const { data: auth } = await api.post('/auth/login', { email: 'admin@intel.local', password: 'admin123!' });
  api.defaults.headers.common.Authorization = 'Bearer ' + auth.accessToken;

  console.log('1. Training AAR:');
  try {
    const r = await api.post('/training/aar', { title:'Test AAR', exercise_name:'Test', date:'2024-01-01', summary:'T', findings:'{}', recommendations:'[]' });
    console.log('  OK:', r.data.id);
  } catch(e) { console.log('  FAIL:', e.response?.data?.error?.substring(0,100)); }

  console.log('2. Mission Debrief:');
  try {
    const missions = await api.get('/missions/plans');
    const mid = missions.data.data[0]?.id;
    if (mid) {
      const r = await api.post('/missions/plans/' + mid + '/debriefs', { title:'Test', summary:'T', findings:'{}' });
      console.log('  OK:', r.data.id);
    } else { console.log('  SKIP: No missions'); }
  } catch(e) { console.log('  FAIL:', e.response?.data?.error?.substring(0,120)); }

  console.log('3. Declass:');
  try {
    const me = await api.get('/auth/me');
    const r = await api.post('/archive/declassification', { current_classification:'SECRET', requested_classification:'UNCLASSIFIED', reason:'Historical', record_id:me.data.id });
    console.log('  OK:', r.data.id);
  } catch(e) { console.log('  FAIL:', e.response?.data?.error?.substring(0,120)); }

  console.log('4. Register:');
  try {
    const r = await api.post('/auth/register', { email:'qa-test-'+Date.now()+'@test.com', password:'password123456', firstName:'QA', lastName:'Test' });
    console.log('  OK:', r.data.user?.id || 'has user');
  } catch(e) { console.log('  FAIL:', e.response?.data?.error?.substring(0,100)); }
}

test();
