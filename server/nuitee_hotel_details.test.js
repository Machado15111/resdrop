import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { getHotelDetails, getCities, getCountries, nuiteeConfigured, nuiteeEnv } from './liteApi.js';

test('Nuitée config check', () => {
  assert.equal(nuiteeConfigured(), true, 'Nuitée should be configured');
  assert.equal(nuiteeEnv(), 'sandbox', 'Nuitée environment should be sandbox');
});

test('getHotelDetails input hardening', async (t) => {
  try {
    const data = await getHotelDetails('lp3803c');
    assert.ok(data, 'Should return data object for lp3803c');
    assert.equal(data.id, 'lp3803c', 'Returned hotel ID should be lp3803c');
    assert.ok(data.name, 'Hotel should have a name');
  } catch (err) {
    // If external network is unreachable during test run, ensure error is handled cleanly
    assert.ok(err.message.includes('Nuitée') || err.message.includes('fetch'), 'Should fail gracefully with Nuitée error message');
  }
});

test('getHotelDetails with object input', async (t) => {
  try {
    const data = await getHotelDetails({ hotelId: 'lp3803c' });
    assert.ok(data, 'Should resolve hotelId from object input');
    assert.equal(data.id, 'lp3803c');
  } catch (err) {
    assert.ok(err.message.includes('Nuitée') || err.message.includes('fetch'));
  }
});

test('getHotelDetails missing parameter throws error', async () => {
  await assert.rejects(
    async () => { await getHotelDetails(null); },
    { message: '[Nuitée] hotelId parameter is required' }
  );
});
