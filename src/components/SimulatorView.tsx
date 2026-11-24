import { useEffect, useMemo, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { InventoryItem, SimulationParams } from '../types/elvora';
import { runBusinessSimulation } from '../utils/calculations';
import { ChartCanvas } from './ChartCanvas';

interface SimulatorViewProps {
  params: SimulationParams;
  inventory: InventoryItem[];
  onChangeParams: (next: SimulationParams) => void;
  onResetParams: () => void;
}

export function SimulatorView({
  params,
  inventory,
  onChangeParams,
  onResetParams,
}: SimulatorViewProps) {
  const [simStatus, setSimStatus] = useState<'idle' | 'running' | 'paused' | 'completed'>('idle');
  const [simulatedDay, setSimulatedDay] = useState<number>(0);

  const result = useMemo(
    () => runBusinessSimulation(params, inventory),
    [params, inventory]
  );

  useEffect(() => {
    if (simStatus !== 'running') return;
    const timer = window.setInterval(() => {
      setSimulatedDay((prev) => {
        if (prev >= params.horizonDays) {
          setSimStatus('completed');
          return params.horizonDays;
        }
        const next = prev + 1;
        if (next >= params.horizonDays) {
          setSimStatus('completed');
        }
        return next;
      });
    }, 650);

    return () => window.clearInterval(timer);
  }, [simStatus, params.horizonDays]);

  const progressRatio =
    simStatus === 'idle'
      ? 1
      : Math.min(1, simulatedDay / Math.max(1, params.horizonDays));

  const displayedProduced = Math.round(result.estimatedUnitsProduced * progressRatio);
  const displayedApproved = Math.round(result.projectedApproved * progressRatio);
  const displayedDefective = Math.round(result.projectedDefective * progressRatio);
  const displayedReprocessed = Math.round(result.projectedReprocessed * progressRatio);

  const handleStart = () => {
    if (simStatus === 'completed' || simulatedDay >= params.horizonDays) {
      setSimulatedDay(0);
    }
    setSimStatus('running');
  };

  const handlePause = () => {
    if (simStatus === 'running') setSimStatus('paused');
  };

  const handleReset = () => {
    setSimStatus('idle');
    setSimulatedDay(0);
    onResetParams();
  };

  const updateField = <K extends keyof SimulationParams>(key: K, val: number) => {
    const safeVal = Number.isFinite(val) ? val : 0;
    onChangeParams({ ...params, [key]: safeVal });
  };

  const chartConfig = useMemo(() => {
    const days = Array.from({ length: params.horizonDays }, (_, idx) => `Día ${idx + 1}`);
    const cumulativeProduced = days.map((_, idx) => {
      const targetAtDay = Math.min(
        result.estimatedUnitsProduced,
        Math.round(((idx + 1) / Math.max(1, params.horizonDays)) * result.estimatedUnitsProduced)
      );
      return simStatus === 'idle' || idx + 1 <= simulatedDay ? targetAtDay : null;
    });
    const demandLine = days.map(() => params.requestedGarments);

    return {
      type: 'line' as const,
      data: {
        labels: days,
        datasets: [
          {
            label: 'Producción acumulada estimada',
            data: cumulativeProduced,
            borderColor: '#6B4E3D',
            backgroundColor: 'rgba(107, 78, 61, 0.12)',
            fill: true,
            tension: 0.25,
          },
          {
            label: 'Meta solicitada',
            data: demandLine,
            borderColor: '#141210',
            borderDash: [5, 5],
            pointRadius: 0,
            tension: 0,
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
          y: { beginAtZero: true, grid: { color: 'rgba(20,18,16,0.06)' } },
          x: { grid: { display: false } },
        },
      },
    };
  }, [params.horizonDays, params.requestedGarments, result.estimatedUnitsProduced, simulatedDay, simStatus]);

  return (
    <div className="space-y-6">
      {/* Playback Controls & Status Bar */}
      <section className="flex flex-col gap-4 rounded-xl border border-[#E4DCD0] bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#141210]">
            Control de Simulación Operativa
          </h2>
          <p className="mt-0.5 text-xs text-[#5A5046]">
            {simStatus === 'idle' && 'Vista proyectada completa · Presiona Iniciar para simular día a día'}
            {simStatus === 'running' &&
              `Simulando jornada ${simulatedDay} de ${params.horizonDays} días...`}
            {simStatus === 'paused' &&
              `Simulación pausada en el día ${simulatedDay} de ${params.horizonDays}`}
            {simStatus === 'completed' &&
              `Simulación finalizada (${params.horizonDays} días evaluados)`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleStart}
            disabled={simStatus === 'running'}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#141210] px-4 text-sm font-medium text-[#FAF7F2] transition-colors hover:bg-[#2C2621] disabled:opacity-50"
          >
            <Play className="h-4 w-4" aria-hidden="true" />
            <span>Iniciar</span>
          </button>
          <button
            type="button"
            onClick={handlePause}
            disabled={simStatus !== 'running'}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#D8CEC0] bg-white px-4 text-sm font-medium text-[#141210] transition-colors hover:bg-[#F1ECE4] disabled:opacity-50"
          >
            <Pause className="h-4 w-4" aria-hidden="true" />
            <span>Pausar</span>
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#D8CEC0] bg-[#FAF7F2] px-4 text-sm font-medium text-[#141210] transition-colors hover:bg-[#E4DCD0]"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            <span>Reiniciar</span>
          </button>
        </div>
      </section>

      {/* Main Split: Editable Variables + Live Results */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Editable Parameters */}
        <section
          aria-label="Variables de simulación"
          className="rounded-xl border border-[#E4DCD0] bg-white p-6"
        >
          <h3 className="border-b border-[#E4DCD0] pb-3 text-lg font-semibold text-[#141210]">
            Variables de Entrada
          </h3>

          <div className="mt-4 space-y-4">
            <div>
              <div className="flex justify-between text-xs font-medium text-[#4A4036]">
                <label htmlFor="sim-req">Prendas solicitadas</label>
                <span className="font-mono text-[#141210]">{params.requestedGarments} und</span>
              </div>
              <input
                id="sim-req"
                type="number"
                min={1}
                max={2000}
                value={params.requestedGarments}
                onChange={(e) => updateField('requestedGarments', Number(e.target.value))}
                className="mt-1.5 h-9 w-full rounded-lg border border-[#D8CEC0] px-3 font-mono text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="sim-ops" className="block text-xs font-medium text-[#4A4036]">
                  N.º de operarios
                </label>
                <input
                  id="sim-ops"
                  type="number"
                  min={1}
                  max={100}
                  value={params.operators}
                  onChange={(e) => updateField('operators', Number(e.target.value))}
                  className="mt-1 h-9 w-full rounded-lg border border-[#D8CEC0] px-3 font-mono text-sm"
                />
              </div>
              <div>
                <label htmlFor="sim-hrs" className="block text-xs font-medium text-[#4A4036]">
                  Horas / día
                </label>
                <input
                  id="sim-hrs"
                  type="number"
                  min={1}
                  max={24}
                  value={params.workHoursPerDay}
                  onChange={(e) => updateField('workHoursPerDay', Number(e.target.value))}
                  className="mt-1 h-9 w-full rounded-lg border border-[#D8CEC0] px-3 font-mono text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="sim-min" className="block text-xs font-medium text-[#4A4036]">
                  Tiempo fab. (min/und)
                </label>
                <input
                  id="sim-min"
                  type="number"
                  min={5}
                  max={600}
                  value={params.manufacturingMinutesPerGarment}
                  onChange={(e) =>
                    updateField('manufacturingMinutesPerGarment', Number(e.target.value))
                  }
                  className="mt-1 h-9 w-full rounded-lg border border-[#D8CEC0] px-3 font-mono text-sm"
                />
              </div>
              <div>
                <label htmlFor="sim-days" className="block text-xs font-medium text-[#4A4036]">
                  Horizonte (días)
                </label>
                <input
                  id="sim-days"
                  type="number"
                  min={1}
                  max={60}
                  value={params.horizonDays}
                  onChange={(e) => updateField('horizonDays', Number(e.target.value))}
                  className="mt-1 h-9 w-full rounded-lg border border-[#D8CEC0] px-3 font-mono text-sm"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-[#4A4036]">
                <label htmlFor="sim-mat">Disponibilidad de materiales</label>
                <span className="font-mono text-[#141210]">{params.materialAvailabilityPct}%</span>
              </div>
              <input
                id="sim-mat"
                type="range"
                min={0}
                max={100}
                step={5}
                value={params.materialAvailabilityPct}
                onChange={(e) => updateField('materialAvailabilityPct', Number(e.target.value))}
                className="mt-1.5 w-full accent-[#6B4E3D]"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium text-[#4A4036]">
                <label htmlFor="sim-def">Porcentaje esperado de defectos</label>
                <span className="font-mono text-[#991B1B]">{params.expectedDefectPct}%</span>
              </div>
              <input
                id="sim-def"
                type="range"
                min={0}
                max={30}
                step={0.5}
                value={params.expectedDefectPct}
                onChange={(e) => updateField('expectedDefectPct', Number(e.target.value))}
                className="mt-1.5 w-full accent-[#991B1B]"
              />
            </div>
          </div>
        </section>

        {/* Computed Outputs + Chart */}
        <section className="space-y-6 xl:col-span-2">
          {/* Output KPIs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-[#E4DCD0] bg-white p-4">
              <span className="text-xs text-[#6B5E52]">Capacidad productiva</span>
              <div className="mt-1.5 font-mono text-xl font-semibold tabular-nums text-[#141210]">
                {result.dailyCapacityUnits} und/día
              </div>
              <p className="mt-1 text-xs text-[#5A5046]">
                {result.horizonCapacityUnits} und en {params.horizonDays}d
              </p>
            </div>

            <div className="rounded-xl border border-[#E4DCD0] bg-white p-4">
              <span className="text-xs text-[#6B5E52]">Cumplimiento estimado</span>
              <div
                className={`mt-1.5 font-mono text-xl font-semibold tabular-nums ${
                  result.fulfillmentPct >= 95 ? 'text-[#4A5D4E]' : 'text-[#B45309]'
                }`}
              >
                {result.fulfillmentPct}%
              </div>
              <p className="mt-1 text-xs text-[#5A5046]">
                {displayedProduced} / {params.requestedGarments} prendas
              </p>
            </div>

            <div className="rounded-xl border border-[#E4DCD0] bg-white p-4">
              <span className="text-xs text-[#6B5E52]">Calidad proyectada</span>
              <div className="mt-1.5 font-mono text-xl font-semibold tabular-nums text-[#4A5D4E]">
                {result.projectedApprovalPct}%
              </div>
              <p className="mt-1 text-xs text-[#5A5046]">
                {displayedApproved} OK · {displayedDefective} def · {displayedReprocessed} rep
              </p>
            </div>

            <div className="rounded-xl border border-[#E4DCD0] bg-white p-4">
              <span className="text-xs text-[#6B5E52]">Tiempo requerido</span>
              <div className="mt-1.5 font-mono text-xl font-semibold tabular-nums text-[#141210]">
                {result.requiredDays} días
              </div>
              <p className="mt-1 text-xs text-[#5A5046]">
                Faltante entrega: {result.unitsPendingShortfall} und
              </p>
            </div>
          </div>

          {/* Bottleneck Alert */}
          <div className="rounded-xl border border-[#E4DCD0] bg-[#FAF7F2] px-5 py-3.5 text-sm">
            <span className="font-semibold text-[#141210]">Restricción principal detectada: </span>
            <span className="text-[#6B4E3D]">{result.bottleneck}</span>
          </div>

          {/* Chart */}
          <div className="rounded-xl border border-[#E4DCD0] bg-white p-6">
            <h3 className="mb-1 text-lg font-semibold text-[#141210]">
              Curva de Avance Productivo vs Demanda
            </h3>
            <p className="mb-4 text-xs text-[#6B5E52]">
              Cálculo en tiempo real considerando capacidad instalada y disponibilidad de insumos
            </p>
            <ChartCanvas
              config={chartConfig}
              heightClass="h-56"
              ariaLabel="Gráfica de simulación de avance productivo"
              testId="chart-simulator-curve"
            />
          </div>

          {/* Materials Requirement Table */}
          <div className="rounded-xl border border-[#E4DCD0] bg-white">
            <div className="border-b border-[#E4DCD0] px-5 py-3.5">
              <h3 className="text-base font-semibold text-[#141210]">
                Balance Simulado de Materiales ({params.materialAvailabilityPct}% disponibilidad)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#E4DCD0] bg-[#FAF7F2] text-xs text-[#6B5E52]">
                    <th className="px-4 py-2.5 font-medium">Categoría de material</th>
                    <th className="px-4 py-2.5 text-right font-medium">Requerido</th>
                    <th className="px-4 py-2.5 text-right font-medium">Disponible</th>
                    <th className="px-4 py-2.5 text-right font-medium">Faltante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1ECE4]">
                  {result.materialsRequired.map((m) => (
                    <tr key={m.materialName}>
                      <td className="px-4 py-2.5 font-medium text-[#141210]">{m.materialName}</td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                        {m.required} {m.unit}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums text-[#5A5046]">
                        {m.available} {m.unit}
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right font-mono font-medium tabular-nums ${
                          m.shortage > 0 ? 'text-[#991B1B]' : 'text-[#4A5D4E]'
                        }`}
                      >
                        {m.shortage > 0 ? `${m.shortage} ${m.unit}` : 'Cubierto'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
