import type { FC } from 'react';
export interface LineChartProps {
  labels: string[];
  data: number[];
  title?: string;
  chartId?: string;
}
declare const LineChart: FC<LineChartProps>;
export default LineChart;
