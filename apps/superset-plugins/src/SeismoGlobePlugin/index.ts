import { ChartPlugin } from '@superset-ui/core';
import buildQuery from './buildQuery';
import controlPanel from './controlPanel';
import transformProps from './transformProps';

export default class SeismoGlobePlugin extends ChartPlugin {
  constructor() {
    super({
      buildQuery,
      controlPanel,
      loadChart: () => import('./SeismoGlobe'),
      metadata: {
        name: 'Seismo Globe 3D',
        description:
          'Interactive 3D globe for geospatial data. Displays any dataset with latitude/longitude as points on a rotating globe.',
        tags: ['Geographic', '3D', 'Globe', 'Experimental'],
        category: 'Map',
      } as any,
      transformProps,
    });
  }
}
