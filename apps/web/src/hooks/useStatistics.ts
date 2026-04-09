import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { EarthquakeStats } from '@seismograph/shared';

export function useStatistics(days = 7) {
  return useQuery({
    queryKey: ['statistics', days],
    queryFn: async () => {
      const { data } = await apiClient.get<EarthquakeStats>(`/statistics?days=${days}`);
      return data;
    },
    refetchInterval: 5 * 60 * 1000,
  });
}
