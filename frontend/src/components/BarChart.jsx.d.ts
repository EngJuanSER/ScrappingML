import type { FC } from 'react';
export interface BarChartProps {
  labels: string[];
  data: number[];
  title?: string;
  chartId?: string;
}
declare const BarChart: FC<BarChartProps>;
export default BarChart;
