import { ChartPlugin } from '@superset-ui/core';
import buildQuery from './buildQuery';
import controlPanel from './controlPanel';
import transformProps from './transformProps';

export default class MagnitudePulsePlugin extends ChartPlugin {
  constructor() {
    super({
      buildQuery,
      controlPanel,
      loadChart: () => import('./MagnitudePulse'),
      metadata: {
        name: 'Magnitude Pulse',
        description:
          'Animated timeline where each event pulses as a circle. Size by metric, color by value. Perfect for seismic or event data.',
        tags: ['Animated', 'Timeline', 'Experimental'],
        category: 'Time Series',
      } as any,
      transformProps,
    });
  }
}
