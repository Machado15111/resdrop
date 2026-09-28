import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { searchHotels, normalizeForSearch } from './hotelSearch.js';
import { hotels } from './hotels.js';

/**
 * The autocomplete behind both the booking form and the availability form.
 * The cases below are the ones that were actually broken in production.
 */

const CATALOG = [
  { name: 'Le Meurice', destination: 'Paris, Franca', stars: 5 },
  { name: 'Hotel Plaza Athenee', destination: 'Paris, Franca', stars: 5 },
  { name: 'Novotel Paris Centre Tour Eiffel', destination: 'Paris, Franca', stars: 4 },
  { name: 'Hotel Fasano Sao Paulo', destination: 'Sao Paulo, Brasil', stars: 5 },
  { name: 'Copacabana Palace', destination: 'Rio de Janeiro, Brasil', stars: 5 },
];

describe('normalizeForSearch', () => {
  test('folds case, accents and punctuation', () => {
    assert.equal(normalizeForSearch('Hôtel Shangri-La, FRANÇA'), 'hotel shangri la franca');
  });

  test('survives empty input', () => {
    assert.equal(normalizeForSearch(null), '');
    assert.equal(normalizeForSearch(''), '');
  });
});

describe('searchHotels', () => {
  test('a city name finds hotels that do not carry it in their name', () => {
    const names = searchHotels(CATALOG, 'paris').map(h => h.name);
    assert.ok(names.includes('Le Meurice'), 'Le Meurice is in Paris; the old name-only search missed it');
    assert.ok(names.includes('Hotel Plaza Athenee'));
    assert.ok(names.includes('Novotel Paris Centre Tour Eiffel'));
  });

  test('words may arrive in any order', () => {
    const byOrder = searchHotels(CATALOG, 'sao paulo fasano').map(h => h.name);
    assert.deepEqual(byOrder, ['Hotel Fasano Sao Paulo']);
  });

  test('every word must match — more words narrow the list', () => {
    assert.equal(searchHotels(CATALOG, 'paris').length, 3);
    assert.equal(searchHotels(CATALOG, 'paris meurice').length, 1);
    assert.equal(searchHotels(CATALOG, 'paris nonexistent').length, 0);
  });

  test('a name match outranks a city-only match', () => {
    const [first] = searchHotels(CATALOG, 'paris novotel');
    assert.equal(first.name, 'Novotel Paris Centre Tour Eiffel');
  });

  test('accents typed by the user still match the unaccented catalogue', () => {
    const names = searchHotels(CATALOG, 'são paulo').map(h => h.name);
    assert.deepEqual(names, ['Hotel Fasano Sao Paulo'], 'the catalogue spells it "Sao", the keyboard produces "São"');
  });

  test('an empty or whitespace query returns nothing, not everything', () => {
    assert.deepEqual(searchHotels(CATALOG, ''), []);
    assert.deepEqual(searchHotels(CATALOG, '   '), []);
  });

  test('a query nothing matches returns an empty list', () => {
    // citizenM is genuinely absent from the catalogue. The UI has to handle
    // this rather than pretend, which is why it must not throw or guess.
    assert.deepEqual(searchHotels(CATALOG, 'citizenm paris'), []);
  });

  test('junk input does not throw', () => {
    assert.deepEqual(searchHotels(null, 'paris'), []);
    assert.deepEqual(searchHotels([null, { destination: 'x' }], 'paris'), []);
  });

  test('the limit is respected', () => {
    assert.equal(searchHotels(CATALOG, 'a', 2).length <= 2, true);
  });
});

describe('against the real catalogue', () => {
  test('"paris" now returns more than the name-only search did', () => {
    const nameOnly = hotels.filter(h => h.name.toLowerCase().includes('paris')).length;
    const found = searchHotels(hotels, 'paris', 50).length;
    assert.ok(found > nameOnly, `expected the city search to beat name-only (${found} vs ${nameOnly})`);
  });

  test('a well-known hotel is reachable by name', () => {
    const names = searchHotels(hotels, 'copacabana palace').map(h => h.name);
    assert.ok(names.includes('Copacabana Palace'));
  });
});
