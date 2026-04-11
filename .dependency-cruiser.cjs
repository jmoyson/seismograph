const path = require('path');

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-cross-slice-api',
      comment:
        'A backend slice MUST NOT import from another slice. ' +
        'Allowed: npm packages, ../../shared/*, @seismograph/shared, same-slice files. ' +
        'If you need to react to another slice, use an EventEmitter2 event instead.',
      severity: 'error',
      from: {
        path: '^apps/api/src/features/([^/]+)/',
      },
      to: {
        path: '^apps/api/src/features/([^/]+)/',
        pathNot: '^apps/api/src/features/$1/',
      },
    },
    {
      name: 'no-cross-feature-web',
      comment:
        'A web feature MUST NOT import from another feature. ' +
        'Allowed: npm packages, ../../shared/*, ../../hooks/*, ../../api/client, @seismograph/shared, same-feature files.',
      severity: 'error',
      from: {
        path: '^apps/web/src/features/([^/]+)/',
      },
      to: {
        path: '^apps/web/src/features/([^/]+)/',
        pathNot: '^apps/web/src/features/$1/',
      },
    },
    {
      name: 'no-circular',
      comment: 'No circular dependencies allowed.',
      severity: 'error',
      from: {},
      to: {
        circular: true,
      },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: path.resolve(__dirname, 'apps/api/tsconfig.json'),
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
      mainFields: ['main', 'types'],
    },
    reporterOptions: {
      dot: {
        collapsePattern: '^(apps/[^/]+/src/features/[^/]+|apps/[^/]+/src/shared|packages/[^/]+/src)',
      },
    },
  },
};
