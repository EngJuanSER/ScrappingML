import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

export default function BarChart({ labels = [], data = [], title = "Bar Chart", chartId = "bar-chart" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const ctx = canvasRef.current.getContext("2d");
    if (canvasRef.current.chartInstance) {
      canvasRef.current.chartInstance.destroy();
    }
    canvasRef.current.chartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: title,
            data,
            backgroundColor: "rgba(75, 192, 192, 0.6)",
            borderColor: "rgba(75, 192, 192, 1)",
            borderWidth: 1,
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
                const value = context.parsed.y;
                return value !== undefined ? value.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }) : '';
              }
            }
          },
        },
        scales: {
          y: {
            ticks: {
              callback: function(value) {
                return value.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
              }
            }
          }
        }
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
