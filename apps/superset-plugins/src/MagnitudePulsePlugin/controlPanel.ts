import { ControlPanelConfig } from '@superset-ui/chart-controls';

const columnChoices = (state: any) =>
  (state?.datasource?.columns ?? []).map((c: any) => [c.column_name, c.column_name]);

const config: ControlPanelConfig = {
  controlPanelSections: [
    {
      label: 'Time & Metrics',
      expanded: true,
      controlSetRows: [
        [
          {
            name: 'time_column',
            config: {
              type: 'SelectControl',
              label: 'Time Column',
              description: 'Column containing the timestamp for each event',
              mapStateToProps: (state: any) => ({ choices: columnChoices(state) }),
              default: 'time',
            },
          },
        ],
        [
          {
            name: 'metric_column',
            config: {
              type: 'SelectControl',
              label: 'Metric Column',
              description: 'Column for circle size (e.g., magnitude)',
              mapStateToProps: (state: any) => ({ choices: columnChoices(state) }),
              default: 'magnitude',
            },
          },
        ],
        [
          {
            name: 'color_metric_column',
            config: {
              type: 'SelectControl',
              label: 'Color Metric (optional)',
              description: 'Column for circle color. Defaults to the metric column.',
              mapStateToProps: (state: any) => ({ choices: columnChoices(state) }),
              default: null,
              freeForm: false,
            },
          },
        ],
        [
          {
            name: 'label_column',
            config: {
              type: 'SelectControl',
              label: 'Label Column',
              description: 'Column for tooltip label (e.g., place)',
              mapStateToProps: (state: any) => ({ choices: columnChoices(state) }),
              default: 'place',
            },
          },
        ],
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
              description: 'Maximum number of events to plot',
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
