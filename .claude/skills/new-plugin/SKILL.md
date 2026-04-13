---
name: new-plugin
description: Generate a custom Apache Superset visualization plugin for Seismograph. Use when someone wants to create a new chart type, visualization, or Superset plugin.
paths: "apps/superset-plugins/src/**"
allowed-tools: Read Grep Glob Bash(pnpm --filter @seismograph/superset-plugins build)
---

# Superset Plugin Generator

Generate a custom Apache Superset visualization plugin following the project's established patterns.

User request: $ARGUMENTS

## Live state

### Existing plugins
!`ls apps/superset-plugins/src/ | grep Plugin`

### Plugin registry
!`cat apps/superset-plugins/src/index.ts`

---

## Process

### Step 1: Understand

If `$ARGUMENTS` specifies the plugin clearly, skip to the plan. Otherwise ask:

1. **What does the chart visualize?** (one sentence)
2. **Which SQL columns does it need?** (from earthquakes table or custom dataset)
3. **What should the user configure?** (column selectors, limits, color options)
4. **Rendering library?** (raw SVG/Canvas, d3, recharts, react-globe.gl, other)

### Step 2: Plan

```
## Plan: <Name>Plugin

- CREATE apps/superset-plugins/src/<Name>Plugin/types.ts
- CREATE apps/superset-plugins/src/<Name>Plugin/index.ts
- CREATE apps/superset-plugins/src/<Name>Plugin/controlPanel.ts
- CREATE apps/superset-plugins/src/<Name>Plugin/buildQuery.ts
- CREATE apps/superset-plugins/src/<Name>Plugin/transformProps.ts
- CREATE apps/superset-plugins/src/<Name>Plugin/<Name>.tsx
- MODIFY apps/superset-plugins/src/index.ts → add export
```

**Wait for user approval.**

### Step 3: Generate

Follow the templates in [plugin-templates.md](../new/reference/plugin-templates.md). Create files in this order:

1. `types.ts` — interfaces (event data, component props, form data)
2. `index.ts` — ChartPlugin subclass with metadata
3. `controlPanel.ts` — ControlPanelConfig with column selectors
4. `buildQuery.ts` — select only needed columns
5. `transformProps.ts` — map SQL rows to typed React props
6. `<Name>.tsx` — pure React component

### Step 4: Register & Verify

1. Add export to `apps/superset-plugins/src/index.ts`
2. Verify build:
   ```bash
   pnpm --filter @seismograph/superset-plugins build
   ```

### Step 5: Summary

Report: plugin key, chart name, category, how to test in Superset.
