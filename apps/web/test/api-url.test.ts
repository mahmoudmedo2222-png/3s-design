import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveApiBaseUrl } from '../lib/api';

void test('resolveApiBaseUrl: uses configured public URL first', () => {
  assert.equal(resolveApiBaseUrl({ configuredUrl: 'https://api.example.com/api' }), 'https://api.example.com/api');
});

void test('resolveApiBaseUrl: resolves browser host to API port', () => {
  assert.equal(resolveApiBaseUrl({ windowLocation: { protocol: 'http:', hostname: '192.168.8.244' } }), 'http://192.168.8.244:4000/api');
});

void test('resolveApiBaseUrl: server-side default is localhost API', () => {
  assert.equal(resolveApiBaseUrl({}), 'http://localhost:4000/api');
});
