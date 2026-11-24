import {
  AppStoreData,
  Client,
  DashboardKPIs,
  GroundedRecommendation,
  InventoryItem,
  ProductionOrder,
  QualityInspection,
  SimulationParams,
  SimulationResult,
  Supplier,
} from '../types/elvora';

export function getLowStockItems(inventory: InventoryItem[]): InventoryItem[] {
  return inventory.filter((item) => item.quantity <= item.minStock);
}

export function findSuppliersForMaterial(
  item: InventoryItem,
  suppliers: Supplier[]
): Array<{ supplier: Supplier; price: number; unit: string }> {
  const matches: Array<{ supplier: Supplier; price: number; unit: string }> = [];
  const itemCodeUpper = item.code.trim().toUpperCase();
  const itemNameLower = item.name.trim().toLowerCase();

  for (const supplier of suppliers) {
    const found = supplier.materialsSupplied.find(
      (m) =>
        m.materialCode.trim().toUpperCase() === itemCodeUpper ||
        m.materialName.trim().toLowerCase() === itemNameLower
    );
    if (found) {
      matches.push({
        supplier,
        price: found.price,
        unit: found.unit,
      });
    }
  }

  return matches.sort((a, b) => a.price - b.price || a.supplier.deliveryDays - b.supplier.deliveryDays);
}

export function computeQualityMetrics(inspections: QualityInspection[]): {
  totalInspected: number;
  totalApproved: number;
  totalDefective: number;
  totalReprocessed: number;
  approvalPct: number;
  defectPct: number;
  reprocessPct: number;
} {
  const totalInspected = inspections.reduce((sum, i) => sum + i.inspected, 0);
  const totalApproved = inspections.reduce((sum, i) => sum + i.approved, 0);
  const totalDefective = inspections.reduce((sum, i) => sum + i.defective, 0);
  const totalReprocessed = inspections.reduce((sum, i) => sum + i.reprocessed, 0);

  if (totalInspected === 0) {
    return {
      totalInspected: 0,
      totalApproved: 0,
      totalDefective: 0,
      totalReprocessed: 0,
      approvalPct: 0,
      defectPct: 0,
      reprocessPct: 0,
    };
  }

  return {
    totalInspected,
    totalApproved,
    totalDefective,
    totalReprocessed,
    approvalPct: Number(((totalApproved / totalInspected) * 100).toFixed(1)),
    defectPct: Number(((totalDefective / totalInspected) * 100).toFixed(1)),
    reprocessPct: Number(((totalReprocessed / totalInspected) * 100).toFixed(1)),
  };
}

export interface MaterialEvaluation {
  itemId: string;
  itemCode: string;
  itemName: string;
  unit: string;
  required: number;
  available: number;
  shortage: number;
  isShort: boolean;
}

export function evaluateOrderMaterials(
  order: Pick<ProductionOrder, 'materials' | 'materialsDeducted'>,
  inventory: InventoryItem[]
): {
  items: MaterialEvaluation[];
  hasShortage: boolean;
  totalShortageUnits: number;
} {
  const items: MaterialEvaluation[] = order.materials.map((req) => {
    const inv = inventory.find((i) => i.id === req.itemId);
    const available = inv ? inv.quantity : 0;
    const shortage = order.materialsDeducted ? 0 : Math.max(0, req.quantityRequired - available);

    return {
      itemId: req.itemId,
      itemCode: inv?.code ?? 'N/A',
      itemName: inv?.name ?? 'Material eliminado',
      unit: inv?.unit ?? 'und',
      required: req.quantityRequired,
      available,
      shortage,
      isShort: shortage > 0,
    };
  });

  const totalShortageUnits = items.reduce((sum, i) => sum + i.shortage, 0);
  return {
    items,
    hasShortage: totalShortageUnits > 0,
    totalShortageUnits,
  };
}

export function calculateOrderCapacityAndTime(
  order: Pick<ProductionOrder, 'quantity' | 'minutesPerGarment' | 'startDate' | 'dueDate'>,
  operators = 6,
  hoursPerDay = 8
): {
  totalHoursRequired: number;
  estimatedDays: number;
  dailyCapacity: number;
  availableDays: number;
  onSchedule: boolean;
} {
  const safeOperators = Math.max(1, operators);
  const safeHours = Math.max(1, hoursPerDay);
  const safeMinutes = Math.max(1, order.minutesPerGarment);

  const totalMinutes = order.quantity * safeMinutes;
  const totalHoursRequired = Number((totalMinutes / 60).toFixed(1));
  const dailyCapacityMinutes = safeOperators * safeHours * 60;
  const dailyCapacity = Math.floor(dailyCapacityMinutes / safeMinutes);
  const estimatedDays = Number((totalMinutes / dailyCapacityMinutes).toFixed(1));

  const start = new Date(order.startDate);
  const due = new Date(order.dueDate);
  const diffMs = due.getTime() - start.getTime();
  const availableDays = Number.isFinite(diffMs) ? Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24))) : 1;

  return {
    totalHoursRequired,
    estimatedDays,
    dailyCapacity,
    availableDays,
    onSchedule: estimatedDays <= availableDays,
  };
}

export function deductOrderMaterialsFromInventory(
  order: ProductionOrder,
  inventory: InventoryItem[]
): {
  updatedInventory: InventoryItem[];
  deducted: boolean;
  shortages: MaterialEvaluation[];
} {
  if (order.materialsDeducted) {
    return { updatedInventory: inventory, deducted: true, shortages: [] };
  }

  const evalResult = evaluateOrderMaterials(order, inventory);
  if (evalResult.hasShortage) {
    return {
      updatedInventory: inventory,
      deducted: false,
      shortages: evalResult.items.filter((i) => i.isShort),
    };
  }

  const updatedInventory = inventory.map((item) => {
    const req = order.materials.find((m) => m.itemId === item.id);
    if (!req) return item;
    return {
      ...item,
      quantity: Math.max(0, Number((item.quantity - req.quantityRequired).toFixed(2))),
    };
  });

  return {
    updatedInventory,
    deducted: true,
    shortages: [],
  };
}

export function getClientFollowUpAlerts(
  clients: Client[],
  referenceDateStr: string
): Array<{
  client: Client;
  daysUntil: number;
  urgency: 'Vencido' | 'Próximo' | 'Programado';
}> {
  const refTime = new Date(referenceDateStr).getTime();

  return clients
    .filter((c) => c.category === 'Estratégico' || c.category === 'Potencial' || c.nextFollowUpDate)
    .map((client) => {
      const targetTime = new Date(client.nextFollowUpDate).getTime();
      const daysUntil = Number.isFinite(targetTime)
        ? Math.ceil((targetTime - refTime) / (1000 * 60 * 60 * 24))
        : 999;

      let urgency: 'Vencido' | 'Próximo' | 'Programado' = 'Programado';
      if (daysUntil < 0) urgency = 'Vencido';
      else if (daysUntil <= 3) urgency = 'Próximo';

      return { client, daysUntil, urgency };
    })
    .filter((a) => a.client.category === 'Estratégico' || a.client.category === 'Potencial' || a.daysUntil <= 5)
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

export function computeDashboardKPIs(data: AppStoreData): DashboardKPIs {
  const completedOrders = data.orders.filter((o) => o.status === 'Completado');
  const pendingOrders = data.orders.filter((o) => o.status === 'Pendiente' || o.status === 'Retrasado');
  const inProgressOrders = data.orders.filter((o) => o.status === 'En proceso');

  const totalProducedUnits = completedOrders.reduce((sum, o) => sum + o.quantity, 0);
  const totalInventoryUnits = data.inventory.reduce((sum, i) => sum + i.quantity, 0);
  const inventoryValue = data.inventory.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);
  const lowStockCount = getLowStockItems(data.inventory).length;
  const strategicClientsCount = data.clients.filter((c) => c.category === 'Estratégico').length;
  const quality = computeQualityMetrics(data.inspections);

  return {
    totalProducedUnits,
    totalInventoryUnits,
    inventoryValue,
    lowStockCount,
    totalSuppliers: data.suppliers.length,
    totalClients: data.clients.length,
    strategicClientsCount,
    pendingOrdersCount: pendingOrders.length,
    inProgressOrdersCount: inProgressOrders.length,
    completedOrdersCount: completedOrders.length,
    qualityApprovalPct: quality.approvalPct,
    qualityDefectPct: quality.defectPct,
    qualityReprocessPct: quality.reprocessPct,
  };
}

export function runBusinessSimulation(
  params: SimulationParams,
  inventory: InventoryItem[]
): SimulationResult {
  const safeRequested = Math.max(1, params.requestedGarments);
  const safeOperators = Math.max(1, params.operators);
  const safeHours = Math.max(1, params.workHoursPerDay);
  const safeMinutes = Math.max(1, params.manufacturingMinutesPerGarment);
  const safeHorizon = Math.max(1, params.horizonDays);
  const safeMatAvailPct = Math.min(100, Math.max(0, params.materialAvailabilityPct));
  const safeDefectPct = Math.min(100, Math.max(0, params.expectedDefectPct));

  const dailyCapacityUnits = Math.floor((safeOperators * safeHours * 60) / safeMinutes);
  const horizonCapacityUnits = dailyCapacityUnits * safeHorizon;
  const requiredDays = dailyCapacityUnits > 0 ? Number((safeRequested / dailyCapacityUnits).toFixed(1)) : 999;

  // Material model per average garment: 1.5m main fabric, 0.25 cones thread, 5 buttons, 0.5m interlining
  const mainFabricAvailable = inventory
    .filter((i) => i.category === 'Telas')
    .reduce((sum, i) => sum + i.quantity, 0);
  const threadAvailable = inventory
    .filter((i) => i.category === 'Hilos')
    .reduce((sum, i) => sum + i.quantity, 0);
  const buttonsAvailable = inventory
    .filter((i) => i.category === 'Botones')
    .reduce((sum, i) => sum + i.quantity, 0);
  const otherAvailable = inventory
    .filter((i) => i.category === 'Otros materiales')
    .reduce((sum, i) => sum + i.quantity, 0);

  const availFactor = safeMatAvailPct / 100;

  const bomSpecs = [
    { materialName: 'Telas principales', unit: 'm', perGarment: 1.5, stock: mainFabricAvailable },
    { materialName: 'Hilos de confección', unit: 'conos', perGarment: 0.2, stock: threadAvailable },
    { materialName: 'Botonería y avíos', unit: 'und', perGarment: 5, stock: buttonsAvailable },
    { materialName: 'Entretelas y complementos', unit: 'm', perGarment: 0.5, stock: otherAvailable },
  ];

  const materialsRequired = bomSpecs.map((spec) => {
    const required = Number((safeRequested * spec.perGarment).toFixed(1));
    // Effective available reflects registered inventory scaled by user-simulated material availability factor
    const effectiveStock = Number((spec.stock * availFactor).toFixed(1));
    const shortage = Math.max(0, Number((required - effectiveStock).toFixed(1)));
    return {
      materialName: spec.materialName,
      unit: spec.unit,
      required,
      available: effectiveStock,
      shortage,
    };
  });

  // Maximum garments supportable by materials
  const maxUnitsByMaterial = Math.floor(
    Math.min(
      ...materialsRequired.map((m, idx) => m.available / bomSpecs[idx].perGarment)
    )
  );

  const estimatedUnitsProduced = Math.max(
    0,
    Math.min(safeRequested, horizonCapacityUnits, maxUnitsByMaterial)
  );
  const unitsPendingShortfall = Math.max(0, safeRequested - estimatedUnitsProduced);
  const fulfillmentPct = Number(((estimatedUnitsProduced / safeRequested) * 100).toFixed(1));

  const projectedDefective = Math.round(estimatedUnitsProduced * (safeDefectPct / 100));
  const projectedApproved = Math.max(0, estimatedUnitsProduced - projectedDefective);
  const projectedReprocessed = Math.round(projectedDefective * 0.7);
  const projectedApprovalPct =
    estimatedUnitsProduced > 0
      ? Number(((projectedApproved / estimatedUnitsProduced) * 100).toFixed(1))
      : 0;

  const totalMaterialShortageUnits = materialsRequired.reduce((sum, m) => sum + m.shortage, 0);

  let bottleneck = 'Operación equilibrada dentro del horizonte';
  if (maxUnitsByMaterial < safeRequested && maxUnitsByMaterial <= horizonCapacityUnits) {
    const shortMat = materialsRequired.find((m) => m.shortage > 0);
    bottleneck = shortMat
      ? `Faltante de ${shortMat.materialName} (${shortMat.shortage} ${shortMat.unit})`
      : 'Disponibilidad insuficiente de materiales';
  } else if (horizonCapacityUnits < safeRequested) {
    bottleneck = `Capacidad de planta insuficiente (${horizonCapacityUnits} und vs ${safeRequested} solicitadas en ${safeHorizon} días)`;
  } else if (safeDefectPct > 5) {
    bottleneck = `Tasa de defectos elevada (${safeDefectPct}%) reduce entrega neta aprobada`;
  }

  return {
    dailyCapacityUnits,
    horizonCapacityUnits,
    requiredDays,
    fulfillmentPct,
    estimatedUnitsProduced,
    unitsPendingShortfall,
    materialsRequired,
    totalMaterialShortageUnits,
    projectedApproved,
    projectedDefective,
    projectedReprocessed,
    projectedApprovalPct,
    bottleneck,
  };
}

export function generateDataGroundedAnalysis(data: AppStoreData): GroundedRecommendation[] {
  const recommendations: GroundedRecommendation[] = [];
  const kpis = computeDashboardKPIs(data);
  const lowStock = getLowStockItems(data.inventory);
  const quality = computeQualityMetrics(data.inspections);

  // 1. Inventario & Proveedores (strictly grounded in actual SKUs & suppliers)
  if (lowStock.length > 0) {
    const details = lowStock
      .map((item) => {
        const sups = findSuppliersForMaterial(item, data.suppliers);
        const bestSup = sups[0];
        return bestSup
          ? `${item.name} (${item.quantity}/${item.minStock} ${item.unit}, proveedor sugerido: ${bestSup.supplier.company} a $${bestSup.price.toLocaleString('es-CO')} / ${bestSup.supplier.deliveryDays} días)`
          : `${item.name} (${item.quantity}/${item.minStock} ${item.unit}, sin proveedor asignado)`;
      })
      .join('; ');

    recommendations.push({
      id: 'rec-inv-low',
      area: 'Inventario',
      priority: 'Alta',
      title: `Reposición urgente en ${lowStock.length} material(es) bajo stock mínimo`,
      evidence: `Registros actuales detectan ${lowStock.length} ítems en nivel crítico: ${details}.`,
      recommendation:
        'Emitir órdenes de compra inmediatas a los proveedores con menor tiempo de entrega y verificar cobertura antes de liberar nuevas órdenes pendientes.',
    });
  } else {
    recommendations.push({
      id: 'rec-inv-ok',
      area: 'Inventario',
      priority: 'Informativa',
      title: 'Niveles de inventario sobre el stock mínimo',
      evidence: `Los ${data.inventory.length} ítems registrados superan su umbral mínimo (${kpis.totalInventoryUnits} unidades totales).`,
      recommendation:
        'Mantener revisión semanal de consumo para telas e insumos de mayor rotación.',
    });
  }

  // 2. Producción y pedidos (orders with shortages or tight lead times)
  const pendingOrActive = data.orders.filter(
    (o) => o.status === 'Pendiente' || o.status === 'En proceso' || o.status === 'Retrasado'
  );
  const ordersWithShortages = pendingOrActive.filter(
    (o) => !o.materialsDeducted && evaluateOrderMaterials(o, data.inventory).hasShortage
  );

  if (ordersWithShortages.length > 0) {
    const orderSummary = ordersWithShortages
      .map((o) => {
        const shortages = evaluateOrderMaterials(o, data.inventory)
          .items.filter((m) => m.isShort)
          .map((m) => `${m.itemName}: faltan ${m.shortage} ${m.unit}`)
          .join(', ');
        return `${o.orderCode} (${o.garmentType}, ${o.quantity} und → ${shortages})`;
      })
      .join(' | ');

    recommendations.push({
      id: 'rec-prod-shortage',
      area: 'Producción',
      priority: 'Alta',
      title: `${ordersWithShortages.length} orden(es) pendiente(s) bloqueada(s) por faltantes`,
      evidence: `Cruce real de inventario vs órdenes: ${orderSummary}.`,
      recommendation:
        'Reabastecer los materiales faltantes o reprogramar las fechas de entrega antes de descontar inventario e iniciar corte.',
    });
  }

  const tightOrders = pendingOrActive.filter(
    (o) => !calculateOrderCapacityAndTime(o, data.simulation.operators, data.simulation.workHoursPerDay).onSchedule
  );
  if (tightOrders.length > 0) {
    const names = tightOrders.map((o) => `${o.orderCode} (${o.quantity} und)`).join(', ');
    recommendations.push({
      id: 'rec-prod-cap',
      area: 'Producción',
      priority: 'Media',
      title: 'Sobrecarga frente a capacidad instalada en órdenes activas',
      evidence: `Con ${data.simulation.operators} operarios y ${data.simulation.workHoursPerDay}h/día, los pedidos ${names} superan el plazo entre fecha de inicio y entrega.`,
      recommendation:
        'Evaluar en el Simulador Empresarial la asignación de operarios adicionales u horas extra para cumplir la fecha pactada.',
    });
  } else if (pendingOrActive.length > 0) {
    recommendations.push({
      id: 'rec-prod-cap-ok',
      area: 'Producción',
      priority: 'Informativa',
      title: 'Capacidad productiva alineada con fechas de entrega',
      evidence: `${pendingOrActive.length} órdenes activas/pendientes cumplen el tiempo estimado con ${data.simulation.operators} operarios (${data.simulation.workHoursPerDay}h/día).`,
      recommendation:
        'Continuar realizando el descuento de materiales al momento de iniciar cada orden para mantener el kardex actualizado.',
    });
  }

  // 3. Control de Calidad
  if (quality.totalInspected > 0) {
    if (quality.defectPct > 5 || quality.approvalPct < 95) {
      recommendations.push({
        id: 'rec-qc-warn',
        area: 'Calidad',
        priority: quality.defectPct > 8 ? 'Alta' : 'Media',
        title: `Tasa de defectos del ${quality.defectPct}% requiere intervención en línea`,
        evidence: `Sobre ${quality.totalInspected} prendas inspeccionadas: ${quality.totalApproved} aprobadas (${quality.approvalPct}%), ${quality.totalDefective} defectuosas y ${quality.totalReprocessed} reprocesadas (${quality.reprocessPct}%).`,
        recommendation:
          'Implementar inspección en proceso (costura y ojales) antes del planchado final para reducir reprocesos y elevar la aprobación sobre el 95%.',
      });
    } else {
      recommendations.push({
        id: 'rec-qc-ok',
        area: 'Calidad',
        priority: 'Informativa',
        title: `Estándar de calidad saludable (${quality.approvalPct}% aprobación)`,
        evidence: `${quality.totalApproved} de ${quality.totalInspected} prendas inspeccionadas fueron aprobadas; ${quality.totalReprocessed} reprocesadas.`,
        recommendation:
          'Sostener auditorías por lote y documentar observaciones por referencia para conservar el margen de calidad.',
      });
    }
  }

  // 4. Gestión de Clientes
  const strategicAndPotential = data.clients.filter(
    (c) => c.category === 'Estratégico' || c.category === 'Potencial'
  );
  const inactiveClients = data.clients.filter((c) => c.category === 'Inactivo');

  if (strategicAndPotential.length > 0) {
    const names = strategicAndPotential.map((c) => `${c.name} (${c.category})`).join(', ');
    recommendations.push({
      id: 'rec-cli-strat',
      area: 'Clientes',
      priority: 'Media',
      title: `Priorizar seguimiento comercial a ${strategicAndPotential.length} cuentas clave`,
      evidence: `Clientes registrados en categorías prioritarias: ${names}.`,
      recommendation:
        'Atender los recordatorios programados con envío de prototipos o disponibilidad confirmada de telas para asegurar recompra.',
    });
  }

  if (inactiveClients.length > 0) {
    recommendations.push({
      id: 'rec-cli-inact',
      area: 'Clientes',
      priority: 'Informativa',
      title: `Reactivación de ${inactiveClients.length} cliente(s) inactivo(s)`,
      evidence: `Cuentas clasificadas como Inactivo: ${inactiveClients.map((c) => c.name).join(', ')}.`,
      recommendation:
        'Programar contacto de reactivación con oferta de ajustes o cápsulas de baja cantidad mínima.',
    });
  }

  return recommendations;
}
