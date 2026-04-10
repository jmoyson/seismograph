import { getColorByMagnitude, timeAgo } from '../../shared/utils/formatting';
import type { Earthquake } from '@seismograph/shared';

interface Props {
  earthquake: Earthquake;
  isSelected: boolean;
  onClick: () => void;
}

export function EarthquakeItem({ earthquake, isSelected, onClick }: Props) {
  const { magnitude, place, time, depth } = earthquake;
  return (
    <div onClick={onClick} style={{
      padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
      background: isSelected ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
      borderLeft: `3px solid ${getColorByMagnitude(magnitude)}`,
      transition: 'background 0.2s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 18, fontWeight: 'bold', color: getColorByMagnitude(magnitude) }}>
          M{magnitude.toFixed(1)}
        </span>
        <span style={{ fontSize: 11, color: '#888' }}>{timeAgo(time)}</span>
      </div>
      <div style={{ fontSize: 13, color: '#ccc', marginTop: 4 }}>{place}</div>
      <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>Profondeur : {depth.toFixed(1)} km</div>
    </div>
  );
}
