export interface PulseEvent {
  time: number;
  metric: number;
  colorMetric: number;
  label: string;
}

export interface MagnitudePulseProps {
  width: number;
  height: number;
  data: PulseEvent[];
}

export interface MagnitudePulseFormData {
  time_column: string;
  metric_column: string;
  color_metric_column?: string;
  label_column: string;
  row_limit: number;
}
