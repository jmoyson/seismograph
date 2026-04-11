export interface GlobePoint {
  lat: number;
  lng: number;
  metric: number;
  label: string;
}

export interface SeismoGlobeProps {
  width: number;
  height: number;
  data: GlobePoint[];
  pointSizeMultiplier: number;
}

export interface SeismoGlobeFormData {
  latitude_column: string;
  longitude_column: string;
  metric_column: string;
  label_column: string;
  row_limit: number;
  point_size_multiplier: number;
}
