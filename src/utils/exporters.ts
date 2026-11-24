import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { AppStoreData } from '../types/elvora';
import {
  computeDashboardKPIs,
  computeQualityMetrics,
  generateDataGroundedAnalysis,
} from './calculations';

export type ReportScope =
  | 'completo'
  | 'inventario'
  | 'proveedores'
  | 'clientes'
  | 'produccion'
  | 'calidad';

function formatCurrency(val: number): string {
  return `$${val.toLocaleString('es-CO')}`;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportReportPDF(data: AppStoreData, scope: ReportScope): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const nowStr = new Date().toLocaleDateString('es-CO');
  const kpis = computeDashboardKPIs(data);

  // Header
  doc.setFillColor(20, 18, 16);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setTextColor(250, 247, 242);
  doc.setFontSize(18);
  doc.text('ÉLVORA SMART — Élvora S.A.S.', 14, 13);
  doc.setFontSize(10);
  doc.setTextColor(228, 220, 208);
  const scopeLabel: Record<ReportScope, string> = {
    completo: 'Reporte Ejecutivo Consolidado',
    inventario: 'Reporte de Inventario y Materiales',
    proveedores: 'Directorio de Proveedores',
    clientes: 'Reporte de Gestión de Clientes',
    produccion: 'Reporte de Producción y Pedidos',
    calidad: 'Reporte de Control de Calidad',
  };
  doc.text(`${scopeLabel[scope]} · Generado: ${nowStr}`, 14, 21);

  let currentY = 36;

  if (scope === 'completo') {
    doc.setTextColor(20, 18, 16);
    doc.setFontSize(12);
    doc.text('Resumen de Indicadores Clave', 14, currentY);
    currentY += 4;

    autoTable(doc, {
      startY: currentY,
      head: [['Indicador', 'Valor Actual']],
      body: [
        ['Producción realizada', `${kpis.totalProducedUnits} prendas`],
        ['Inventario disponible', `${kpis.totalInventoryUnits} uds (${formatCurrency(kpis.inventoryValue)})`],
        ['Productos con existencias bajas', `${kpis.lowStockCount} ítems`],
        ['Total proveedores / clientes', `${kpis.totalSuppliers} proveedores / ${kpis.totalClients} clientes (${kpis.strategicClientsCount} estratégicos)`],
        ['Pedidos pendientes / en proceso', `${kpis.pendingOrdersCount} pendientes / ${kpis.inProgressOrdersCount} en proceso`],
        ['Calidad (Aprobación / Defectos / Reprocesos)', `${kpis.qualityApprovalPct}% / ${kpis.qualityDefectPct}% / ${kpis.qualityReprocessPct}%`],
      ],
      headStyles: { fillColor: [107, 78, 61] },
      styles: { fontSize: 9 },
    });
    currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  if (scope === 'completo' || scope === 'inventario') {
    doc.setTextColor(20, 18, 16);
    doc.setFontSize(12);
    doc.text('Inventario de Materiales y Prendas', 14, currentY);
    autoTable(doc, {
      startY: currentY + 3,
      head: [['Código', 'Material / Prenda', 'Categoría', 'Disponible', 'Mínimo', 'Costo Unit.']],
      body: data.inventory.map((i) => [
        i.code,
        i.name,
        i.category,
        `${i.quantity} ${i.unit}`,
        `${i.minStock} ${i.unit}`,
        formatCurrency(i.unitCost),
      ]),
      headStyles: { fillColor: [20, 18, 16] },
      styles: { fontSize: 8.5 },
    });
    currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  if (scope === 'completo' || scope === 'proveedores') {
    if (currentY > 235) {
      doc.addPage();
      currentY = 20;
    }
    doc.setTextColor(20, 18, 16);
    doc.setFontSize(12);
    doc.text('Proveedores Registrados', 14, currentY);
    autoTable(doc, {
      startY: currentY + 3,
      head: [['Empresa', 'Contacto', 'Ciudad', 'WhatsApp', 'Entrega', 'Materiales']],
      body: data.suppliers.map((s) => [
        s.company,
        s.name,
        s.city,
        s.whatsapp,
        `${s.deliveryDays} días`,
        s.materialsSupplied.map((m) => `${m.materialCode} (${formatCurrency(m.price)})`).join(', '),
      ]),
      headStyles: { fillColor: [107, 78, 61] },
      styles: { fontSize: 8 },
    });
    currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  if (scope === 'completo' || scope === 'clientes') {
    if (currentY > 235) {
      doc.addPage();
      currentY = 20;
    }
    doc.setTextColor(20, 18, 16);
    doc.setFontSize(12);
    doc.text('Directorio y Clasificación de Clientes', 14, currentY);
    autoTable(doc, {
      startY: currentY + 3,
      head: [['Cliente', 'Categoría', 'Ciudad', 'Teléfono', 'Próx. Seguimiento', 'Compras']],
      body: data.clients.map((c) => [
        c.name,
        c.category,
        c.city,
        c.phone,
        c.nextFollowUpDate || '—',
        `${c.purchases.length} (${formatCurrency(c.purchases.reduce((s, p) => s + p.amount, 0))})`,
      ]),
      headStyles: { fillColor: [74, 93, 78] },
      styles: { fontSize: 8.5 },
    });
    currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  if (scope === 'completo' || scope === 'produccion') {
    if (currentY > 235) {
      doc.addPage();
      currentY = 20;
    }
    doc.setTextColor(20, 18, 16);
    doc.setFontSize(12);
    doc.text('Órdenes de Producción y Pedidos', 14, currentY);
    autoTable(doc, {
      startY: currentY + 3,
      head: [['Orden', 'Cliente', 'Prenda', 'Cant.', 'Inicio', 'Entrega', 'Estado']],
      body: data.orders.map((o) => {
        const client = data.clients.find((c) => c.id === o.clientId)?.name ?? '—';
        return [o.orderCode, client, o.garmentType, `${o.quantity} und`, o.startDate, o.dueDate, o.status];
      }),
      headStyles: { fillColor: [20, 18, 16] },
      styles: { fontSize: 8.5 },
    });
    currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  if (scope === 'completo' || scope === 'calidad') {
    if (currentY > 235) {
      doc.addPage();
      currentY = 20;
    }
    const qc = computeQualityMetrics(data.inspections);
    doc.setTextColor(20, 18, 16);
    doc.setFontSize(12);
    doc.text(
      `Control de Calidad (Aprobación: ${qc.approvalPct}% | Defectos: ${qc.defectPct}% | Reprocesos: ${qc.reprocessPct}%)`,
      14,
      currentY
    );
    autoTable(doc, {
      startY: currentY + 3,
      head: [['Fecha', 'Orden', 'Prenda', 'Inspecc.', 'Aprob.', 'Defect.', 'Reproc.']],
      body: data.inspections.map((q) => [
        q.date,
        q.orderCode,
        q.garmentType,
        String(q.inspected),
        String(q.approved),
        String(q.defective),
        String(q.reprocessed),
      ]),
      headStyles: { fillColor: [107, 78, 61] },
      styles: { fontSize: 8.5 },
    });
  }

  if (scope === 'completo') {
    const recs = generateDataGroundedAnalysis(data);
    doc.addPage();
    doc.setTextColor(20, 18, 16);
    doc.setFontSize(13);
    doc.text('Análisis Automático y Recomendaciones Basadas en Datos', 14, 20);
    autoTable(doc, {
      startY: 26,
      head: [['Área', 'Prioridad', 'Diagnóstico y Evidencia', 'Recomendación']],
      body: recs.map((r) => [r.area, r.priority, `${r.title}: ${r.evidence}`, r.recommendation]),
      headStyles: { fillColor: [20, 18, 16] },
      styles: { fontSize: 8.5 },
    });
  }

  doc.save(`elvora-smart-${scope}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export async function exportReportExcel(data: AppStoreData, scope: ReportScope): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'ÉLVORA SMART — Élvora S.A.S.';
  workbook.created = new Date();

  const styleHeader = (row: ExcelJS.Row) => {
    row.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF141210' },
      };
      cell.font = { color: { argb: 'FFFAF7F2' }, bold: true, size: 10 };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
    });
    row.height = 24;
  };

  if (scope === 'completo' || scope === 'inventario') {
    const sheet = workbook.addWorksheet('Inventario');
    sheet.columns = [
      { header: 'Código', key: 'code', width: 14 },
      { header: 'Producto / Material', key: 'name', width: 34 },
      { header: 'Categoría', key: 'category', width: 18 },
      { header: 'Cantidad Disponible', key: 'quantity', width: 18 },
      { header: 'Unidad', key: 'unit', width: 10 },
      { header: 'Stock Mínimo', key: 'minStock', width: 14 },
      { header: 'Costo Unitario (COP)', key: 'unitCost', width: 20 },
      { header: 'Estado Stock', key: 'status', width: 16 },
    ];
    styleHeader(sheet.getRow(1));
    data.inventory.forEach((i) => {
      sheet.addRow({
        code: i.code,
        name: i.name,
        category: i.category,
        quantity: i.quantity,
        unit: i.unit,
        minStock: i.minStock,
        unitCost: i.unitCost,
        status: i.quantity <= i.minStock ? 'Stock Bajo' : 'Normal',
      });
    });
  }

  if (scope === 'completo' || scope === 'proveedores') {
    const sheet = workbook.addWorksheet('Proveedores');
    sheet.columns = [
      { header: 'Empresa', key: 'company', width: 28 },
      { header: 'Contacto', key: 'name', width: 22 },
      { header: 'Ciudad', key: 'city', width: 16 },
      { header: 'Teléfono', key: 'phone', width: 16 },
      { header: 'WhatsApp', key: 'whatsapp', width: 18 },
      { header: 'Correo', key: 'email', width: 28 },
      { header: 'Tiempo Entrega (días)', key: 'deliveryDays', width: 20 },
      { header: 'Materiales y Precios', key: 'materials', width: 45 },
    ];
    styleHeader(sheet.getRow(1));
    data.suppliers.forEach((s) => {
      sheet.addRow({
        company: s.company,
        name: s.name,
        city: s.city,
        phone: s.phone,
        whatsapp: s.whatsapp,
        email: s.email,
        deliveryDays: s.deliveryDays,
        materials: s.materialsSupplied
          .map((m) => `${m.materialCode} ${m.materialName}: $${m.price.toLocaleString('es-CO')}/${m.unit}`)
          .join(' | '),
      });
    });
  }

  if (scope === 'completo' || scope === 'clientes') {
    const sheet = workbook.addWorksheet('Clientes');
    sheet.columns = [
      { header: 'Cliente', key: 'name', width: 28 },
      { header: 'Categoría', key: 'category', width: 16 },
      { header: 'Ciudad', key: 'city', width: 16 },
      { header: 'Teléfono', key: 'phone', width: 16 },
      { header: 'Correo', key: 'email', width: 28 },
      { header: 'Próximo Seguimiento', key: 'nextFollowUpDate', width: 20 },
      { header: 'Total Compras (COP)', key: 'totalAmount', width: 20 },
      { header: 'Observaciones', key: 'observations', width: 40 },
    ];
    styleHeader(sheet.getRow(1));
    data.clients.forEach((c) => {
      sheet.addRow({
        name: c.name,
        category: c.category,
        city: c.city,
        phone: c.phone,
        email: c.email,
        nextFollowUpDate: c.nextFollowUpDate,
        totalAmount: c.purchases.reduce((sum, p) => sum + p.amount, 0),
        observations: c.observations,
      });
    });
  }

  if (scope === 'completo' || scope === 'produccion') {
    const sheet = workbook.addWorksheet('Producción');
    sheet.columns = [
      { header: 'Código Orden', key: 'orderCode', width: 16 },
      { header: 'Cliente', key: 'clientName', width: 28 },
      { header: 'Prenda', key: 'garmentType', width: 30 },
      { header: 'Cantidad', key: 'quantity', width: 12 },
      { header: 'Inicio', key: 'startDate', width: 14 },
      { header: 'Entrega', key: 'dueDate', width: 14 },
      { header: 'Estado', key: 'status', width: 14 },
      { header: 'Materiales Descontados', key: 'deducted', width: 22 },
    ];
    styleHeader(sheet.getRow(1));
    data.orders.forEach((o) => {
      const client = data.clients.find((c) => c.id === o.clientId)?.name ?? '—';
      sheet.addRow({
        orderCode: o.orderCode,
        clientName: client,
        garmentType: o.garmentType,
        quantity: o.quantity,
        startDate: o.startDate,
        dueDate: o.dueDate,
        status: o.status,
        deducted: o.materialsDeducted ? 'Sí' : 'No',
      });
    });
  }

  if (scope === 'completo' || scope === 'calidad') {
    const sheet = workbook.addWorksheet('Control de Calidad');
    sheet.columns = [
      { header: 'Fecha', key: 'date', width: 14 },
      { header: 'Orden', key: 'orderCode', width: 16 },
      { header: 'Prenda', key: 'garmentType', width: 30 },
      { header: 'Inspeccionadas', key: 'inspected', width: 16 },
      { header: 'Aprobadas', key: 'approved', width: 14 },
      { header: 'Defectuosas', key: 'defective', width: 14 },
      { header: 'Reprocesadas', key: 'reprocessed', width: 14 },
      { header: 'Notas', key: 'notes', width: 36 },
    ];
    styleHeader(sheet.getRow(1));
    data.inspections.forEach((q) => {
      sheet.addRow({
        date: q.date,
        orderCode: q.orderCode,
        garmentType: q.garmentType,
        inspected: q.inspected,
        approved: q.approved,
        defective: q.defective,
        reprocessed: q.reprocessed,
        notes: q.notes,
      });
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlob(blob, `elvora-smart-${scope}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
