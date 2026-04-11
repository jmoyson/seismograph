import { buildQueryContext, QueryFormData } from '@superset-ui/core';

export default function buildQuery(formData: QueryFormData) {
  const {
    latitude_column = 'latitude',
    longitude_column = 'longitude',
    metric_column = 'magnitude',
    label_column = 'place',
    row_limit,
  } = formData as QueryFormData & {
    latitude_column?: string;
    longitude_column?: string;
    metric_column?: string;
    label_column?: string;
  };

  const limit = Number(row_limit) || 1000;

  return buildQueryContext(formData, (baseQueryObject) => [
    {
      ...baseQueryObject,
      columns: [latitude_column, longitude_column, metric_column, label_column],
      orderby: [[metric_column, false]],
      row_limit: limit,
    },
  ]);
}
