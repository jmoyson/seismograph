import { buildQueryContext, QueryFormData } from '@superset-ui/core';

export default function buildQuery(formData: QueryFormData) {
  const {
    time_column = 'time',
    metric_column = 'magnitude',
    color_metric_column,
    label_column = 'place',
    row_limit,
  } = formData as QueryFormData & {
    time_column?: string;
    metric_column?: string;
    color_metric_column?: string;
    label_column?: string;
  };

  const columns = [time_column, metric_column, label_column];
  if (color_metric_column && color_metric_column !== metric_column) {
    columns.push(color_metric_column);
  }

  const limit = Number(row_limit) || 500;

  return buildQueryContext(formData, (baseQueryObject) => [
    {
      ...baseQueryObject,
      columns,
      orderby: [[time_column, true]],
      row_limit: limit,
    },
  ]);
}
