import { ChartProps } from '@superset-ui/core';
import { GlobePoint, SeismoGlobeProps } from './types';

export default function transformProps(chartProps: ChartProps): SeismoGlobeProps {
  const { width, height, formData, queriesData } = chartProps;
  const rows: any[] = (queriesData?.[0] as any)?.data ?? [];

  const {
    latitude_column = 'latitude',
    longitude_column = 'longitude',
    metric_column = 'magnitude',
    label_column = 'place',
    point_size_multiplier = 1,
  } = formData as Record<string, any>;

  const data: GlobePoint[] = rows.map((row) => ({
    lat: Number(row[latitude_column]),
    lng: Number(row[longitude_column]),
    metric: Number(row[metric_column]),
    label: String(row[label_column] ?? ''),
  }));

  return {
    width,
    height,
    data,
    pointSizeMultiplier: Number(point_size_multiplier) || 1,
  };
}
