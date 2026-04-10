import { useRef, useMemo, useCallback } from 'react';
import GlobeGL from 'react-globe.gl';
import { getColorByMagnitude } from '../../shared/utils/formatting';
import { getSizeByMagnitude, getAltByMagnitude } from './globe.utils';
import type { Earthquake } from '@seismograph/shared';

interface GlobeProps {
  earthquakes: Earthquake[];
  onEarthquakeClick?: (eq: Earthquake) => void;
}

export function Globe({ earthquakes, onEarthquakeClick }: GlobeProps) {
  const globeRef = useRef<any>(null);

  const pointsData = useMemo(() =>
    earthquakes.map((eq) => ({
      ...eq,
      lat: eq.latitude,
      lng: eq.longitude,
      color: getColorByMagnitude(eq.magnitude),
      size: getSizeByMagnitude(eq.magnitude),
      altitude: getAltByMagnitude(eq.magnitude),
      label: `${eq.place}\nM${eq.magnitude} — ${eq.depth.toFixed(1)}km`,
    })),
    [earthquakes],
  );

  const handlePointClick = useCallback((point: any) => {
    onEarthquakeClick?.(point);
    globeRef.current?.pointOfView(
      { lat: point.lat, lng: point.lng, altitude: 1.5 },
      1000,
    );
  }, [onEarthquakeClick]);

  return (
    <GlobeGL
      ref={globeRef}
      globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
      backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
      pointsData={pointsData}
      pointLat="lat"
      pointLng="lng"
      pointColor="color"
      pointRadius="size"
      pointAltitude="altitude"
      pointLabel="label"
      onPointClick={handlePointClick}
      pointsMerge={false}
      animateIn={true}
      atmosphereColor="#3a228a"
      atmosphereAltitude={0.25}
      width={window.innerWidth}
      height={window.innerHeight}
    />
  );
}
