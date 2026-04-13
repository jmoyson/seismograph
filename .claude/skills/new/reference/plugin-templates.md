# Superset Plugin Templates

Code templates for custom Apache Superset visualization plugins in `apps/superset-plugins/src/`. All templates follow the patterns established by `MagnitudePulsePlugin` and `SeismoGlobePlugin`.

## File structure (every plugin)

```
apps/superset-plugins/src/<Name>Plugin/
├── index.ts              ← ChartPlugin subclass with metadata
├── buildQuery.ts         ← FormData → SQL QueryObject
├── controlPanel.ts       ← UI configuration panel
├── transformProps.ts     ← SQL rows → React props
├── <Name>.tsx            ← React visualization component
└── types.ts              ← TypeScript interfaces
```

## 1. types.ts

Define three interfaces: one for the raw event/row data, one for component props, one for form data.

```typescript
// types.ts
export interface <Name>Event {
  // Mapped from SQL columns by transformProps
  time: number;       // epoch ms
  metric: number;     // primary metric
  label: string;      // display label
}

export interface <Name>Props {
  width: number;      // from Superset container
  height: number;     // from Superset container
  data: <Name>Event[];
}

export interface <Name>FormData {
  time_column: string;
  metric_column: string;
  label_column: string;
  row_limit: number;
}
```

## 2. index.ts — Plugin class

```typescript
// index.ts
import { Behavior, ChartMetadata, ChartPlugin } from '@superset-ui/core';
import { PLACEHOLDER_THUMBNAIL } from '../shared/thumbnail';
import buildQuery from './buildQuery';
import controlPanel from './controlPanel';
import transformProps from './transformProps';

export default class <Name>Plugin extends ChartPlugin {
  constructor() {
    super({
      buildQuery,
      controlPanel,
      loadChart: () => import('./<Name>'),
      metadata: new ChartMetadata({
        behaviors: [Behavior.InteractiveChart],
        category: '<Category>',  // 'Map' | 'Time Series' | 'Correlation' | 'Distribution' | 'Custom'
        description: '<What this chart does — one sentence>',
        name: '<Human Readable Name>',
        tags: ['<Tag>', 'Experimental'],
        thumbnail: PLACEHOLDER_THUMBNAIL,
      }),
      transformProps,
    });
  }
}
```

**Important:**
- `behaviors` and `thumbnail` are REQUIRED on Superset 6.x — omitting them causes runtime errors
- `loadChart` uses dynamic import for code splitting
- Plugin key (set during `.configure({ key: '...' })` in the registry) must be unique across all plugins

## 3. controlPanel.ts

```typescript
// controlPanel.ts
import { ControlPanelConfig } from '@superset-ui/chart-controls';

const columnChoices = (state: any) =>
  (state?.datasource?.columns ?? []).map((c: any) => [c.column_name, c.column_name]);

const config: ControlPanelConfig = {
  controlPanelSections: [
    {
      label: '<Section Name>',
      expanded: true,
      controlSetRows: [
        [
          {
            name: '<control_name>',
            config: {
              type: 'SelectControl',
              label: '<Display Label>',
              description: '<Help text for the user>',
              mapStateToProps: (state: any) => ({ choices: columnChoices(state) }),
              default: '<default_column>',
            },
          },
        ],
        // Add more controls as needed
      ],
    },
    {
      label: 'Display Options',
      expanded: true,
      controlSetRows: [
        [
          {
            name: 'row_limit',
            config: {
              type: 'SliderControl',
              label: 'Row Limit',
              description: 'Maximum number of data points to plot',
              min: 100,
              max: 5000,
              step: 100,
              default: 500,
            },
          },
        ],
      ],
    },
  ],
};

export default config;
```

**Pattern:** Always use `mapStateToProps` with `columnChoices(state)` to list dataset columns dynamically. Always include `row_limit` with a sensible default.

## 4. buildQuery.ts

```typescript
// buildQuery.ts
import { buildQueryContext, QueryFormData } from '@superset-ui/core';

export default function buildQuery(formData: QueryFormData) {
  const {
    time_column = 'time',
    metric_column = 'magnitude',
    label_column = 'place',
    row_limit,
  } = formData as QueryFormData & {
    time_column?: string;
    metric_column?: string;
    label_column?: string;
  };

  const columns = [time_column, metric_column, label_column];
  const limit = Number(row_limit) || 500;

  return buildQueryContext(formData, (baseQueryObject) => [
    {
      ...baseQueryObject,
      columns,
      orderby: [[time_column, true]],  // true = ascending
      row_limit: limit,
    },
  ]);
}
```

**Rules:**
- Select only the columns needed — don't `SELECT *`
- Don't use `GROUP BY` unless the visualization aggregates data
- Set `orderby` and `row_limit` explicitly

## 5. transformProps.ts

```typescript
// transformProps.ts
import { ChartProps } from '@superset-ui/core';
import { <Name>Props, <Name>Event } from './types';

export default function transformProps(chartProps: ChartProps): <Name>Props {
  const { width, height, formData, queriesData } = chartProps;
  const rows: any[] = (queriesData?.[0] as any)?.data ?? [];

  const {
    time_column = 'time',
    metric_column = 'magnitude',
    label_column = 'place',
  } = formData as Record<string, any>;

  // Normalize temporal columns — Superset can return epoch, Date, or ISO string
  const toEpoch = (raw: unknown): number => {
    if (raw == null) return NaN;
    if (typeof raw === 'number') return raw;
    if (raw instanceof Date) return raw.getTime();
    return new Date(String(raw)).getTime();
  };

  const data: <Name>Event[] = rows
    .map((row) => ({
      time: toEpoch(row[time_column]),
      metric: Number(row[metric_column]),
      label: String(row[label_column] ?? ''),
    }))
    .filter((event) => Number.isFinite(event.time) && Number.isFinite(event.metric));

  return { width, height, data };
}
```

**Key rule:** The React component should NEVER know about SQL column names. `transformProps` handles the mapping from column names (from `formData`) to typed props.

## 6. Component (<Name>.tsx)

```tsx
// <Name>.tsx
import React from 'react';
import { <Name>Props } from './types';
import { getColorByMetric, getSizeByMetric } from '../shared/colors';

export default function <Name>(props: <Name>Props) {
  const { width, height, data } = props;

  return (
    <div style={{ width, height, position: 'relative', overflow: 'hidden' }}>
      {/* Visualization here — use d3, recharts, raw SVG/Canvas, etc. */}
    </div>
  );
}
```

**Rules:**
- Pure React component — accepts `width`, `height`, and typed data props
- Use `getColorByMetric()` and `getSizeByMetric()` from `../shared/colors` for consistency
- Component must be responsive to the `width`/`height` provided by Superset

## Color utilities (shared/colors.ts)

Already exists at `apps/superset-plugins/src/shared/colors.ts`:

- `getColorByMetric(value)` — green (<3), yellow (<4), orange (<5), red (<6), dark red (<7), purple (7+)
- `getSizeByMetric(value)` — exponential scaling: `Math.pow(1.5, value) * 0.3`
- `getAltitudeByMetric(value)` — linear: `Math.max(0.01, value / 30)`

## Registration

After creating the plugin, export it from `apps/superset-plugins/src/index.ts`:

```typescript
export { default as <Name>Plugin } from './<Name>Plugin';
```

## Verification

```bash
pnpm --filter @seismograph/superset-plugins build
```

Must succeed. The plugin will be included in the next Docker build of Superset.
