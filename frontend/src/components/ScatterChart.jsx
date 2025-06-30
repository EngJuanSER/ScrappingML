import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import { limpiarPrecioColombiano } from "./KPISection.jsx"; // o desde utils si lo tienes ahí

function getScatterData(categoria) {
  return data
    .filter(item => (categoria === 'todas' || item.categoria === categoria))
    .map(item => ({
      x: limpiarPrecioColombiano(item.price),
      y: Number(item.avg_rating),
      title: item.title
    }))
    .filter(point => !isNaN(point.x) && point.x > 0 && !isNaN(point.y) && point.y > 0);
}

export default function ScatterChart({ data = [], title = "Scatter Chart", chartId = "scatter-chart" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const ctx = canvasRef.current.getContext("2d");
    if (canvasRef.current.chartInstance) {
      canvasRef.current.chartInstance.destroy();
    }
    canvasRef.current.chartInstance = new Chart(ctx, {
      type: "scatter",
      data: {
        datasets: [
          {
            label: title,
            data,
            backgroundColor: "rgba(153, 102, 255, 0.6)",
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
                const x = context.parsed.x;
                const y = context.parsed.y;
                return `Precio: ${x.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}, Calificación: ${y}`;
              }
            }
          },
        },
        scales: {
          x: {
            title: { display: true, text: "Precio (COP)" },
            ticks: {
              callback: function(value) {
                return value.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
              }
            }
          },
          y: {
            title: { display: true, text: "Calificación promedio" },
            min: 0,
            max: 5,
            ticks: {
              callback: function(value) {
                return value;
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
  }, [data, title]);

  return (
    <div style={{ height: "350px" }}>
      <canvas ref={canvasRef} id={chartId}></canvas>
    </div>
  );
}
