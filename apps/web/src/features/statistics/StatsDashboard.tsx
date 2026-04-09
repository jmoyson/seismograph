import { useStatistics } from '../../hooks/useStatistics';

export function StatsDashboard({ days }: { days: number }) {
  const { data: stats, isLoading } = useStatistics(days);
  if (isLoading || !stats) return null;

  return (
    <div style={{
      position: 'absolute', bottom: 16, right: 16,
      background: 'rgba(0,0,0,0.85)', color: 'white', borderRadius: 12, padding: 16,
      minWidth: 200, fontSize: 13,
    }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 14 }}>Stats ({days}j)</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Row label="Total" value={stats.totalCount} />
        <Row label="Mag. moyenne" value={stats.avgMagnitude} />
        <Row label="Mag. max" value={stats.maxMagnitude} highlight />
        <Row label="Alertes tsunami" value={stats.tsunamiAlerts} />
        <Row label="M5+" value={stats.significantCount} />
      </div>
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>Distribution</div>
        {stats.distribution.map((d) => (
          <div key={d.range} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ width: 30, fontSize: 11, color: '#aaa' }}>M{d.range}</span>
            <div style={{
              height: 12, borderRadius: 2, background: '#64b5f6',
              width: `${Math.max(4, (d.count / stats.totalCount) * 100)}%`,
              transition: 'width 0.5s',
            }} />
            <span style={{ fontSize: 11, color: '#888' }}>{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: '#aaa' }}>{label}</span>
      <span style={{ fontWeight: highlight ? 'bold' : 'normal', color: highlight ? '#ff7043' : 'white' }}>
        {typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(1) : value}
      </span>
    </div>
  );
}
