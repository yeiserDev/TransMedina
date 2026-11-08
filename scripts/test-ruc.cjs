const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const path = require('node:path');
const file = path.resolve('src/lib/ruc.ts');
const loaded = new Module(file, module);
loaded._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, file);
const { consultarRuc, esRuc } = loaded.exports;
async function main() {
  const ruc = '20502028015';
  assert.equal(esRuc(ruc), true);
  for (const invalid of ['', '123', '2050202801A', 20502028015, null]) assert.equal(esRuc(invalid), false);
  let calls = 0;
  const mock = async (url, options) => {
    calls++;
    assert.equal(url, `https://api.decolecta.com/v1/sunat/ruc?numero=${ruc}`);
    assert.equal(options.headers.Authorization, 'Bearer test-only');
    return Response.json({ numero_documento: ruc, razon_social: ' EMPRESA DE PRUEBA ' });
  };
  await assert.rejects(() => consultarRuc('123', 'test-only', mock), e => e.status === 400);
  await assert.rejects(() => consultarRuc(ruc, undefined, mock), e => e.status === 503);
  assert.equal(calls, 0);
  assert.deepEqual(await consultarRuc(ruc, 'test-only', mock), { ruc, razon_social: 'EMPRESA DE PRUEBA' });
  for (const [upstream, expected] of [[401,503],[403,503],[404,404],[422,404],[429,429],[500,502]]) {
    await assert.rejects(() => consultarRuc(ruc, 'test-only', async () => new Response('', { status: upstream })), e => e.status === expected);
  }
  await assert.rejects(() => consultarRuc(ruc, 'test-only', async () => Response.json({ numero_documento: '20131312955', razon_social: 'OTRA EMPRESA' })), e => e.status === 502);
  await assert.rejects(() => consultarRuc(ruc, 'test-only', async () => { throw new Error('timeout'); }), e => e.status === 502);
  console.log('RUC: validation, mapping, missing token, mismatched results and provider errors OK (mocked provider).');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
