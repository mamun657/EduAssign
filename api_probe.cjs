// Quick API probe to confirm bearer token works against /api/admin/teachers
const https = require('http');

function req(method, path, headers, body) {
  return new Promise((resolve, reject) => {
    const data = body ? Buffer.from(body) : null;
    const opts = {
      method,
      hostname: 'localhost',
      port: 5220,
      path,
      headers: {
        Accept: 'application/json',
        ...headers,
        ...(data ? { 'Content-Type': 'application/json', 'Content-Length': data.length } : {}),
      },
    };
    const r = https.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString() }));
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

(async () => {
  const login = await req('POST', '/api/Auth/login', null, JSON.stringify({
    email: 'admin@eduassign.local',
    password: 'L@unchPad!Admin#2026-XqZ',
  }));
  console.log('login', login.status, login.body.slice(0, 80));
  const tok = JSON.parse(login.body).token;
  const t = await req('GET', '/api/admin/teachers', { Authorization: `Bearer ${tok}` });
  console.log('teachers', t.status, t.body.slice(0, 120));
})().catch((e) => { console.error(e); process.exit(1); });