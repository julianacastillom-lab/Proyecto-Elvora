import test from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_DATA } from '../data/demoData';
import {
  calculateOrderCapacityAndTime,
  computeDashboardKPIs,
  computeQualityMetrics,
  deductOrderMaterialsFromInventory,
  evaluateOrderMaterials,
  findSuppliersForMaterial,
  generateDataGroundedAnalysis,
  getLowStockItems,
  runBusinessSimulation,
} from './calculations';

test('getLowStockItems identifies materials at or below minimum stock', () => {
  const low = getLowStockItems(DEMO_DATA.inventory);
  const codes = low.map((i) => i.code);
  assert.ok(codes.includes('TEL-002'));
  assert.ok(codes.includes('HIL-001'));
  assert.ok(codes.includes('OTR-001'));
  assert.equal(codes.includes('TEL-001'), false);
});

test('findSuppliersForMaterial matches suppliers supplying a given low-stock material', () => {
  const gabardina = DEMO_DATA.inventory.find((i) => i.code === 'TEL-002')!;
  const matches = findSuppliersForMaterial(gabardina, DEMO_DATA.suppliers);
  assert.equal(matches.length, 2);
  assert.equal(matches[0].supplier.company, 'Textiles del Valle S.A.S.');
  assert.equal(matches[0].price, 35500);
});

test('computeQualityMetrics calculates approval, defect, and reprocess percentages accurately', () => {
  const qc = computeQualityMetrics(DEMO_DATA.inspections);
  // 25 + 40 + 20 = 85 inspected; 23 + 37 + 18 = 78 approved; 2 + 3 + 2 = 7 defective; 2 + 2 + 1 = 5 reprocessed
  assert.equal(qc.totalInspected, 85);
  assert.equal(qc.totalApproved, 78);
  assert.equal(qc.totalDefective, 7);
  assert.equal(qc.totalReprocessed, 5);
  assert.equal(qc.approvalPct, 91.8);
  assert.equal(qc.defectPct, 8.2);
  assert.equal(qc.reprocessPct, 5.9);
});

test('deductOrderMaterialsFromInventory blocks deduction when shortages exist and succeeds when stock suffices', () => {
  // ord-4 requires 65m of inv-2 (Gabardina), only 38m available
  const orderWithShortage = DEMO_DATA.orders.find((o) => o.id === 'ord-4')!;
  const blocked = deductOrderMaterialsFromInventory(orderWithShortage, DEMO_DATA.inventory);
  assert.equal(blocked.deducted, false);
  assert.ok(blocked.shortages.some((s) => s.itemCode === 'TEL-002' && s.shortage === 27));

  // ord-3 requires 45m of inv-3 (95 avail), 5 cones inv-4 (22 avail), 210 buttons inv-5 (480 avail)
  const orderSufficient = DEMO_DATA.orders.find((o) => o.id === 'ord-3')!;
  const evalOk = evaluateOrderMaterials(orderSufficient, DEMO_DATA.inventory);
  assert.equal(evalOk.hasShortage, false);

  const deducted = deductOrderMaterialsFromInventory(orderSufficient, DEMO_DATA.inventory);
  assert.equal(deducted.deducted, true);
  const updatedPopelina = deducted.updatedInventory.find((i) => i.id === 'inv-3')!;
  assert.equal(updatedPopelina.quantity, 50);
});

test('calculateOrderCapacityAndTime computes hours, daily capacity, and schedule compliance', () => {
  const order = DEMO_DATA.orders.find((o) => o.id === 'ord-3')!;
  // 30 garments * 50 min = 1500 min = 25 hours. 6 operators * 8h = 48h/day -> < 1 day
  const cap = calculateOrderCapacityAndTime(order, 6, 8);
  assert.equal(cap.totalHoursRequired, 25);
  assert.equal(cap.dailyCapacity, 57);
  assert.equal(cap.onSchedule, true);
});

test('runBusinessSimulation computes capacity, shortages, and quality projections deterministically', () => {
  const sim = runBusinessSimulation(
    {
      requestedGarments: 100,
      operators: 5,
      workHoursPerDay: 8,
      manufacturingMinutesPerGarment: 60,
      materialAvailabilityPct: 100,
      expectedDefectPct: 5,
      horizonDays: 5,
    },
    DEMO_DATA.inventory
  );

  // 5 operators * 8h * 60m / 60m = 40 units/day -> 200 units capacity in 5 days
  assert.equal(sim.dailyCapacityUnits, 40);
  assert.equal(sim.horizonCapacityUnits, 200);
  assert.equal(sim.requiredDays, 2.5);
  // Material constraint: Entretela (inv-6) has 28m, at 0.5m/garment supports max 56 garments; buttons 480/5 = 96; threads 22/0.2 = 110
  assert.equal(sim.estimatedUnitsProduced, 56);
  assert.equal(sim.fulfillmentPct, 56);
  assert.ok(sim.totalMaterialShortageUnits > 0);
});

test('computeDashboardKPIs and generateDataGroundedAnalysis reflect exact recorded metrics', () => {
  const kpis = computeDashboardKPIs(DEMO_DATA);
  assert.equal(kpis.totalProducedUnits, 65); // ord-1 (40) + ord-5 (25)
  assert.equal(kpis.strategicClientsCount, 2);
  assert.equal(kpis.lowStockCount, 3);

  const recs = generateDataGroundedAnalysis(DEMO_DATA);
  assert.ok(recs.length >= 4);
  assert.ok(recs.some((r) => r.area === 'Inventario' && r.evidence.includes('3 ítems')));
  assert.ok(recs.some((r) => r.area === 'Calidad' && r.evidence.includes('85 prendas inspeccionadas')));
});
