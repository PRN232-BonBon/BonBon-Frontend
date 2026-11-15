import test from 'node:test';
import assert from 'node:assert/strict';
import { getRejectedRegistration, registerVehicle } from '../src/owner/owner-api.ts';
import { fuelLabel } from '../src/vehicles/fuel-label.ts';

const session = { accessToken: 'synthetic-token', account: { accountId: 'owner-test' } };
const vehicle = '20000000-0000-0000-0000-000000000003';

test('resubmission reads the owner-only rejected registration', async context => {
  context.mock.method(globalThis, 'fetch', async (url, init) => {
    assert.equal(url, `/api/vehicles/registrations/${vehicle}/rejected`);
    assert.equal(init.headers.Authorization, 'Bearer synthetic-token');
    return Response.json({ vehicleId: vehicle, imageUrls: ['/api/vehicles/images/id'], rejectionReason: 'Ảnh mờ' });
  });
  const result = await getRejectedRegistration(session, vehicle);
  assert.equal(result.rejectionReason, 'Ảnh mờ');
  assert.equal(result.imageUrls[0], '/api/vehicles/images/id');
});

test('resubmission sends metadata and no image files when keeping current images', async context => {
  context.mock.method(globalThis, 'fetch', async (url, init) => {
    assert.equal(url, `/api/vehicles/registrations/${vehicle}/resubmit`);
    assert.equal(init.method, 'POST');
    assert.equal(init.headers.Authorization, 'Bearer synthetic-token');
    assert.equal(JSON.parse(init.body.get('metadata')).plateNumber, 'TEST-001');
    assert.equal(init.body.getAll('vehicleImages').length, 0);
    return Response.json({ vehicleId: vehicle, status: 'PendingApproval', imageCount: 2 });
  });
  assert.equal((await registerVehicle(session, { plateNumber: 'TEST-001' }, [], vehicle)).status, 'PendingApproval');
});

test('all supported fuels have distinct, accurate labels', () => {
  assert.equal(fuelLabel('Gasoline'), 'Xăng'); assert.equal(fuelLabel('Diesel'), 'Dầu diesel');
  assert.equal(fuelLabel('Electric'), 'Điện'); assert.equal(fuelLabel('Hybrid'), 'Xăng và điện');
  assert.equal(fuelLabel('unknown'), 'Chưa cập nhật');
});
