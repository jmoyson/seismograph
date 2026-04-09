import { EarthquakeItem } from './EarthquakeItem';
import type { Earthquake } from '@seismograph/shared';

interface Props {
  earthquakes: Earthquake[];
  onSelect: (eq: Earthquake) => void;
  selectedId?: string;
}

export function EarthquakeList({ earthquakes, onSelect, selectedId }: Props) {
  if (!earthquakes.length) return <p style={{ color: '#888' }}>Aucun seisme</p>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {earthquakes.map((eq) => (
        <EarthquakeItem
          key={eq.id}
          earthquake={eq}
          isSelected={eq.id === selectedId}
          onClick={() => onSelect(eq)}
        />
      ))}
    </div>
  );
}
