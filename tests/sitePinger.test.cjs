const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadTypescript } = require('./loadTypescript.cjs');

test('all failed ping attempts release their timers', async (t) => {
  const active = new Set();
  t.mock.method(global, 'setTimeout', () => { const id = {}; active.add(id); return id; });
  t.mock.method(global, 'clearTimeout', (id) => active.delete(id));
  const fetch = t.mock.method(global, 'fetch', async () => { throw new Error('offline'); });
  const { pingSite } = loadTypescript('utils/sitePinger.ts');
  const result = await pingSite('https://example.com');
  assert.equal(result.accessible, false);
  assert.equal(fetch.mock.callCount(), 3);
  assert.equal(active.size, 0);
});

test('missing favicon still counts as a reachable site', async (t) => {
  t.mock.method(global, 'fetch', async () => ({ status: 404 }));
  const { pingSite } = loadTypescript('utils/sitePinger.ts');
  assert.equal((await pingSite('https://example.com')).accessible, true);
});

test('fallback request preserves reachability after favicon network error', async (t) => {
  const fetch = t.mock.method(global, 'fetch', async (_url, options) => {
    if (options.method === 'GET') throw new Error('favicon unavailable');
    return { status: 200 };
  });
  const { pingSite } = loadTypescript('utils/sitePinger.ts');
  assert.equal((await pingSite('https://example.com')).accessible, true);
  assert.equal(fetch.mock.callCount(), 2);
});
