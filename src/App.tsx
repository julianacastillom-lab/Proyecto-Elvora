import { useEffect, useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
import { AnalysisReportsView } from './components/AnalysisReportsView';
import { ClientsView } from './components/ClientsView';
import { DashboardView } from './components/DashboardView';
import { InventorySuppliersView } from './components/InventorySuppliersView';
import { ProductionView } from './components/ProductionView';
import { QualityView } from './components/QualityView';
import { MODULE_TITLES, Sidebar } from './components/Sidebar';
import { SimulatorView } from './components/SimulatorView';
import { DEMO_DATA } from './data/demoData';
import {
  AppStoreData,
  Client,
  InventoryItem,
  ModuleId,
  OrderStatus,
  ProductionOrder,
  QualityInspection,
  SimulationParams,
  Supplier,
} from './types/elvora';
import {
  computeDashboardKPIs,
  deductOrderMaterialsFromInventory,
} from './utils/calculations';
import { exportReportPDF } from './utils/exporters';
import { loadAppData, resetToDemoData, saveAppData } from './utils/storage';

export default function App() {
  const [data, setData] = useState<AppStoreData>(() => loadAppData());
  const [activeModule, setActiveModule] = useState<ModuleId>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    saveAppData(data);
  }, [data]);

  const kpis = useMemo(() => computeDashboardKPIs(data), [data]);
  const headerInfo = MODULE_TITLES[activeModule];

  // Inventory CRUD
  const handleAddInventory = (item: Omit<InventoryItem, 'id'>) => {
    setData((prev) => ({
      ...prev,
      inventory: [...prev.inventory, { ...item, id: `inv-${Date.now()}` }],
    }));
  };

  const handleUpdateInventory = (updated: InventoryItem) => {
    setData((prev) => ({
      ...prev,
      inventory: prev.inventory.map((i) => (i.id === updated.id ? updated : i)),
    }));
  };

  const handleDeleteInventory = (id: string) => {
    setData((prev) => ({
      ...prev,
      inventory: prev.inventory.filter((i) => i.id !== id),
    }));
  };

  // Suppliers CRUD
  const handleAddSupplier = (supplier: Omit<Supplier, 'id'>) => {
    setData((prev) => ({
      ...prev,
      suppliers: [...prev.suppliers, { ...supplier, id: `sup-${Date.now()}` }],
    }));
  };

  const handleUpdateSupplier = (updated: Supplier) => {
    setData((prev) => ({
      ...prev,
      suppliers: prev.suppliers.map((s) => (s.id === updated.id ? updated : s)),
    }));
  };

  const handleDeleteSupplier = (id: string) => {
    setData((prev) => ({
      ...prev,
      suppliers: prev.suppliers.filter((s) => s.id !== id),
    }));
  };

  // Clients CRUD
  const handleAddClient = (client: Omit<Client, 'id'>) => {
    setData((prev) => ({
      ...prev,
      clients: [...prev.clients, { ...client, id: `cli-${Date.now()}` }],
    }));
  };

  const handleUpdateClient = (updated: Client) => {
    setData((prev) => ({
      ...prev,
      clients: prev.clients.map((c) => (c.id === updated.id ? updated : c)),
    }));
  };

  const handleDeleteClient = (id: string) => {
    setData((prev) => ({
      ...prev,
      clients: prev.clients.filter((c) => c.id !== id),
    }));
  };

  // Production Orders CRUD & Inventory Deduction
  const handleAddOrder = (order: Omit<ProductionOrder, 'id'>) => {
    setData((prev) => ({
      ...prev,
      orders: [{ ...order, id: `ord-${Date.now()}` }, ...prev.orders],
    }));
  };

  const handleDeductAndStartOrder = (
    orderId: string
  ): { ok: boolean; message?: string } => {
    const order = data.orders.find((o) => o.id === orderId);
    if (!order) return { ok: false, message: 'Orden no encontrada.' };

    const result = deductOrderMaterialsFromInventory(order, data.inventory);
    if (!result.deducted) {
      const missingText = result.shortages
        .map((s) => `${s.itemName} (faltan ${s.shortage} ${s.unit})`)
        .join(', ');
      return {
        ok: false,
        message: `Stock insuficiente para ${order.orderCode}: ${missingText}.`,
      };
    }

    setData((prev) => ({
      ...prev,
      inventory: result.updatedInventory,
      orders: prev.orders.map((o) =>
        o.id === orderId
          ? {
              ...o,
              materialsDeducted: true,
              status: o.status === 'Pendiente' ? 'En proceso' : o.status,
            }
          : o
      ),
    }));

    return {
      ok: true,
      message: `Materiales descontados del inventario y orden ${order.orderCode} iniciada.`,
    };
  };

  const handleUpdateOrderStatus = (
    orderId: string,
    nextStatus: OrderStatus
  ): { ok: boolean; message?: string } => {
    const order = data.orders.find((o) => o.id === orderId);
    if (!order) return { ok: false, message: 'Orden no encontrada.' };

    // Auto-deduct materials if moving to En proceso / Completado and not yet deducted
    if (
      (nextStatus === 'En proceso' || nextStatus === 'Completado') &&
      !order.materialsDeducted &&
      order.materials.length > 0
    ) {
      const deduction = deductOrderMaterialsFromInventory(order, data.inventory);
      if (!deduction.deducted) {
        const missingText = deduction.shortages
          .map((s) => `${s.itemName} (faltan ${s.shortage} ${s.unit})`)
          .join(', ');
        return {
          ok: false,
          message: `No se puede pasar a "${nextStatus}" por falta de materiales: ${missingText}.`,
        };
      }
      setData((prev) => ({
        ...prev,
        inventory: deduction.updatedInventory,
        orders: prev.orders.map((o) =>
          o.id === orderId
            ? { ...o, status: nextStatus, materialsDeducted: true }
            : o
        ),
      }));
      return { ok: true };
    }

    setData((prev) => ({
      ...prev,
      orders: prev.orders.map((o) =>
        o.id === orderId ? { ...o, status: nextStatus } : o
      ),
    }));
    return { ok: true };
  };

  const handleDeleteOrder = (orderId: string) => {
    setData((prev) => ({
      ...prev,
      orders: prev.orders.filter((o) => o.id !== orderId),
    }));
  };

  // Quality Control CRUD
  const handleAddInspection = (inspection: Omit<QualityInspection, 'id'>) => {
    setData((prev) => ({
      ...prev,
      inspections: [
        { ...inspection, id: `qc-${Date.now()}` },
        ...prev.inspections,
      ],
    }));
  };

  const handleDeleteInspection = (id: string) => {
    setData((prev) => ({
      ...prev,
      inspections: prev.inspections.filter((q) => q.id !== id),
    }));
  };

  // Simulation Params
  const handleChangeSimulation = (next: SimulationParams) => {
    setData((prev) => ({ ...prev, simulation: next }));
  };

  const handleResetSimulation = () => {
    setData((prev) => ({
      ...prev,
      simulation: structuredClone(DEMO_DATA.simulation),
    }));
  };

  const handleResetAllDemo = () => {
    const fresh = resetToDemoData();
    setData(fresh);
  };

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#141210]">
      <Sidebar
        activeModule={activeModule}
        onSelectModule={(mod) => {
          setActiveModule(mod);
          window.scrollTo({ top: 0, behavior: 'instant' });
        }}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onOpenMobile={() => setMobileMenuOpen(true)}
        onResetDemo={handleResetAllDemo}
        lowStockCount={kpis.lowStockCount}
        pendingOrdersCount={kpis.pendingOrdersCount}
      />

      <div className="lg:pl-[272px]">
        {/* Top Header */}
        <header className="border-b border-[#E4DCD0] bg-white px-4 py-5 sm:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-[#141210]">
                {headerInfo.title}
              </h1>
              <p className="mt-0.5 text-sm text-[#5A5046]">{headerInfo.subtitle}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => exportReportPDF(data, 'completo')}
                className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-lg border border-[#D8CEC0] bg-[#FAF7F2] px-4 text-xs font-medium text-[#141210] transition-colors hover:bg-[#E4DCD0]"
              >
                <FileText className="h-4 w-4 text-[#6B4E3D]" aria-hidden="true" />
                <span>Exportar PDF Ejecutivo</span>
              </button>
            </div>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-8">
          {activeModule === 'dashboard' && (
            <DashboardView data={data} onNavigate={setActiveModule} />
          )}

          {activeModule === 'inventario' && (
            <InventorySuppliersView
              inventory={data.inventory}
              suppliers={data.suppliers}
              onAddInventory={handleAddInventory}
              onUpdateInventory={handleUpdateInventory}
              onDeleteInventory={handleDeleteInventory}
              onAddSupplier={handleAddSupplier}
              onUpdateSupplier={handleUpdateSupplier}
              onDeleteSupplier={handleDeleteSupplier}
            />
          )}

          {activeModule === 'clientes' && (
            <ClientsView
              clients={data.clients}
              onAddClient={handleAddClient}
              onUpdateClient={handleUpdateClient}
              onDeleteClient={handleDeleteClient}
            />
          )}

          {activeModule === 'produccion' && (
            <ProductionView
              orders={data.orders}
              clients={data.clients}
              inventory={data.inventory}
              suppliers={data.suppliers}
              operators={data.simulation.operators}
              workHoursPerDay={data.simulation.workHoursPerDay}
              onAddOrder={handleAddOrder}
              onUpdateOrderStatus={handleUpdateOrderStatus}
              onDeductAndStartOrder={handleDeductAndStartOrder}
              onDeleteOrder={handleDeleteOrder}
            />
          )}

          {activeModule === 'calidad' && (
            <QualityView
              inspections={data.inspections}
              orders={data.orders}
              onAddInspection={handleAddInspection}
              onDeleteInspection={handleDeleteInspection}
            />
          )}

          {activeModule === 'simulador' && (
            <SimulatorView
              params={data.simulation}
              inventory={data.inventory}
              onChangeParams={handleChangeSimulation}
              onResetParams={handleResetSimulation}
            />
          )}

          {activeModule === 'analisis' && <AnalysisReportsView data={data} />}
        </main>
      </div>
    </div>
  );
}
