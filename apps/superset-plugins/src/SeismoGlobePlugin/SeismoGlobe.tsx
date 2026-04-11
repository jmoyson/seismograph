import { useCallback, useMemo, useRef } from 'react';
import GlobeGL from 'react-globe.gl';
import { getAltitudeByMetric, getColorByMetric, getSizeByMetric } from '../shared/colors';
import { SeismoGlobeProps } from './types';

export default function SeismoGlobe({
  width,
  height,
  data,
  pointSizeMultiplier,
}: SeismoGlobeProps) {
  const globeRef = useRef<any>(null);

  const pointsData = useMemo(
    () =>
      data.map((point) => ({
        ...point,
        color: getColorByMetric(point.metric),
        size: getSizeByMetric(point.metric) * pointSizeMultiplier,
        altitude: getAltitudeByMetric(point.metric),
        tooltipLabel: `${point.label}\nValue: ${point.metric.toFixed(1)}`,
      })),
    [data, pointSizeMultiplier],
  );

  const handlePointClick = useCallback((point: any) => {
    globeRef.current?.pointOfView(
      { lat: point.lat, lng: point.lng, altitude: 1.5 },
      1000,
    );
  }, []);

  return (
    <GlobeGL
      ref={globeRef}
      width={width}
      height={height}
      globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
      backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
      pointsData={pointsData}
      pointLat="lat"
      pointLng="lng"
      pointColor="color"
      pointRadius="size"
      pointAltitude="altitude"
      pointLabel="tooltipLabel"
      onPointClick={handlePointClick}
      pointsMerge={false}
      animateIn={true}
      atmosphereColor="#3a228a"
      atmosphereAltitude={0.25}
    />
  );
}
