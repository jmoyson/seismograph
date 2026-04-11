// Placeholder thumbnail used by both plugin metadata blocks.
//
// Superset's `ChartMetadataConfig` requires a `thumbnail` field. The official
// plugins import PNGs via webpack image loaders, but our package is built with
// plain tsc and has no asset pipeline — importing a `.png` would either fail
// at compile time or ship a broken bundle to Superset's webpack at install
// time. Inlining a 1×1 transparent PNG as a data URL satisfies the type and
// the runtime without dragging in any build tooling. Replace with a real
// branded thumbnail later if we want the chart picker to look prettier.
export const PLACEHOLDER_THUMBNAIL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=';
