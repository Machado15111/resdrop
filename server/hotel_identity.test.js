// Guards hotel IDENTITY matching — the check that decides whether a rate we
// found belongs to the property the guest actually booked.
//
// Production defect this locks out: a USD search for "Hôtel Juliana Cannes"
// returned Regent Carlton Cannes at $3,429/night, and the matcher accepted it
// because the two names share exactly one token — "cannes". The old rule was
// "if the shorter name has ≤2 significant words, any single overlap wins", and
// the stopword list only knew a handful of (mostly Brazilian) cities, so every
// other city name counted as identity evidence. The guest saw a different
// hotel's $61,729 presented as their own reservation.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isHotelNameMatch } from './serpApi.js';

const CANNES = { destination: 'Cannes, France' };

test('rejects a different hotel that only shares the city (production bug)', () => {
  assert.equal(
    isHotelNameMatch('Regent Carlton Cannes', 'Hôtel Juliana Cannes', CANNES), false);
  // …and still rejects it when we have no destination context to lean on.
  assert.equal(
    isHotelNameMatch('Regent Carlton Cannes', 'Hôtel Juliana Cannes'), false);
});

test('rejects other same-city neighbours', () => {
  for (const other of [
    'Hôtel Martinez - The Unbound Collection by Hyatt',
    'Hotel Barrière Le Majestic Cannes',
    'Five Seas Hotel Cannes',
  ]) {
    assert.equal(isHotelNameMatch(other, 'Hôtel Juliana Cannes', CANNES), false, other);
  }
});

test('still accepts the same hotel across naming variants', () => {
  // How Google actually spells it back to us.
  assert.equal(isHotelNameMatch('JULIANA Hôtel Cannes', 'Hôtel Juliana Cannes', CANNES), true);
  assert.equal(isHotelNameMatch('Hotel Juliana', 'Hôtel Juliana Cannes', CANNES), true);
  assert.equal(isHotelNameMatch('Juliana Hotel Cannes', 'Hôtel Juliana Cannes'), true);
});

test('still accepts known good matches from other cities', () => {
  assert.equal(isHotelNameMatch('Hotel Fasano Rio de Janeiro', 'Fasano Rio'), true);
  assert.equal(
    isHotelNameMatch('Belmond Copacabana Palace', 'Copacabana Palace'), true);
  assert.equal(
    isHotelNameMatch('Hôtel Juliana Cannes', 'Hôtel Juliana Cannes'), true);
});

test('a city token alone can never carry a match', () => {
  // Both reduce to nothing but geography — not the same property.
  assert.equal(isHotelNameMatch('Cannes Riviera Hotel', 'Cannes Beach Hotel', CANNES), false);
});
