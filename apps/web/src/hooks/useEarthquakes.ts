import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSSE } from './useSSE';
import { apiClient } from '../api/client';
import type { Earthquake, EarthquakeFilters } from '@seismograph/shared';

export function useEarthquakes(filters: EarthquakeFilters = {}) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['earthquakes', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.minMagnitude) params.set('minMagnitude', String(filters.minMagnitude));
      if (filters.maxMagnitude) params.set('maxMagnitude', String(filters.maxMagnitude));
      if (filters.days) params.set('days', String(filters.days));
      if (filters.sortBy) params.set('sortBy', filters.sortBy);
      if (filters.limit) params.set('limit', String(filters.limit));

      const { data } = await apiClient.get<Earthquake[]>(`/earthquakes?${params}`);
      return data;
    },
  });

  const handleSSEMessage = useCallback(() => {
    refetch();
  }, [refetch]);

  const { isConnected } = useSSE({
    url: `${import.meta.env.VITE_API_URL}/events/earthquakes`,
    onMessage: handleSSEMessage,
    eventType: 'earthquake-update',
  });

  return {
    earthquakes: data || [],
    isLoading,
    error,
    isConnected,
    refetch,
  };
}
