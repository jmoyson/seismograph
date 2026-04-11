import { ControlPanelConfig } from '@superset-ui/chart-controls';

const columnChoices = (state: any) =>
  (state?.datasource?.columns ?? []).map((c: any) => [c.column_name, c.column_name]);

const config: ControlPanelConfig = {
  controlPanelSections: [
    {
      label: 'Geo Columns',
      expanded: true,
      controlSetRows: [
        [
          {
            name: 'latitude_column',
            config: {
              type: 'SelectControl',
              label: 'Latitude',
              description: 'Column containing latitude values',
              mapStateToProps: (state: any) => ({ choices: columnChoices(state) }),
              default: 'latitude',
            },
          },
          {
            name: 'longitude_column',
            config: {
              type: 'SelectControl',
              label: 'Longitude',
              description: 'Column containing longitude values',
              mapStateToProps: (state: any) => ({ choices: columnChoices(state) }),
              default: 'longitude',
            },
          },
        ],
      ],
    },
    {
      label: 'Metrics & Labels',
      expanded: true,
      controlSetRows: [
        [
          {
            name: 'metric_column',
            config: {
              type: 'SelectControl',
              label: 'Metric',
              description: 'Column for point size and color (e.g., magnitude)',
              mapStateToProps: (state: any) => ({ choices: columnChoices(state) }),
              default: 'magnitude',
            },
          },
          {
            name: 'label_column',
            config: {
              type: 'SelectControl',
              label: 'Label',
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
              description: 'Maximum number of points to display',
              min: 100,
              max: 5000,
              step: 100,
              default: 1000,
            },
          },
        ],
        [
          {
            name: 'point_size_multiplier',
            config: {
              type: 'SliderControl',
              label: 'Point Size',
              description: 'Multiplier for point size',
              min: 0.1,
              max: 3,
              step: 0.1,
              default: 1,
            },
          },
        ],
      ],
    },
  ],
};

export default config;
