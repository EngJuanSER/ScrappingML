import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

export default function MultiLineChart({
  labels = [],
  datasets = [],
  title = "",
  yLabel = "",
  xLabel = "",
  chartId = "multi-line-chart"
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const ctx = canvasRef.current.getContext("2d");
    if (canvasRef.current.chartInstance) {
      canvasRef.current.chartInstance.destroy();
    }
    canvasRef.current.chartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: { display: !!title, text: title, font: { size: 18 } },
          legend: { display: true, position: "top" },
          tooltip: { mode: "index", intersect: false }
        },
        interaction: { mode: "nearest", axis: "x", intersect: false },
        scales: {
          x: {
            title: { display: !!xLabel, text: xLabel },
            ticks: { autoSkip: false }
          },
          y: {
            title: { display: !!yLabel, text: yLabel },
            beginAtZero: true
          }
        }
      }
    });
    return () => {
      if (canvasRef.current.chartInstance) {
        canvasRef.current.chartInstance.destroy();
      }
    };
  }, [labels, datasets, title, yLabel, xLabel]);

  return (
    <div style={{ height: "350px" }}>
      <canvas ref={canvasRef} id={chartId}></canvas>
    </div>
  );
}