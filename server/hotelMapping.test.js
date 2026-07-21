import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize, nameSimilarity, scoreCandidate } from './hotelMapping.js';

test('normalize strips accents and boilerplate', () => {
  assert.equal(normalize('Hotel Fasano São Paulo'), 'fasano sao paulo');
  assert.equal(normalize('The Copacabana Palace'), 'copacabana palace');
});

test('nameSimilarity: same hotel high, different hotel low', () => {
  assert.ok(nameSimilarity('Copacabana Palace', 'Belmond Copacabana Palace') > 0.6);
  assert.ok(nameSimilarity('Fasano São Paulo', 'Copacabana Palace') < 0.2);
});

test('scoreCandidate: exact name + city ranks high; wrong hotel low', () => {
  const reservation = { hotelName: 'Hotel Fasano São Paulo', city: 'São Paulo' };
  const good = scoreCandidate(reservation, { name: 'Fasano Sao Paulo', city: 'Sao Paulo' });
  const bad = scoreCandidate(reservation, { name: 'Ibis Budget Congonhas', city: 'Sao Paulo' });
  assert.ok(good >= 0.85, `expected high, got ${good}`);
  assert.ok(bad < 0.6, `expected low, got ${bad}`);
});
