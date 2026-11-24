import { useMemo, useState } from 'react';
import { FileSpreadsheet, FileText, Sparkles } from 'lucide-react';
import { AppStoreData, GroundedRecommendation } from '../types/elvora';
import { generateDataGroundedAnalysis } from '../utils/calculations';
import { exportReportExcel, exportReportPDF, ReportScope } from '../utils/exporters';

interface AnalysisReportsViewProps {
  data: AppStoreData;
}

const REPORT_CARDS: Array<{
  scope: ReportScope;
  title: string;
  description: string;
}> = [
  {
    scope: 'completo',
    title: 'Reporte Ejecutivo Consolidado',
    description: 'KPIs generales, inventario, proveedores, clientes, producción, calidad y diagnóstico.',
  },
  {
    scope: 'inventario',
    title: 'Inventario de Materiales y Prendas',
    description: 'Stock disponible, mínimos, costos unitarios y alertas de reposición.',
  },
  {
    scope: 'proveedores',
    title: 'Directorio de Proveedores',
    description: 'Empresas, contactos, WhatsApp, tiempos de entrega y precios por material.',
  },
  {
    scope: 'clientes',
    title: 'Gestión y Segmentación de Clientes',
    description: 'Categorías comerciales, compras acumuladas y fechas de seguimiento.',
  },
  {
    scope: 'produccion',
    title: 'Órdenes de Producción y Pedidos',
    description: 'Pedidos registrados, fechas de entrega, estados y consumo de inventario.',
  },
  {
    scope: 'calidad',
    title: 'Control de Calidad y Reprocesos',
    description: 'Inspecciones por lote con porcentajes de aprobación, defectos y reprocesos.',
  },
];

export function AnalysisReportsView({ data }: AnalysisReportsViewProps) {
  const [areaFilter, setAreaFilter] = useState<'Todas' | GroundedRecommendation['area']>('Todas');
  const [exportStatus, setExportStatus] = useState<string>('');

  const recommendations = useMemo(() => generateDataGroundedAnalysis(data), [data]);

  const filteredRecs = useMemo(
    () =>
      areaFilter === 'Todas'
        ? recommendations
        : recommendations.filter((r) => r.area === areaFilter),
    [recommendations, areaFilter]
  );

  const handleExportPDF = (scope: ReportScope) => {
    exportReportPDF(data, scope);
    setExportStatus(`Archivo PDF (${scope}) generado y descargado correctamente.`);
  };

  const handleExportExcel = async (scope: ReportScope) => {
    await exportReportExcel(data, scope);
    setExportStatus(`Archivo Excel (.xlsx · ${scope}) generado y descargado correctamente.`);
  };

  return (
    <div className="space-y-8">
      {/* Grounded Automatic AI Analysis */}
      <section aria-label="Análisis automático basado en datos">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#6B4E3D]" aria-hidden="true" />
            <div>
              <h2 className="text-2xl font-semibold text-[#141210]">
                Análisis Inteligente Basado en Registros Reales
              </h2>
              <p className="text-xs text-[#5A5046]">
                Cada diagnóstico cita únicamente cifras e ítems verificados en el sistema actual
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(['Todas', 'Producción', 'Inventario', 'Calidad', 'Clientes'] as const).map(
              (area) => (
                <button
                  key={area}
                  type="button"
                  onClick={() => setAreaFilter(area)}
                  className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    areaFilter === area
                      ? 'bg-[#141210] text-[#FAF7F2]'
                      : 'border border-[#E4DCD0] bg-white text-[#5A5046] hover:text-[#141210]'
                  }`}
                >
                  {area}
                </button>
              )
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredRecs.map((rec) => (
            <article
              key={rec.id}
              className="rounded-xl border border-[#E4DCD0] bg-white p-5"
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-[#6B4E3D]">{rec.area}</span>
                <span
                  className={`font-medium ${
                    rec.priority === 'Alta'
                      ? 'text-[#991B1B]'
                      : rec.priority === 'Media'
                        ? 'text-[#B45309]'
                        : 'text-[#4A5D4E]'
                  }`}
                >
                  Prioridad {rec.priority}
                </span>
              </div>
              <h3 className="mt-1.5 text-lg font-semibold text-[#141210]">{rec.title}</h3>
              <p className="mt-2 rounded-lg bg-[#FAF7F2] p-3 text-xs leading-relaxed text-[#4A4036]">
                <strong className="text-[#141210]">Evidencia registrada: </strong>
                {rec.evidence}
              </p>
              <p className="mt-2.5 text-sm leading-relaxed text-[#2C2621]">
                <strong className="text-[#6B4E3D]">Recomendación: </strong>
                {rec.recommendation}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* PDF & Excel Export Center */}
      <section aria-label="Centro de exportación de reportes">
        <div className="mb-4">
          <h2 className="text-2xl font-semibold text-[#141210]">
            Generación de Reportes Oficiales (PDF y Excel)
          </h2>
          <p className="text-xs text-[#5A5046]">
            Descarga informes estructurados listos para auditoría, gerencia o entrega académica
          </p>
        </div>

        {exportStatus && (
          <div
            role="status"
            className="mb-4 rounded-xl border border-[#B7C9BA] bg-[#F3F7F4] px-4 py-3 text-sm text-[#2F4533]"
          >
            {exportStatus}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {REPORT_CARDS.map((card) => (
            <div
              key={card.scope}
              className="flex flex-col justify-between rounded-xl border border-[#E4DCD0] bg-white p-5"
            >
              <div>
                <h3 className="text-base font-semibold text-[#141210]">{card.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#5A5046]">
                  {card.description}
                </p>
              </div>
              <div className="mt-5 flex gap-2.5 border-t border-[#F1ECE4] pt-4">
                <button
                  type="button"
                  onClick={() => handleExportPDF(card.scope)}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#141210] px-3 py-2 text-xs font-medium text-[#FAF7F2] hover:bg-[#2C2621]"
                >
                  <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Descargar PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportExcel(card.scope)}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#D8CEC0] bg-[#FAF7F2] px-3 py-2 text-xs font-medium text-[#141210] hover:bg-[#E4DCD0]"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-[#4A5D4E]" aria-hidden="true" />
                  <span>Descargar Excel</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
