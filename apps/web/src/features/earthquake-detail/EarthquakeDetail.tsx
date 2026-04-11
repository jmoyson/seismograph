import { getColorByMagnitude } from '../../shared/utils/formatting';
import type { Earthquake } from '@seismograph/shared';

interface Props {
  earthquake: Earthquake;
  onClose: () => void;
}

export function EarthquakeDetail({ earthquake, onClose }: Props) {
  const { magnitude, place, time, depth, latitude, longitude, tsunami, url } = earthquake;
  return (
    <div style={{
      position: 'absolute', bottom: 16, left: 376, width: 400,
      background: 'rgba(0,0,0,0.9)', color: 'white', borderRadius: 12, padding: 20,
      border: `1px solid ${getColorByMagnitude(magnitude)}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: 28, fontWeight: 'bold', color: getColorByMagnitude(magnitude) }}>
            M{magnitude.toFixed(1)}
          </span>
          {tsunami && (
            <span style={{
              background: '#e53935', color: 'white', fontSize: 10,
              padding: '2px 6px', borderRadius: 4, marginLeft: 8,
            }}>
              TSUNAMI
            </span>
          )}
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: '#888', fontSize: 20, cursor: 'pointer',
        }}>
          X
        </button>
      </div>
      <h3 style={{ margin: '8px 0 16px', fontSize: 16, fontWeight: 'normal' }}>{place}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
        <div>
          <div style={{ color: '#888' }}>Date</div>
          <div>{new Date(time).toLocaleString('fr-FR')}</div>
        </div>
        <div>
          <div style={{ color: '#888' }}>Profondeur</div>
          <div>{depth.toFixed(1)} km</div>
        </div>
        <div>
          <div style={{ color: '#888' }}>Latitude</div>
          <div>{latitude.toFixed(4)}</div>
        </div>
        <div>
          <div style={{ color: '#888' }}>Longitude</div>
          <div>{longitude.toFixed(4)}</div>
        </div>
      </div>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'block', marginTop: 16, color: '#64b5f6', fontSize: 13 }}
        >
          Voir sur USGS
        </a>
      )}
    </div>
  );
}
