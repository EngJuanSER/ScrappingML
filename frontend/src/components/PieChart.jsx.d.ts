import type { FC } from 'react';
export interface PieChartProps {
  labels: string[];
  data: number[];
  title?: string;
  chartId?: string;
}
declare const PieChart: FC<PieChartProps>;
export default PieChart;
