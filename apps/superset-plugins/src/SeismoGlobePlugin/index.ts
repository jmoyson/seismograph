import { Behavior, ChartMetadata, ChartPlugin } from '@superset-ui/core';
import { PLACEHOLDER_THUMBNAIL } from '../shared/thumbnail';
import buildQuery from './buildQuery';
import controlPanel from './controlPanel';
import transformProps from './transformProps';

export default class SeismoGlobePlugin extends ChartPlugin {
  constructor() {
    super({
      buildQuery,
      controlPanel,
      loadChart: () => import('./SeismoGlobe'),
      // `behaviors` is REQUIRED on Superset 6.x — the chart picker calls
      // `metadata.behaviors.find(...)` and crashes with `undefined is not an
      // object` if it's missing. Our charts are interactive but don't support
      // drill-to-detail or drill-by, so InteractiveChart alone is enough.
      // `thumbnail` is also required by ChartMetadataConfig — see
      // ../shared/thumbnail.ts for why we ship a placeholder data URL.
      metadata: new ChartMetadata({
        behaviors: [Behavior.InteractiveChart],
        category: 'Map',
        description:
          'Interactive 3D globe for geospatial data. Displays any dataset with latitude/longitude as points on a rotating globe.',
        name: 'Seismo Globe 3D',
        tags: ['Geographic', '3D', 'Globe', 'Experimental'],
        thumbnail: PLACEHOLDER_THUMBNAIL,
      }),
      transformProps,
    });
  }
}
