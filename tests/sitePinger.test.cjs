const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadTypescript } = require('./loadTypescript.cjs');

function loadPinger(nativeProbe = null, os = 'android') {
  return loadTypescript('utils/sitePinger.ts', {
    expo: {
      requireOptionalNativeModule: (name) => {
        assert.notEqual(os, 'web');
        assert.equal(name, 'SiteProbe');
        return nativeProbe;
      },
    },
    'react-native': { Platform: { OS: os } },
  });
}

test('all failed ping attempts release their timers', async (t) => {
  const active = new Set();
  t.mock.method(global, 'setTimeout', () => { const id = {}; active.add(id); return id; });
  t.mock.method(global, 'clearTimeout', (id) => active.delete(id));
  const fetch = t.mock.method(global, 'fetch', async () => { throw new Error('offline'); });
  const { pingSite } = loadPinger();
  const result = await pingSite('https://example.com');
  assert.equal(result.accessible, false);
  assert.equal(fetch.mock.callCount(), 3);
  assert.equal(active.size, 0);
});

test('missing favicon still counts as a reachable site', async (t) => {
  t.mock.method(global, 'fetch', async () => ({ status: 404 }));
  const { pingSite } = loadPinger();
  assert.equal((await pingSite('https://example.com')).accessible, true);
});

test('fallback request preserves reachability after favicon network error', async (t) => {
  const fetch = t.mock.method(global, 'fetch', async (_url, options) => {
    if (options.method === 'GET') throw new Error('favicon unavailable');
    return { status: 200 };
  });
  const { pingSite } = loadPinger();
  assert.equal((await pingSite('https://example.com')).accessible, true);
  assert.equal(fetch.mock.callCount(), 2);
});

for (const os of ['android', 'ios']) {
  test(`${os} uses the certificate-tolerant native probe instead of failing fetch`, async (t) => {
    const fetch = t.mock.method(global, 'fetch', async () => {
      throw new TypeError('Network request failed');
    });
    const requests = [];
    const { pingSite } = loadPinger({
      requestStatus: async (...args) => { requests.push(args); return 200; },
    }, os);
    const result = await pingSite('https://self-signed.example/path');
    assert.equal(result.accessible, true);
    assert.equal(result.url, 'https://self-signed.example/path');
    assert.ok(result.responseTime >= 0);
    assert.deepEqual(requests, [['https://self-signed.example/favicon.ico', 'GET', 5000]]);
    assert.equal(fetch.mock.callCount(), 0);
  });
}

test('native failures retry favicon GET, page HEAD and page GET without downgrading HTTPS', async () => {
  const requests = [];
  const { pingSite } = loadPinger({
    requestStatus: async (...args) => {
      requests.push(args);
      if (requests.length < 3) throw new Error('connection reset');
      return 200;
    },
  });
  assert.equal((await pingSite('https://example.com/path')).accessible, true);
  assert.deepEqual(requests, [
    ['https://example.com/favicon.ico', 'GET', 5000],
    ['https://example.com/path', 'HEAD', 5000],
    ['https://example.com/path', 'GET', 5000],
  ]);
});

test('native timeouts and network errors do not count as reachability', async () => {
  let attempts = 0;
  const { pingSite } = loadPinger({
    requestStatus: async () => { attempts++; throw new Error('timeout'); },
  });
  assert.equal((await pingSite('https://example.com')).accessible, false);
  assert.equal(attempts, 3);
});

test('native HTTP statuses include redirects as proof of reachability', async () => {
  for (const [status, accessible] of [[200, true], [302, true], [307, true], [404, true], [500, false], [0, false]]) {
    const { pingSite } = loadPinger({ requestStatus: async () => status });
    assert.equal((await pingSite('https://example.com')).accessible, accessible);
  }
});

test('a real redirect loop is reachable without following the loop', async (t) => {
  const { createServer } = require('node:http');
  let requests = 0;
  const server = createServer((_request, response) => {
    requests++;
    response.writeHead(307, { Location: '/favicon.ico?__rr=1' });
    response.end();
  });
  t.after(() => new Promise((resolve) => {
    server.closeAllConnections();
    server.close(resolve);
  }));
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const { pingSite } = loadPinger();
  assert.equal((await pingSite(`http://127.0.0.1:${server.address().port}`)).accessible, true);
  assert.equal(requests, 1);
});

test('browser manual redirects are reachable even though their status is hidden', async (t) => {
  t.mock.method(global, 'fetch', async (_url, options) => {
    assert.equal(options.redirect, 'manual');
    return { status: 0, type: 'opaqueredirect' };
  });
  const { pingSite } = loadPinger(null, 'web');
  assert.equal((await pingSite('https://example.com')).accessible, true);
});

test('an opaque response without redirect evidence is not treated as success', async (t) => {
  t.mock.method(global, 'fetch', async () => ({ status: 0, type: 'opaque' }));
  const { pingSite } = loadPinger(null, 'web');
  assert.equal((await pingSite('https://example.com')).accessible, false);
});

test('web uses browser fetch without loading native code or pretending TLS failures succeeded', async (t) => {
  const fetch = t.mock.method(global, 'fetch', async () => {
    throw new TypeError('Failed to fetch');
  });
  const { pingSite } = loadPinger(null, 'web');
  assert.equal((await pingSite('https://self-signed.example')).accessible, false);
  assert.equal(fetch.mock.callCount(), 3);
});

test('iOS probe config enables manual trust without keys that override the ATS setting', () => {
  const plugin = loadTypescript('plugins/withSiteProbe.js', {
    'expo/config-plugins': { withInfoPlist: (config, action) => action(config) },
  });
  const result = plugin({ modResults: {
    Unrelated: 'preserved',
    NSAppTransportSecurity: { NSAllowsLocalNetworking: true, NSAllowsArbitraryLoadsInWebContent: false },
  } });
  assert.equal(result.modResults.Unrelated, 'preserved');
  assert.deepEqual(result.modResults.NSAppTransportSecurity, { NSAllowsArbitraryLoads: true });
  assert.deepEqual(plugin(result), result);
});
