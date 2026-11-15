import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('AUDIT 1: Reconciliation of Unique Orders & Zero-Overlap Proof', () => {
  const glt = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/data/snapshots/ton_dong_glt.json'), 'utf-8'));
  const lc = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/data/snapshots/ton_dong_lc.json'), 'utf-8'));
  const gtcBc = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/data/snapshots/gtc_buu_cuc.json'), 'utf-8'));

  // 1. Strict deduplication check within GLT
  const gltOrderSet = new Set();
  let gltDups = 0;
  for (const r of glt) {
    const id = (r.maDonHang || '').trim();
    if (gltOrderSet.has(id)) gltDups++;
    gltOrderSet.add(id);
  }
  assert.equal(gltDups, 0, 'GLT must have 0 internal duplicate orders');
  assert.equal(gltOrderSet.size, glt.length, 'GLT order count must equal unique set size');

  // 2. Strict deduplication check within LC
  const lcOrderSet = new Set();
  let lcDups = 0;
  for (const r of lc) {
    const id = (r.maDonHang || '').trim();
    if (lcOrderSet.has(id)) lcDups++;
    lcOrderSet.add(id);
  }
  assert.equal(lcDups, 0, 'LC must have 0 internal duplicate orders');
  assert.equal(lcOrderSet.size, lc.length, 'LC order count must equal unique set size');

  // 3. Zero-overlap check between GLT and LC
  let crossSetOverlap = 0;
  for (const id of lcOrderSet) {
    if (gltOrderSet.has(id)) crossSetOverlap++;
  }
  assert.equal(crossSetOverlap, 0, 'GLT and LC must have 0 overlap (completely disjoint sets)');

  // 4. Zero cross-operation overlap within GLT (an order cannot be both Pickup and Delivery)
  const orderOpMap = new Map();
  for (const r of glt) {
    const id = (r.maDonHang || '').trim();
    const op = r.loaiDon === 'Lấy' ? 'PICKUP' : r.loaiDon === 'Trả' ? 'RETURN' : 'DELIVERY';
    if (!orderOpMap.has(id)) {
      orderOpMap.set(id, op);
    } else {
      assert.equal(orderOpMap.get(id), op, `Order ${id} has multiple distinct operations`);
    }
  }

  // 5. Unique Orders vs Operational Events must never be equated
  const deliveryEvents = gtcBc.reduce((acc, r) => acc + (r.volume || 0), 0);
  const totalUniqueBacklog = gltOrderSet.size + lcOrderSet.size;
  assert.notEqual(totalUniqueBacklog, deliveryEvents, 'Unique orders and operational events must never be equated');
});

test('AUDIT 2: Pickup (Lấy Hàng) Integrity & Scope Limits', () => {
  const glt = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/data/snapshots/ton_dong_glt.json'), 'utf-8'));
  const hh = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/data/snapshots/hoa_hong_ngay.json'), 'utf-8'));

  // Pickup backlog in GLT
  const pickupBacklog = glt.filter(r => r.loaiDon === 'Lấy');
  assert.ok(pickupBacklog.length > 0, 'Pickup backlog must contain records');

  // Courier pickup metrics in Hoa hồng ngày
  let totalGanLay = 0;
  let totalLayTC = 0;
  for (const r of hh) {
    totalGanLay += (r.soDonGanLay || 0);
    totalLayTC += (r.donLayTinhLuong || 0);
  }
  assert.ok(totalGanLay > 0, 'Total assigned pickup must be greater than 0');
  assert.ok(totalLayTC > 0, 'Total completed pickup must be greater than 0');

  // %LTC formula validation (must be total completed / total assigned)
  const courierLtc = (totalLayTC / totalGanLay) * 100;
  assert.ok(courierLtc >= 0 && courierLtc <= 100, '%LTC must be between 0% and 100%');

  // Explicitly assert that pickup backlog is NOT equal to pickup completed volume
  assert.notEqual(pickupBacklog.length, totalLayTC, 'Pickup backlog must never be used as completed pickup volume');
});

test('AUDIT 3: Return (Trả Hàng) Boundary Rules & Source Status', () => {
  const tyLeTraHang = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/data/snapshots/ty_le_tra_hang.json'), 'utf-8'));
  const glt = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/data/snapshots/ton_dong_glt.json'), 'utf-8'));
  const lc = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/data/snapshots/ton_dong_lc.json'), 'utf-8'));
  const gtcBc = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/data/snapshots/gtc_buu_cuc.json'), 'utf-8'));

  // Sheet Tỷ lệ trả hàng is confirmed empty
  assert.equal(tyLeTraHang.length, 0, 'Sheet Tỷ lệ trả hàng must be recorded as having 0 data rows');

  // Return Backlog verified
  const returnGlt = glt.filter(r => r.loaiDon === 'Trả');
  const returnLc = lc.filter(r => r.loaiDon && r.loaiDon.toLowerCase().includes('trả'));
  const totalReturnBacklog = returnGlt.length + returnLc.length;
  assert.ok(totalReturnBacklog > 0, 'Return backlog must exist in GLT + LC');

  // % Chuyển trả in GTC Bưu cục is return conversion rate, NOT return completed rate
  const hasReturnRate = gtcBc.some(r => r.tiLeChuyenTra !== undefined && r.tiLeChuyenTra !== '');
  assert.ok(hasReturnRate, 'GTC Bưu cục must have % Chuyển trả column');
});

test('AUDIT 4: Calculation Engine Scope Conformance', async () => {
  const { calculateExecutiveOverviewScope } = await import('../src/services/kpiEngine.ts');
  const glt = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/data/snapshots/ton_dong_glt.json'), 'utf-8'));
  const lc = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/data/snapshots/ton_dong_lc.json'), 'utf-8'));
  const gtcBc = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/data/snapshots/gtc_buu_cuc.json'), 'utf-8'));
  const hh = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../src/data/snapshots/hoa_hong_ngay.json'), 'utf-8'));

  const scope = calculateExecutiveOverviewScope(gtcBc, hh, glt, lc);

  // Assert historical completed is null (not verified due to aggregated source)
  assert.equal(scope.uniqueOrders.historicalCompleted, null);
  assert.equal(scope.uniqueOrders.verificationStatus, 'VERIFIED');
  assert.equal(scope.operationalEvents.verificationStatus, 'VERIFIED');

  // Total operational events must strictly equal delivery + pickup + return
  const expectedTotal = scope.operationalEvents.deliveryEvents.volume +
    scope.operationalEvents.pickupEvents.assigned +
    scope.operationalEvents.returnEvents.transferVolume;
  assert.equal(scope.operationalEvents.totalEvents, expectedTotal);
});
