export interface Earthquake {
  id: string;
  magnitude: number;
  place: string;
  time: string;
  latitude: number;
  longitude: number;
  depth: number;
  tsunami: boolean;
  url: string | null;
  status: string | null;
  significance: number | null;
}

export interface EarthquakeFilters {
  minMagnitude?: number;
  maxMagnitude?: number;
  days?: number;
  sortBy?: 'time' | 'magnitude' | 'significance';
  limit?: number;
}

export interface EarthquakeStats {
  period: { days: number; since: string };
  totalCount: number;
  avgMagnitude: number;
  maxMagnitude: number;
  minMagnitude: number;
  significantCount: number;
  tsunamiAlerts: number;
  distribution: Array<{ range: string; count: number }>;
}

export interface SSEEvent {
  type: 'sync';
  count: number;
  earthquakes: Earthquake[];
  timestamp: string;
}
