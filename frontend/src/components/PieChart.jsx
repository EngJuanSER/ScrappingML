import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";
const COLORS = [
  "rgba(255, 205, 86, 0.8)",
  "rgba(54, 162, 235, 0.8)",
  "rgba(255, 99, 132, 0.8)",
  "rgba(75, 192, 192, 0.8)",
  "rgba(153, 102, 255, 0.8)",
  "rgba(255, 159, 64, 0.8)",
];

export default function PieChart({ labels = [], data = [], title = "Pie Chart", chartId = "pie-chart" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const ctx = canvasRef.current.getContext("2d");
    if (canvasRef.current.chartInstance) {
      canvasRef.current.chartInstance.destroy();
    }
    canvasRef.current.chartInstance = new Chart(ctx, {
      type: "pie",
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: COLORS,
            borderColor: "#ffffff",
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: { display: true, text: title },
          tooltip: {
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.parsed;
                if (typeof value === 'number' && /\$[0-9.]+/.test(label)) {
                  return `${label}: ${value.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}`;
                }
                return `${label}: ${value}`;
              }
            }
          },
        },
      },
    });
    return () => {
      if (canvasRef.current.chartInstance) {
        canvasRef.current.chartInstance.destroy();
      }
    };
  }, [labels, data, title]);

  return (
    <div style={{ height: "350px" }}>
      <canvas ref={canvasRef} id={chartId}></canvas>
    </div>
  );
}
