import {
  BarChart3,
  Boxes,
  CheckCircle2,
  Cpu,
  Factory,
  LayoutDashboard,
  Menu,
  RotateCcw,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { ModuleId } from '../types/elvora';

interface SidebarProps {
  activeModule: ModuleId;
  onSelectModule: (id: ModuleId) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenMobile: () => void;
  onResetDemo: () => void;
  lowStockCount: number;
  pendingOrdersCount: number;
}

const NAV_ITEMS: Array<{
  id: ModuleId;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: 'dashboard', label: 'Dashboard Principal', icon: LayoutDashboard },
  { id: 'inventario', label: 'Inventario y Proveedores', icon: Boxes },
  { id: 'clientes', label: 'Gestión de Clientes', icon: Users },
  { id: 'produccion', label: 'Producción y Pedidos', icon: Factory },
  { id: 'calidad', label: 'Control de Calidad', icon: CheckCircle2 },
  { id: 'simulador', label: 'Simulador Empresarial', icon: Cpu },
  { id: 'analisis', label: 'Análisis IA y Reportes', icon: Sparkles },
];

export const MODULE_TITLES: Record<ModuleId, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Panel Ejecutivo',
    subtitle: 'Indicadores consolidados de operación, abastecimiento y calidad · Élvora S.A.S.',
  },
  inventario: {
    title: 'Inventario y Proveedores',
    subtitle: 'Control de telas, insumos, prendas terminadas y directorio de reposición',
  },
  clientes: {
    title: 'Gestión de Clientes',
    subtitle: 'Segmentación comercial, historial de compras y alertas de seguimiento',
  },
  produccion: {
    title: 'Producción y Pedidos',
    subtitle: 'Órdenes de confección, capacidad instalada y descuento automático de materiales',
  },
  calidad: {
    title: 'Control de Calidad',
    subtitle: 'Inspección de lotes, porcentaje de aprobación, defectos y reprocesos',
  },
  simulador: {
    title: 'Simulador Empresarial',
    subtitle: 'Modelado interactivo de capacidad productiva, materiales y cumplimiento',
  },
  analisis: {
    title: 'Análisis Automático y Reportes',
    subtitle: 'Diagnóstico basado en datos reales y exportación oficial en PDF y Excel',
  },
};

export function Sidebar({
  activeModule,
  onSelectModule,
  mobileOpen,
  onCloseMobile,
  onOpenMobile,
  onResetDemo,
  lowStockCount,
  pendingOrdersCount,
}: SidebarProps) {
  const navContent = (
    <div className="flex h-full flex-col justify-between bg-[#141210] text-[#FAF7F2]">
      <div>
        <div className="border-b border-[#2C2621] px-6 py-6">
          <div className="font-display text-2xl font-semibold tracking-tight text-[#FAF7F2]">
            ÉLVORA SMART
          </div>
          <p className="mt-1 text-xs text-[#C7BBAE]">
            Élvora S.A.S. · Confección &amp; Diseño
          </p>
        </div>

        <nav aria-label="Navegación principal" className="px-3 py-5">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeModule === item.id;
              let badgeCount: number | null = null;
              if (item.id === 'inventario' && lowStockCount > 0) badgeCount = lowStockCount;
              if (item.id === 'produccion' && pendingOrdersCount > 0) badgeCount = pendingOrdersCount;

              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectModule(item.id);
                      onCloseMobile();
                    }}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E4DCD0] ${
                      isActive
                        ? 'bg-[#6B4E3D] text-[#FAF7F2]'
                        : 'text-[#D6CCC0] hover:bg-[#221E1A] hover:text-[#FAF7F2]'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="whitespace-nowrap">{item.label}</span>
                    </span>
                    {badgeCount !== null && (
                      <span
                        className="font-mono text-xs tabular-nums text-[#E4DCD0] shrink-0"
                        aria-label={`${badgeCount} alertas`}
                      >
                        {badgeCount}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <div className="border-t border-[#2C2621] p-4">
        <div className="rounded-lg bg-[#1F1B17] p-3.5">
          <div className="flex items-center gap-2 text-xs font-medium text-[#E4DCD0]">
            <BarChart3 className="h-3.5 w-3.5 text-[#C7BBAE]" aria-hidden="true" />
            <span>Datos de prueba incluidos</span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-[#A89B8C]">
            Los cambios se guardan automáticamente en este navegador.
          </p>
          <button
            type="button"
            onClick={onResetDemo}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-[#3E352E] bg-[#29231E] px-3 py-2 text-xs font-medium text-[#FAF7F2] transition-colors hover:bg-[#3A312A] focus-visible:outline-2 focus-visible:outline-[#E4DCD0]"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Restablecer datos demo</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:block lg:w-[272px]">
        {navContent}
      </aside>

      {/* Mobile Top Bar Trigger */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-[#E4DCD0] bg-[#FAF7F2]/95 px-4 py-3 backdrop-blur-sm lg:hidden">
        <button
          type="button"
          onClick={onOpenMobile}
          aria-label="Abrir menú lateral"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#D8CEC0] bg-white text-[#141210] hover:bg-[#F1ECE4]"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
        <span className="font-display text-xl font-semibold text-[#141210]">
          ÉLVORA SMART
        </span>
        <span className="text-xs font-medium text-[#6B4E3D]">Élvora S.A.S.</span>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true" aria-label="Menú de navegación">
          <div
            className="fixed inset-0 bg-[#141210]/50"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 flex w-72 max-w-[85vw] flex-col">
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Cerrar menú lateral"
              className="absolute top-4 right-4 z-20 inline-flex h-9 w-9 items-center justify-center rounded-md bg-[#29231E] text-[#FAF7F2] hover:bg-[#3A312A]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
