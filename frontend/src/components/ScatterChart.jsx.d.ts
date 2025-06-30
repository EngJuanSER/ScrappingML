import type { FC } from 'react';
export interface ScatterPoint { x: number; y: number; title?: string }
export interface ScatterChartProps {
  data: ScatterPoint[];
  title?: string;
  chartId?: string;
}
declare const ScatterChart: FC<ScatterChartProps>;
export default ScatterChart;
