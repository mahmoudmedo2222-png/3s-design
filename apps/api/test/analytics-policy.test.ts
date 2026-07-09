import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { AnalyticsService, conversionRate } from '../src/analytics/analytics.service';

function createService() {
  const captured: unknown[] = [];
  const db = {
    insert() {
      return {
        values(value: unknown) {
          captured.push(value);
          return {
            returning() {
              return [{ id: 'analytics-event-id', createdAt: new Date('2026-07-08T00:00:00.000Z') }];
            },
          };
        },
      };
    },
  };
  const database = {
    requireDb() {
      return db;
    },
  };
  const jwt = {
    async verifyAsync() {
      throw new Error('invalid token');
    },
  };

  return {
    captured,
    service: new AnalyticsService(database as never, jwt as never),
  };
}

void test('analytics policy: accepts guest event and sanitizes payload values', async () => {
  const { captured, service } = createService();
  const result = await service.track({
    name: 'product_viewed',
    sessionId: 'session-test',
    path: '/products/demo',
    payload: {
      title: 'A'.repeat(220),
      nested: { unsafe: true },
      ok: true,
      score: 92,
    },
  });

  assert.equal(result.accepted, true);
  assert.equal(captured.length, 1);
  const stored = captured[0] as {
    userId: string | null;
    eventName: string;
    payload: Record<string, unknown>;
  };
  assert.equal(stored.userId, null);
  assert.equal(stored.eventName, 'product_viewed');
  assert.equal((stored.payload.title as string).length, 180);
  assert.equal(stored.payload.nested, null);
  assert.equal(stored.payload.ok, true);
  assert.equal(stored.payload.score, 92);
});

void test('analytics policy: rejects oversized payloads', async () => {
  const { service } = createService();

  await assert.rejects(
    () =>
      service.track({
        name: 'search_started',
        sessionId: 'session-test',
        path: '/search',
        payload: Object.fromEntries(Array.from({ length: 24 }, (_, index) => [`key-${index}-${'k'.repeat(100)}`, 'x'.repeat(180)])),
      }),
    BadRequestException,
  );
});

void test('analytics summary: conversion rate is rounded and zero-safe', () => {
  assert.equal(conversionRate(0, 0), 0);
  assert.equal(conversionRate(1, 3), 33.3);
  assert.equal(conversionRate(2, 4), 50);
});
