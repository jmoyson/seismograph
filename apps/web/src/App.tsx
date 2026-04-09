import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Globe } from './features/globe/Globe';
import { EarthquakeList } from './features/earthquake-list/EarthquakeList';
import { EarthquakeDetail } from './features/earthquake-detail/EarthquakeDetail';
import { StatsDashboard } from './features/statistics/StatsDashboard';
import { useEarthquakes } from './hooks/useEarthquakes';
import type { Earthquake } from '@seismograph/shared';

const queryClient = new QueryClient();

function AppContent() {
  const [selected, setSelected] = useState<Earthquake | null>(null);
  const [filters, setFilters] = useState({ days: 7, minMagnitude: 2.5 });
  const { earthquakes, isLoading, isConnected } = useEarthquakes(filters);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <Globe earthquakes={earthquakes} onEarthquakeClick={setSelected} />

      {/* SSE indicator */}
      <div style={{
        position: 'absolute', top: 16, right: 16,
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'rgba(0,0,0,0.7)', color: 'white',
        padding: '8px 16px', borderRadius: 20, fontSize: 14,
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: isConnected ? '#4caf50' : '#f44336',
        }} />
        {isConnected ? 'Live' : 'Connecting...'}
      </div>

      {/* Side panel */}
      <div style={{
        position: 'absolute', top: 0, left: 0, width: 360, height: '100vh',
        background: 'rgba(0,0,0,0.85)', color: 'white', overflowY: 'auto', padding: 16,
      }}>
        <h1 style={{ fontSize: 20, margin: '0 0 8px' }}>Seismograph</h1>
        <p style={{ fontSize: 12, color: '#aaa', margin: '0 0 16px' }}>
          {earthquakes.length} seismes - {filters.days}j
        </p>

        <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
          <select
            value={filters.days}
            onChange={(e) => setFilters((f) => ({ ...f, days: Number(e.target.value) }))}
            style={{ background: '#333', color: 'white', border: 'none', padding: 8, borderRadius: 4 }}
          >
            <option value={1}>24h</option>
            <option value={7}>7 jours</option>
            <option value={30}>30 jours</option>
          </select>
          <select
            value={filters.minMagnitude}
            onChange={(e) => setFilters((f) => ({ ...f, minMagnitude: Number(e.target.value) }))}
            style={{ background: '#333', color: 'white', border: 'none', padding: 8, borderRadius: 4 }}
          >
            <option value={2.5}>M2.5+</option>
            <option value={4}>M4+</option>
            <option value={5}>M5+</option>
            <option value={6}>M6+</option>
          </select>
        </div>

        {isLoading ? <p>Chargement...</p> : (
          <EarthquakeList
            earthquakes={earthquakes}
            onSelect={setSelected}
            selectedId={selected?.id}
          />
        )}
      </div>

      {selected && (
        <EarthquakeDetail earthquake={selected} onClose={() => setSelected(null)} />
      )}

      <StatsDashboard days={filters.days} />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
