import { Behavior, ChartMetadata, ChartPlugin } from '@superset-ui/core';
import { PLACEHOLDER_THUMBNAIL } from '../shared/thumbnail';
import buildQuery from './buildQuery';
import controlPanel from './controlPanel';
import transformProps from './transformProps';

export default class MagnitudePulsePlugin extends ChartPlugin {
  constructor() {
    super({
      buildQuery,
      controlPanel,
      loadChart: () => import('./MagnitudePulse'),
      // `behaviors` and `thumbnail` are REQUIRED on Superset 6.x — see
      // SeismoGlobePlugin for the full explanation.
      metadata: new ChartMetadata({
        behaviors: [Behavior.InteractiveChart],
        category: 'Time Series',
        description:
          'Animated timeline where each event pulses as a circle. Size by metric, color by value. Perfect for seismic or event data.',
        name: 'Magnitude Pulse',
        tags: ['Animated', 'Timeline', 'Experimental'],
        thumbnail: PLACEHOLDER_THUMBNAIL,
      }),
      transformProps,
    });
  }
}
