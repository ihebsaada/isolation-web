import test from 'node:test';
import assert from 'node:assert/strict';
import { sameOrigin } from '../src/lib/request-origin.ts';

function check(mode, url, headers, vercel = undefined) {
  const oldMode = process.env.NODE_ENV, oldVercel = process.env.VERCEL;
  try {
    process.env.NODE_ENV = mode;
    if (vercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = vercel;
    return sameOrigin(new Request(url, { method: 'POST', headers }));
  } finally {
    if (oldMode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = oldMode;
    if (oldVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = oldVercel;
  }
}

const production = 'https://isolationquebec.eu.cc';
test('production accepts exact same origin from request URL or Host', () => {
  assert.equal(check('production', production + '/api/leads', { origin: production }), true);
  assert.equal(check('production', 'https://internal.invalid/api/leads', {
    host: 'isolationquebec.eu.cc', origin: production,
  }), true);
});

test('production uses trusted Vercel forwarded host and protocol', () => {
  assert.equal(check('production', 'http://127.0.0.1:3000/api/leads', {
    host: 'internal.invalid:3000', 'x-forwarded-host': 'isolationquebec.eu.cc',
    'x-forwarded-proto': 'https', origin: production,
  }, '1'), true);
});

test('production rejects forged origins, subdomains, protocol and port changes', () => {
  for (const origin of ['https://evil.example', 'https://isolationquebec.eu.cc.evil.example',
    'http://isolationquebec.eu.cc', 'https://isolationquebec.eu.cc:3012',
    'http://localhost:3012', 'http://127.0.0.1:3012', production + '/']) {
    assert.equal(check('production', production, { origin }), false, origin);
  }
});

test('production ignores untrusted forwarded headers outside Vercel', () => {
  const headers = { 'x-forwarded-host': 'evil.example', 'x-forwarded-proto': 'http' };
  assert.equal(check('production', production, { ...headers, origin: 'http://evil.example' }), false);
  assert.equal(check('production', production, { ...headers, origin: production }), true);
});

test('development accepts both exact local aliases on the current request port', () => {
  for (const host of ['localhost:3012', '127.0.0.1:3012']) {
    for (const origin of ['http://localhost:3012', 'http://127.0.0.1:3012']) {
      assert.equal(check('development', 'http://internal.invalid:3000/api/leads', { host, origin }), true);
      assert.equal(check('test', `http://${host}/api/leads`, { origin }), true);
    }
  }
});

test('development derives its port from forwarded host when provided', () => {
  const headers = { host: 'localhost:3000', 'x-forwarded-host': '127.0.0.1:3012', 'x-forwarded-proto': 'http' };
  assert.equal(check('development', 'http://localhost:3000', { ...headers, origin: 'http://localhost:3012' }), true);
  assert.equal(check('development', 'http://localhost:3000', { ...headers, origin: 'http://127.0.0.1:3000' }), false);
});

test('development rejects different ports, arbitrary hosts and HTTPS aliases', () => {
  for (const origin of ['http://localhost:3013', 'http://127.0.0.1:3000', 'http://localhost',
    'http://evil.example:3012', 'http://localhost.evil.example:3012', 'https://localhost:3012']) {
    assert.equal(check('development', 'http://127.0.0.1:3012', { origin }), false, origin);
  }
  assert.equal(check('development', 'http://evil.example:3012', { origin: 'http://evil.example:3012' }), false);
});

test('production never enables local origin exceptions', () => {
  for (const origin of ['http://localhost:3012', 'http://127.0.0.1:3012']) {
    assert.equal(check('production', 'http://127.0.0.1:3012', { origin }), false);
  }
});

test('missing, null, malformed and multiple Origin values are rejected', () => {
  for (const mode of ['production', 'development']) {
    const url = mode === 'production' ? production : 'http://localhost:3012';
    assert.equal(check(mode, url, {}), false);
    for (const origin of ['', 'null', 'not a URL', url + ', https://evil.example']) {
      assert.equal(check(mode, url, { origin }), false);
    }
  }
});

test('malformed or ambiguous trusted forwarding headers fail closed', () => {
  for (const host of ['isolationquebec.eu.cc, evil.example', 'isolationquebec.eu.cc@evil.example',
    'isolationquebec.eu.cc/path', 'isolationquebec.eu.cc:invalid']) {
    assert.equal(check('production', production, { origin: production,
      'x-forwarded-host': host, 'x-forwarded-proto': 'https' }, '1'), false);
  }
  for (const protocol of ['https,http', 'javascript', 'HTTPS']) {
    assert.equal(check('production', production, { origin: production,
      'x-forwarded-host': 'isolationquebec.eu.cc', 'x-forwarded-proto': protocol }, '1'), false);
  }
});
