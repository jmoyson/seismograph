import { ChartProps } from '@superset-ui/core';
import { MagnitudePulseProps, PulseEvent } from './types';

export default function transformProps(chartProps: ChartProps): MagnitudePulseProps {
  const { width, height, formData, queriesData } = chartProps;
  const rows: any[] = (queriesData?.[0] as any)?.data ?? [];

  const {
    time_column = 'time',
    metric_column = 'magnitude',
    color_metric_column,
    label_column = 'place',
  } = formData as Record<string, any>;

  const colorColumn = color_metric_column || metric_column;

  // Superset can hand back temporal columns as either an epoch number, a Date,
  // or an ISO/SQL string depending on dataset config — normalise once here so
  // the renderer only ever deals with epoch ms.
  const toEpoch = (raw: unknown): number => {
    if (raw == null) return NaN;
    if (typeof raw === 'number') return raw;
    if (raw instanceof Date) return raw.getTime();
    return new Date(String(raw)).getTime();
  };

  const data: PulseEvent[] = rows
    .map((row) => ({
      time: toEpoch(row[time_column]),
      metric: Number(row[metric_column]),
      colorMetric: Number(row[colorColumn]),
      label: String(row[label_column] ?? ''),
    }))
    .filter((event) => Number.isFinite(event.time) && Number.isFinite(event.metric));

  return { width, height, data };
}
