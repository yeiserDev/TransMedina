// Run against a local Next.js instance; no credentials and no writes occur.
const assert = require('node:assert/strict');
async function main() {
  const base = process.env.TEST_BASE_URL || 'http://localhost:3000';
  for (const route of ['/api/externos', '/api/externos/documentos']) {
    for (const method of ['GET', 'POST']) {
      const response = await fetch(base + route, { method, signal: AbortSignal.timeout(30000) });
      assert.equal(response.status, 401, `${method} ${route} must require an administrator session`);
      console.log(`${method} ${route}: unauthenticated request rejected (401)`);
    }
  }
  const page = await fetch(base + '/externos', { redirect: 'manual', signal: AbortSignal.timeout(30000) });
  const ruc = await fetch(base + '/api/externos/ruc?numero=20502028015', { signal: AbortSignal.timeout(30000) });
  assert.equal(ruc.status, 401, 'RUC lookup must require administrator authentication');
  console.log('GET /api/externos/ruc: unauthenticated request rejected (401)');
  assert.ok([302, 303, 307, 308].includes(page.status), 'External page must redirect without login');
  assert.ok(page.headers.get('location')?.includes('/login'));
  console.log('/externos: redirects unauthenticated visitors to login');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
