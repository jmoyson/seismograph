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

  const data: PulseEvent[] = rows
    .map((row) => ({
      time: String(row[time_column] ?? ''),
      metric: Number(row[metric_column]),
      colorMetric: Number(row[colorColumn]),
      label: String(row[label_column] ?? ''),
    }))
    .filter((event) => event.time && Number.isFinite(event.metric));

  return { width, height, data };
}
