import { useEffect, useRef } from 'react';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

interface ChartCanvasProps {
  config: ChartConfiguration;
  heightClass?: string;
  ariaLabel: string;
  testId?: string;
}

export function ChartCanvas({
  config,
  heightClass = 'h-64',
  ariaLabel,
  testId,
}: ChartCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    chartRef.current = new Chart(ctx, {
      ...config,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 250 },
        ...config.options,
      },
    } as ChartConfiguration);

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [config]);

  return (
    <div className={`relative w-full ${heightClass}`} data-testid={testId}>
      <canvas ref={canvasRef} aria-label={ariaLabel} role="img" />
    </div>
  );
}
