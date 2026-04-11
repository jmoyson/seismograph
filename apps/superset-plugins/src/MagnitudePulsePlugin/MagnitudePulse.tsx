import { useMemo, useState } from 'react';
import { getColorByMetric } from '../shared/colors';
import { MagnitudePulseProps } from './types';

const PADDING = { top: 40, right: 40, bottom: 60, left: 40 };
const MIN_RADIUS = 4;
const MAX_RADIUS = 40;

interface PlottedPoint {
  x: number;
  y: number;
  r: number;
  color: string;
  label: string;
  metric: number;
  time: string;
  delay: number;
}

export default function MagnitudePulse({ width, height, data }: MagnitudePulseProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const { points, timeTicks } = useMemo(() => {
    if (!data.length) {
      return { points: [] as PlottedPoint[], timeTicks: [] as { x: number; label: string }[] };
    }

    const times = data.map((d) => new Date(d.time).getTime());
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const metrics = data.map((d) => d.metric);
    const minMetric = Math.min(...metrics);
    const maxMetric = Math.max(...metrics);

    const innerWidth = Math.max(1, width - PADDING.left - PADDING.right);
    const innerHeight = Math.max(1, height - PADDING.top - PADDING.bottom);
    const timeRange = Math.max(1, maxTime - minTime);
    const metricRange = Math.max(1e-9, maxMetric - minMetric);

    const timeScale = (t: number) =>
      PADDING.left + ((t - minTime) / timeRange) * innerWidth;

    const points: PlottedPoint[] = data.map((d, i) => {
      const t = new Date(d.time).getTime();
      const norm = (d.metric - minMetric) / metricRange;
      return {
        x: timeScale(t),
        y: PADDING.top + innerHeight / 2,
        r: MIN_RADIUS + norm * (MAX_RADIUS - MIN_RADIUS),
        color: getColorByMetric(d.colorMetric),
        label: d.label,
        metric: d.metric,
        time: d.time,
        delay: (i / data.length) * 2,
      };
    });

    const tickCount = Math.max(2, Math.min(8, Math.floor(width / 120)));
    const timeTicks = Array.from({ length: tickCount }, (_, i) => {
      const t = minTime + (i / (tickCount - 1)) * timeRange;
      return {
        x: timeScale(t),
        label: new Date(t).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'short',
        }),
      };
    });

    return { points, timeTicks };
  }, [data, width, height]);

  if (!data.length) {
    return (
      <div
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#888',
          background: '#1a1a2e',
          borderRadius: 8,
        }}
      >
        No data available
      </div>
    );
  }

  const hovered = hoveredIndex !== null ? points[hoveredIndex] : null;

  return (
    <div
      style={{
        width,
        height,
        position: 'relative',
        background: '#1a1a2e',
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes seismograph-pulse {
          0% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
          100% { opacity: 0.6; transform: scale(1); }
        }
        .seismograph-pulse-dot {
          animation: seismograph-pulse 2s ease-in-out infinite;
          transform-origin: center;
          transform-box: fill-box;
          cursor: pointer;
          transition: filter 0.2s;
        }
        .seismograph-pulse-dot:hover {
          filter: brightness(1.5);
        }
      `}</style>

      <svg width={width} height={height}>
        <line
          x1={PADDING.left}
          y1={height - PADDING.bottom}
          x2={width - PADDING.right}
          y2={height - PADDING.bottom}
          stroke="#333"
          strokeWidth={1}
        />

        {timeTicks.map((tick, i) => (
          <g key={`tick-${i}`}>
            <line
              x1={tick.x}
              y1={height - PADDING.bottom}
              x2={tick.x}
              y2={height - PADDING.bottom + 6}
              stroke="#555"
            />
            <text
              x={tick.x}
              y={height - PADDING.bottom + 20}
              textAnchor="middle"
              fill="#888"
              fontSize={11}
            >
              {tick.label}
            </text>
          </g>
        ))}

        {points.map((point, i) => (
          <circle
            key={`pt-${i}`}
            className="seismograph-pulse-dot"
            cx={point.x}
            cy={point.y}
            r={point.r}
            fill={point.color}
            opacity={0.7}
            style={{ animationDelay: `${point.delay}s` }}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
          />
        ))}
      </svg>

      {hovered && (
        <div
          style={{
            position: 'absolute',
            left: Math.min(hovered.x + 10, width - 200),
            top: Math.max(0, hovered.y - 60),
            background: 'rgba(0,0,0,0.9)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: 6,
            fontSize: 12,
            pointerEvents: 'none',
            border: `1px solid ${hovered.color}`,
            zIndex: 10,
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{hovered.label}</div>
          <div>Value: {hovered.metric.toFixed(1)}</div>
          <div style={{ color: '#aaa' }}>
            {new Date(hovered.time).toLocaleString('fr-FR')}
          </div>
        </div>
      )}
    </div>
  );
}
