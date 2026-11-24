import { useMemo, useState } from 'react';
import { CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { ProductionOrder, QualityInspection } from '../types/elvora';
import { computeQualityMetrics } from '../utils/calculations';
import { ChartCanvas } from './ChartCanvas';

interface QualityViewProps {
  inspections: QualityInspection[];
  orders: ProductionOrder[];
  onAddInspection: (item: Omit<QualityInspection, 'id'>) => void;
  onDeleteInspection: (id: string) => void;
}

export function QualityView({
  inspections,
  orders,
  onAddInspection,
  onDeleteInspection,
}: QualityViewProps) {
  const [date, setDate] = useState('2026-11-22');
  const [orderCode, setOrderCode] = useState(orders[0]?.orderCode ?? 'OP-2026-01');
  const [garmentType, setGarmentType] = useState(
    orders[0]?.garmentType ?? 'Blazer Élvora Clásico Crema'
  );
  const [inspected, setInspected] = useState(20);
  const [approved, setApproved] = useState(19);
  const [defective, setDefective] = useState(1);
  const [reprocessed, setReprocessed] = useState(1);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const metrics = useMemo(() => computeQualityMetrics(inspections), [inspections]);

  const doughnutConfig = useMemo(
    () => ({
      type: 'doughnut' as const,
      data: {
        labels: ['Aprobadas', 'Defectuosas descartadas', 'Reprocesadas'],
        datasets: [
          {
            data: [
              metrics.totalApproved,
              Math.max(0, metrics.totalDefective - metrics.totalReprocessed),
              metrics.totalReprocessed,
            ],
            backgroundColor: ['#4A5D4E', '#991B1B', '#B45309'],
            borderColor: '#FFFFFF',
            borderWidth: 2,
          },
        ],
      },
      options: {
        cutout: '64%',
        plugins: {
          legend: {
            position: 'bottom' as const,
            labels: { color: '#141210', boxWidth: 12, font: { size: 11 } },
          },
        },
      },
    }),
    [metrics]
  );

  const barConfig = useMemo(
    () => ({
      type: 'bar' as const,
      data: {
        labels: inspections.map((i) => `${i.orderCode} (${i.date.slice(5)})`),
        datasets: [
          {
            label: 'Aprobadas',
            data: inspections.map((i) => i.approved),
            backgroundColor: '#4A5D4E',
            borderRadius: 4,
          },
          {
            label: 'Defectuosas',
            data: inspections.map((i) => i.defective),
            backgroundColor: '#991B1B',
            borderRadius: 4,
          },
          {
            label: 'Reprocesadas',
            data: inspections.map((i) => i.reprocessed),
            backgroundColor: '#B45309',
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
          y: { beginAtZero: true, grid: { color: 'rgba(20,18,16,0.06)' } },
          x: { grid: { display: false } },
        },
      },
    }),
    [inspections]
  );

  const handleOrderSelect = (code: string) => {
    setOrderCode(code);
    const found = orders.find((o) => o.orderCode === code);
    if (found) setGarmentType(found.garmentType);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inspected <= 0) {
      setError('La cantidad inspeccionada debe ser mayor a cero.');
      return;
    }
    if (approved < 0 || defective < 0 || reprocessed < 0) {
      setError('Ninguna cantidad puede ser negativa.');
      return;
    }
    if (approved + defective > inspected) {
      setError('La suma de aprobadas y defectuosas no puede superar el total inspeccionado.');
      return;
    }
    if (reprocessed > defective) {
      setError('Las prendas reprocesadas no pueden superar a las defectuosas.');
      return;
    }

    setError('');
    onAddInspection({
      date,
      orderCode: orderCode.trim() || 'LOTE-LIBRE',
      garmentType: garmentType.trim() || 'Prenda Élvora',
      inspected,
      approved,
      defective,
      reprocessed,
      notes: notes.trim(),
      isDemo: false,
    });
    setNotes('');
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[#E4DCD0] bg-white p-5">
          <span className="text-xs text-[#6B5E52]">Prendas inspeccionadas</span>
          <div className="mt-2 font-mono text-2xl font-semibold tabular-nums text-[#141210]">
            {metrics.totalInspected}
          </div>
          <p className="mt-1 text-xs text-[#5A5046]">{inspections.length} inspecciones registradas</p>
        </div>

        <div className="rounded-xl border border-[#E4DCD0] bg-white p-5">
          <span className="text-xs text-[#6B5E52]">Porcentaje de aprobación</span>
          <div className="mt-2 font-mono text-2xl font-semibold tabular-nums text-[#4A5D4E]">
            {metrics.approvalPct}%
          </div>
          <p className="mt-1 text-xs text-[#5A5046]">{metrics.totalApproved} prendas aprobadas</p>
        </div>

        <div className="rounded-xl border border-[#E4DCD0] bg-white p-5">
          <span className="text-xs text-[#6B5E52]">Porcentaje de defectos</span>
          <div className="mt-2 font-mono text-2xl font-semibold tabular-nums text-[#991B1B]">
            {metrics.defectPct}%
          </div>
          <p className="mt-1 text-xs text-[#5A5046]">{metrics.totalDefective} prendas con defecto</p>
        </div>

        <div className="rounded-xl border border-[#E4DCD0] bg-white p-5">
          <span className="text-xs text-[#6B5E52]">Porcentaje de reprocesos</span>
          <div className="mt-2 font-mono text-2xl font-semibold tabular-nums text-[#B45309]">
            {metrics.reprocessPct}%
          </div>
          <p className="mt-1 text-xs text-[#5A5046]">{metrics.totalReprocessed} prendas reprocesadas</p>
        </div>
      </section>

      {/* Form + Charts */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-[#E4DCD0] bg-white p-6"
        >
          <div className="flex items-center gap-2 border-b border-[#E4DCD0] pb-3">
            <CheckCircle2 className="h-4 w-4 text-[#4A5D4E]" aria-hidden="true" />
            <h2 className="text-xl font-semibold text-[#141210]">Registrar Inspección</h2>
          </div>

          {error && (
            <p className="mt-3 rounded-md bg-[#FDF2F2] px-3 py-2 text-xs font-medium text-[#991B1B]">
              {error}
            </p>
          )}

          <div className="mt-4 space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="qc-date" className="block text-xs font-medium text-[#4A4036]">
                  Fecha
                </label>
                <input
                  id="qc-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-[#D8CEC0] px-2.5 font-mono text-xs"
                />
              </div>
              <div>
                <label htmlFor="qc-order" className="block text-xs font-medium text-[#4A4036]">
                  Orden asociada
                </label>
                <select
                  id="qc-order"
                  value={orderCode}
                  onChange={(e) => handleOrderSelect(e.target.value)}
                  className="mt-1 h-9 w-full rounded-lg border border-[#D8CEC0] bg-white px-2.5 font-mono text-xs"
                >
                  {orders.map((o) => (
                    <option key={o.id} value={o.orderCode}>
                      {o.orderCode}
                    </option>
                  ))}
                  <option value="LOTE-LIBRE">Lote independiente</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="qc-garment" className="block text-xs font-medium text-[#4A4036]">
                Prenda inspeccionada
              </label>
              <input
                id="qc-garment"
                type="text"
                required
                value={garmentType}
                onChange={(e) => setGarmentType(e.target.value)}
                className="mt-1 h-9 w-full rounded-lg border border-[#D8CEC0] px-3 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="qc-insp" className="block text-xs font-medium text-[#4A4036]">
                  Inspeccionadas
                </label>
                <input
                  id="qc-insp"
                  type="number"
                  min={1}
                  required
                  value={inspected}
                  onChange={(e) => setInspected(Number(e.target.value))}
                  className="mt-1 h-9 w-full rounded-lg border border-[#D8CEC0] px-3 font-mono text-sm"
                />
              </div>
              <div>
                <label htmlFor="qc-appr" className="block text-xs font-medium text-[#4A4036]">
                  Aprobadas
                </label>
                <input
                  id="qc-appr"
                  type="number"
                  min={0}
                  required
                  value={approved}
                  onChange={(e) => setApproved(Number(e.target.value))}
                  className="mt-1 h-9 w-full rounded-lg border border-[#D8CEC0] px-3 font-mono text-sm"
                />
              </div>
              <div>
                <label htmlFor="qc-def" className="block text-xs font-medium text-[#4A4036]">
                  Defectuosas
                </label>
                <input
                  id="qc-def"
                  type="number"
                  min={0}
                  required
                  value={defective}
                  onChange={(e) => setDefective(Number(e.target.value))}
                  className="mt-1 h-9 w-full rounded-lg border border-[#D8CEC0] px-3 font-mono text-sm"
                />
              </div>
              <div>
                <label htmlFor="qc-rep" className="block text-xs font-medium text-[#4A4036]">
                  Reprocesadas
                </label>
                <input
                  id="qc-rep"
                  type="number"
                  min={0}
                  required
                  value={reprocessed}
                  onChange={(e) => setReprocessed(Number(e.target.value))}
                  className="mt-1 h-9 w-full rounded-lg border border-[#D8CEC0] px-3 font-mono text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="qc-notes" className="block text-xs font-medium text-[#4A4036]">
                Observaciones técnicas
              </label>
              <input
                id="qc-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Ajuste en costura ojal..."
                className="mt-1 h-9 w-full rounded-lg border border-[#D8CEC0] px-3 text-sm"
              />
            </div>

            <button
              type="submit"
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#141210] px-4 text-sm font-medium text-[#FAF7F2] hover:bg-[#2C2621]"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Registrar inspección</span>
            </button>
          </div>
        </form>

        <div className="rounded-xl border border-[#E4DCD0] bg-white p-6">
          <h2 className="mb-1 text-xl font-semibold text-[#141210]">Distribución Global</h2>
          <p className="mb-4 text-xs text-[#6B5E52]">Proporción aprobadas vs defectos y reprocesos</p>
          <ChartCanvas
            config={doughnutConfig}
            heightClass="h-64"
            ariaLabel="Gráfica de distribución global de calidad"
            testId="chart-quality-doughnut"
          />
        </div>

        <div className="rounded-xl border border-[#E4DCD0] bg-white p-6">
          <h2 className="mb-1 text-xl font-semibold text-[#141210]">Resultados por Lote</h2>
          <p className="mb-4 text-xs text-[#6B5E52]">Comparativo histórico por orden inspeccionada</p>
          <ChartCanvas
            config={barConfig}
            heightClass="h-64"
            ariaLabel="Gráfica de barras por lote de inspección"
            testId="chart-quality-bar"
          />
        </div>
      </section>

      {/* Inspection Log Table */}
      <section className="rounded-xl border border-[#E4DCD0] bg-white">
        <div className="border-b border-[#E4DCD0] px-6 py-4">
          <h2 className="text-xl font-semibold text-[#141210]">Historial de Inspecciones</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#E4DCD0] bg-[#FAF7F2] text-xs text-[#6B5E52]">
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Orden</th>
                <th className="px-4 py-3 font-medium">Prenda</th>
                <th className="px-4 py-3 text-right font-medium">Inspecc.</th>
                <th className="px-4 py-3 text-right font-medium">Aprobadas</th>
                <th className="px-4 py-3 text-right font-medium">Defectuosas</th>
                <th className="px-4 py-3 text-right font-medium">Reprocesadas</th>
                <th className="px-4 py-3 text-right font-medium">% Aprob.</th>
                <th className="px-4 py-3 font-medium">Observaciones</th>
                <th className="px-4 py-3 text-right font-medium">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1ECE4]">
              {inspections.map((item) => {
                const pct =
                  item.inspected > 0
                    ? ((item.approved / item.inspected) * 100).toFixed(1)
                    : '0.0';
                return (
                  <tr key={item.id} className="hover:bg-[#FAF7F2]">
                    <td className="px-4 py-3 font-mono text-xs text-[#5A5046]">{item.date}</td>
                    <td className="px-4 py-3 font-mono text-xs font-medium text-[#141210]">
                      {item.orderCode}
                    </td>
                    <td className="px-4 py-3 font-medium text-[#141210]">{item.garmentType}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {item.inspected}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-[#4A5D4E]">
                      {item.approved}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-[#991B1B]">
                      {item.defective}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-[#B45309]">
                      {item.reprocessed}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium tabular-nums">
                      {pct}%
                    </td>
                    <td className="px-4 py-3 text-xs text-[#5A5046]">{item.notes || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onDeleteInspection(item.id)}
                        aria-label={`Eliminar inspección ${item.orderCode}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#E4DCD0] text-[#5A5046] hover:bg-[#FDF2F2] hover:text-[#991B1B]"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
