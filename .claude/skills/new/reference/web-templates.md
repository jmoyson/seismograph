# React Frontend Templates

Code templates for React features and hooks in `apps/web/src/`. All templates follow the patterns established in the existing codebase.

## Hook template (data fetching with TanStack Query)

Reference: `src/hooks/useEarthquakes.ts`

```typescript
// src/hooks/use<Name>.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { SomeType } from '@seismograph/shared';

export function use<Name>(params?: { /* optional params */ }) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['<key>', params],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      // Build query params from the params object
      // if (params?.someField) queryParams.set('someField', String(params.someField));

      const { data } = await apiClient.get<SomeType[]>(`/<endpoint>?${queryParams}`);
      return data;
    },
  });

  return {
    data: data || [],
    isLoading,
    error,
    refetch,
  };
}
```

**Rules:**
- Always import `apiClient` from `../api/client` — never create a new Axios instance
- Always import types from `@seismograph/shared` — never redefine them locally
- Query key should be descriptive and include params for proper cache invalidation

## Hook template (with SSE real-time updates)

Reference: `src/hooks/useEarthquakes.ts` (combines useQuery + useSSE)

```typescript
// src/hooks/use<Name>.ts
import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSSE } from './useSSE';
import { apiClient } from '../api/client';
import type { SomeType } from '@seismograph/shared';

export function use<Name>(params?: { /* optional params */ }) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['<key>', params],
    queryFn: async () => {
      const { data } = await apiClient.get<SomeType[]>('/<endpoint>');
      return data;
    },
  });

  const handleSSEMessage = useCallback(() => {
    refetch();
  }, [refetch]);

  const { isConnected } = useSSE({
    url: `${import.meta.env.VITE_API_URL}/events/<stream-name>`,
    onMessage: handleSSEMessage,
    eventType: '<event-type>',
  });

  return {
    data: data || [],
    isLoading,
    error,
    isConnected,
    refetch,
  };
}
```

**Rules:**
- There is exactly ONE `EventSource` consumer: `src/hooks/useSSE.ts`. Never create your own `EventSource`.
- The SSE hook triggers a `refetch()` on message — it does NOT try to merge SSE data with query data.

## Feature component template

Reference: `src/features/earthquake-list/EarthquakeList.tsx`

```tsx
// src/features/<name>/<Name>.tsx
import { use<Name> } from '../../hooks/use<Name>';

export function <Name>() {
  const { data, isLoading, error } = use<Name>();

  if (isLoading) {
    return (
      <div style={styles.container}>
        <p style={styles.secondaryText}>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <p style={{ color: '#e53935' }}>Error loading data</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Title</h2>
      {/* Render data */}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 12,
    padding: 16,
    color: 'white',
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    margin: '0 0 12px 0',
    color: 'white',
  },
  secondaryText: {
    fontSize: 12,
    color: '#aaa',
    margin: 0,
  },
};
```

## Style conventions

Extracted from the existing dark-theme UI:

| Property | Value |
|----------|-------|
| Panel background | `rgba(0, 0, 0, 0.85)` |
| Primary text | `white` |
| Secondary text | `#aaa` |
| Tertiary text | `#888` |
| Error text | `#e53935` |
| Border radius (panels) | 8–12px |
| Font size (data) | 11–14px |
| Font size (titles) | 16–20px |
| Padding (panels) | 12–16px |

For earthquake-specific color coding, import from `src/shared/utils/formatting.ts`:
```typescript
import { getColorByMagnitude, timeAgo } from '../../shared/utils/formatting';
```

## Integration with App.tsx

After creating a feature component:

1. Import it at the top of `src/App.tsx`
2. Add it to the JSX layout
3. Position it using absolute/fixed positioning or flex layout depending on the design
4. Connect it to existing state if needed (e.g., selected earthquake, active filters)

## Feature isolation rule

A feature in `src/features/<feature>/` MUST NEVER import from another feature. Allowed imports:

1. npm packages
2. `../../shared/*` (utilities, formatting)
3. `../../hooks/*` (shared React hooks)
4. `../../api/client` (the Axios instance)
5. `@seismograph/shared` (cross-app types)
6. Other files in the same feature

If a utility is needed by 2+ features, it belongs in `src/shared/utils/`.
