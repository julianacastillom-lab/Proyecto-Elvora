import { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  Boxes,
  CheckCircle2,
  ClipboardList,
  Factory,
  Truck,
  Users,
} from 'lucide-react';
import { AppStoreData, ModuleId } from '../types/elvora';
import {
  computeDashboardKPIs,
  computeQualityMetrics,
  findSuppliersForMaterial,
  getClientFollowUpAlerts,
  getLowStockItems,
} from '../utils/calculations';
import { ChartCanvas } from './ChartCanvas';

interface DashboardViewProps {
  data: AppStoreData;
  onNavigate: (module: ModuleId) => void;
}

export function DashboardView({ data, onNavigate }: DashboardViewProps) {
  const kpis = useMemo(() => computeDashboardKPIs(data), [data]);
  const lowStockItems = useMemo(() => getLowStockItems(data.inventory), [data.inventory]);
  const quality = useMemo(() => computeQualityMetrics(data.inspections), [data.inspections]);
  const clientAlerts = useMemo(
    () => getClientFollowUpAlerts(data.clients, '2026-11-22').slice(0, 4),
    [data.clients]
  );

  const pendingOrders = useMemo(
    () =>
      data.orders.filter(
        (o) => o.status === 'Pendiente' || o.status === 'En proceso' || o.status === 'Retrasado'
      ),
    [data.orders]
  );

  const productionChartConfig = useMemo(
    () => ({
      type: 'bar' as const,
      data: {
        labels: data.orders.map((o) => o.orderCode),
        datasets: [
          {
            label: 'Unidades solicitadas',
            data: data.orders.map((o) => o.quantity),
            backgroundColor: data.orders.map((o) =>
              o.status === 'Completado'
                ? '#4A5D4E'
                : o.status === 'En proceso'
                  ? '#8C6D53'
                  : o.status === 'Retrasado'
                    ? '#991B1B'
                    : '#D6CCC0'
            ),
            borderRadius: 4,
          },
        ],
      },
      options: {
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx: { parsed: { y: number | null } }) =>
                `${ctx.parsed.y ?? 0} prendas`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(20, 18, 16, 0.06)' },
            ticks: { color: '#5A5046', font: { size: 11 } },
          },
          x: {
            grid: { display: false },
            ticks: { color: '#141210', font: { size: 11 } },
          },
        },
      },
    }),
    [data.orders]
  );

  const qualityChartConfig = useMemo(
    () => ({
      type: 'doughnut' as const,
      data: {
        labels: ['Aprobadas', 'Defectuosas (no reproc.)', 'Reprocesadas'],
        datasets: [
          {
            data: [
              quality.totalApproved,
              Math.max(0, quality.totalDefective - quality.totalReprocessed),
              quality.totalReprocessed,
            ],
            backgroundColor: ['#4A5D4E', '#991B1B', '#B45309'],
            borderColor: '#FFFFFF',
            borderWidth: 2,
          },
        ],
      },
      options: {
        cutout: '66%',
        plugins: {
          legend: {
            position: 'bottom' as const,
            labels: { color: '#141210', boxWidth: 12, padding: 14, font: { size: 11 } },
          },
        },
      },
    }),
    [quality]
  );

  const inventoryChartConfig = useMemo(() => {
    const topMaterials = data.inventory.slice(0, 6);
    return {
      type: 'bar' as const,
      data: {
        labels: topMaterials.map((i) => i.code),
        datasets: [
          {
            label: 'Stock disponible',
            data: topMaterials.map((i) => i.quantity),
            backgroundColor: '#6B4E3D',
            borderRadius: 4,
          },
          {
            label: 'Stock mínimo',
            data: topMaterials.map((i) => i.minStock),
            backgroundColor: '#D6CCC0',
            borderRadius: 4,
          },
        ],
      },
      options: {
        plugins: {
          legend: {
            position: 'bottom' as const,
            labels: { color: '#141210', boxWidth: 12, font: { size: 11 } },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(20, 18, 16, 0.06)' },
            ticks: { color: '#5A5046', font: { size: 11 } },
          },
          x: {
            grid: { display: false },
            ticks: { color: '#141210', font: { size: 11 } },
          },
        },
      },
    };
  }, [data.inventory]);

  const kpiCards = [
    {
      label: 'Producción realizada',
      value: `${kpis.totalProducedUnits}`,
      unit: 'prendas',
      detail: `${kpis.completedOrdersCount} órdenes completadas`,
      icon: Factory,
      action: () => onNavigate('produccion'),
    },
    {
      label: 'Inventario disponible',
      value: `${kpis.totalInventoryUnits}`,
      unit: 'uds/m',
      detail: `Valorizado en $${(kpis.inventoryValue / 1000000).toFixed(1)}M`,
      icon: Boxes,
      action: () => onNavigate('inventario'),
    },
    {
      label: 'Existencias bajas',
      value: `${kpis.lowStockCount}`,
      unit: 'ítems',
      detail: kpis.lowStockCount > 0 ? 'Requiere reposición' : 'Stock saludable',
      icon: AlertTriangle,
      alert: kpis.lowStockCount > 0,
      action: () => onNavigate('inventario'),
    },
    {
      label: 'Total proveedores',
      value: `${kpis.totalSuppliers}`,
      unit: 'aliados',
      detail: 'Telas, hilos y avíos',
      icon: Truck,
      action: () => onNavigate('inventario'),
    },
    {
      label: 'Total clientes',
      value: `${kpis.totalClients}`,
      unit: 'cuentas',
      detail: `${kpis.strategicClientsCount} clientes estratégicos`,
      icon: Users,
      action: () => onNavigate('clientes'),
    },
    {
      label: 'Clientes estratégicos',
      value: `${kpis.strategicClientsCount}`,
      unit: 'prioridad',
      detail: 'Seguimiento comercial activo',
      icon: BellRing,
      action: () => onNavigate('clientes'),
    },
    {
      label: 'Pedidos pendientes',
      value: `${kpis.pendingOrdersCount}`,
      unit: 'órdenes',
      detail: `${kpis.inProgressOrdersCount} en proceso de confección`,
      icon: ClipboardList,
      action: () => onNavigate('produccion'),
    },
    {
      label: 'Aprobación de calidad',
      value: `${kpis.qualityApprovalPct}%`,
      unit: `${quality.totalInspected} insp.`,
      detail: `Defectos ${kpis.qualityDefectPct}% · Reproc. ${kpis.qualityReprocessPct}%`,
      icon: CheckCircle2,
      action: () => onNavigate('calidad'),
    },
  ];

  return (
    <div className="space-y-8">
      {/* KPI Grid */}
      <section aria-label="Indicadores principales">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpiCards.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <button
                key={kpi.label}
                type="button"
                onClick={kpi.action}
                className="group flex flex-col justify-between rounded-xl border border-[#E4DCD0] bg-white p-5 text-left transition-colors hover:border-[#8C6D53] focus-visible:outline-2 focus-visible:outline-[#141210]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-[#6B5E52]">{kpi.label}</span>
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      kpi.alert ? 'text-[#991B1B]' : 'text-[#8C6D53]'
                    }`}
                    aria-hidden="true"
                  />
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span
                    className={`font-mono text-2xl font-semibold tabular-nums ${
                      kpi.alert ? 'text-[#991B1B]' : 'text-[#141210]'
                    }`}
                  >
                    {kpi.value}
                  </span>
                  <span className="text-xs text-[#6B5E52]">{kpi.unit}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-[#5A5046]">
                  <span>{kpi.detail}</span>
                  <ArrowRight
                    className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100"
                    aria-hidden="true"
                  />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Charts Row */}
      <section aria-label="Gráficas operativas" className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-[#E4DCD0] bg-white p-6">
          <div className="mb-4 flex items-baseline justify-between gap-2">
            <div>
              <h2 className="text-xl font-semibold text-[#141210]">Órdenes de Producción</h2>
              <p className="text-xs text-[#6B5E52]">Prendas por código de orden</p>
            </div>
            <span className="text-xs text-[#6B4E3D]">{data.orders.length} órdenes</span>
          </div>
          <ChartCanvas
            config={productionChartConfig}
            heightClass="h-56"
            ariaLabel="Gráfica de barras de unidades por orden de producción"
            testId="chart-dashboard-production"
          />
        </div>

        <div className="rounded-xl border border-[#E4DCD0] bg-white p-6">
          <div className="mb-4 flex items-baseline justify-between gap-2">
            <div>
              <h2 className="text-xl font-semibold text-[#141210]">Control de Calidad</h2>
              <p className="text-xs text-[#6B5E52]">
                Aprobación {kpis.qualityApprovalPct}% · Defectos {kpis.qualityDefectPct}%
              </p>
            </div>
            <span className="font-mono text-xs tabular-nums text-[#4A5D4E]">
              {quality.totalInspected} prendas
            </span>
          </div>
          <ChartCanvas
            config={qualityChartConfig}
            heightClass="h-56"
            ariaLabel="Gráfica de dona del estado de calidad"
            testId="chart-dashboard-quality"
          />
        </div>

        <div className="rounded-xl border border-[#E4DCD0] bg-white p-6">
          <div className="mb-4 flex items-baseline justify-between gap-2">
            <div>
              <h2 className="text-xl font-semibold text-[#141210]">Stock vs Mínimo</h2>
              <p className="text-xs text-[#6B5E52]">Principales materiales e insumos</p>
            </div>
            <span className="text-xs text-[#991B1B]">{lowStockItems.length} críticos</span>
          </div>
          <ChartCanvas
            config={inventoryChartConfig}
            heightClass="h-56"
            ariaLabel="Gráfica comparativa de stock disponible frente a mínimo"
            testId="chart-dashboard-inventory"
          />
        </div>
      </section>

      {/* Operational Tables & Alerts */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Low Stock + Immediate Suppliers */}
        <div className="rounded-xl border border-[#E4DCD0] bg-white p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-[#141210]">
                Alertas de Inventario y Reposición
              </h2>
              <p className="text-xs text-[#6B5E52]">
                Materiales por debajo del stock mínimo con proveedor recomendado
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('inventario')}
              className="whitespace-nowrap rounded-lg border border-[#D8CEC0] px-3 py-1.5 text-xs font-medium text-[#141210] hover:bg-[#F1ECE4]"
            >
              Gestionar stock
            </button>
          </div>

          {lowStockItems.length === 0 ? (
            <p className="py-6 text-sm text-[#5A5046]">
              Todos los materiales cuentan con existencias por encima del mínimo establecido.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#E4DCD0] text-xs text-[#6B5E52]">
                    <th className="py-2.5 pr-3 font-medium">Material</th>
                    <th className="py-2.5 px-3 text-right font-medium">Actual / Mín.</th>
                    <th className="py-2.5 pl-3 font-medium">Proveedor sugerido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1ECE4]">
                  {lowStockItems.map((item) => {
                    const matches = findSuppliersForMaterial(item, data.suppliers);
                    const top = matches[0];
                    return (
                      <tr key={item.id} className="hover:bg-[#FAF7F2]">
                        <td className="py-3 pr-3">
                          <div className="font-medium text-[#141210]">{item.name}</div>
                          <div className="font-mono text-xs text-[#6B5E52]">
                            {item.code} · {item.category}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums text-[#991B1B]">
                          {item.quantity} / {item.minStock} {item.unit}
                        </td>
                        <td className="py-3 pl-3 text-xs text-[#4A4036]">
                          {top ? (
                            <div>
                              <span className="font-medium text-[#141210]">
                                {top.supplier.company}
                              </span>
                              <div className="font-mono text-[#6B5E52]">
                                ${top.price.toLocaleString('es-CO')} · {top.supplier.deliveryDays} días
                              </div>
                            </div>
                          ) : (
                            <span className="text-[#991B1B]">Sin proveedor registrado</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pending Orders & Client Reminders */}
        <div className="space-y-6">
          <div className="rounded-xl border border-[#E4DCD0] bg-white p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-[#141210]">
                  Pedidos Activos y Pendientes
                </h2>
                <p className="text-xs text-[#6B5E52]">
                  Seguimiento de entregas programadas
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('produccion')}
                className="whitespace-nowrap rounded-lg border border-[#D8CEC0] px-3 py-1.5 text-xs font-medium text-[#141210] hover:bg-[#F1ECE4]"
              >
                Ver producción
              </button>
            </div>
            {pendingOrders.length === 0 ? (
              <p className="py-4 text-sm text-[#5A5046]">No hay pedidos pendientes.</p>
            ) : (
              <div className="divide-y divide-[#F1ECE4]">
                {pendingOrders.slice(0, 4).map((ord) => {
                  const clientName =
                    data.clients.find((c) => c.id === ord.clientId)?.name ?? 'Cliente';
                  return (
                    <div
                      key={ord.id}
                      className="flex items-center justify-between gap-4 py-3 text-sm"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium text-[#141210]">
                          {ord.orderCode} · {ord.garmentType}
                        </div>
                        <div className="text-xs text-[#6B5E52]">
                          {clientName} · Entrega {ord.dueDate}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-mono text-sm font-medium tabular-nums text-[#141210]">
                          {ord.quantity} und
                        </div>
                        <div className="text-xs text-[#6B4E3D]">{ord.status}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-[#E4DCD0] bg-white p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-[#141210]">
                  Seguimiento a Clientes Clave
                </h2>
                <p className="text-xs text-[#6B5E52]">
                  Recordatorios para cuentas estratégicas y potenciales
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('clientes')}
                className="whitespace-nowrap rounded-lg border border-[#D8CEC0] px-3 py-1.5 text-xs font-medium text-[#141210] hover:bg-[#F1ECE4]"
              >
                Ir a clientes
              </button>
            </div>
            <div className="divide-y divide-[#F1ECE4]">
              {clientAlerts.map(({ client, urgency }) => (
                <div
                  key={client.id}
                  className="flex items-start justify-between gap-4 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-[#141210]">
                      {client.name}{' '}
                      <span className="text-xs font-normal text-[#6B5E52]">
                        · {client.category}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-[#5A5046]">{client.followUpNote}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span
                      className={`text-xs font-medium ${
                        urgency === 'Vencido'
                          ? 'text-[#991B1B]'
                          : urgency === 'Próximo'
                            ? 'text-[#B45309]'
                            : 'text-[#4A5D4E]'
                      }`}
                    >
                      {urgency}
                    </span>
                    <div className="font-mono text-xs text-[#6B5E52]">
                      {client.nextFollowUpDate}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
