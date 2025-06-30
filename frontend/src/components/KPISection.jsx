import React, { useState } from "react";
import CategoryFilter from "./CategoryFilter.jsx";

// Utilidades compartidas (importar desde DashboardCharts si se prefiere)
export const formatoCOP = valor => valor.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
export function limpiarPrecioColombiano(precio) {
  if (precio === null || precio === undefined) return NaN;
  if (typeof precio === 'number') return Math.round(precio);
  let str = String(precio).replace(/[^0-9,\.]/g, '');
  str = str.replace(/\./g, '');
  str = str.replace(/,/g, '.');
  const num = parseFloat(str);
  return isNaN(num) ? NaN : Math.round(num);
}

export default function KPISection({ data, categoriasDisponibles }) {
  const [filtroKPI, setFiltroKPI] = useState("todas");

  // KPIs calculados con limpieza robusta
  const productosFiltrados = data.filter(item => filtroKPI === 'todas' || item.categoria === filtroKPI);
  const totalProductos = productosFiltrados.length;
  const precios = productosFiltrados
    .map(item => limpiarPrecioColombiano(item.price))
    .filter(x => !isNaN(x) && x >= 1000);
  const precioPromedio = precios.length > 0 ? precios.reduce((a, b) => a + b, 0) / precios.length : 0;
  const productosConFull = productosFiltrados.filter(item => (item.full_description || '').includes('FULL')).length;

  return (
    <div className="flex flex-col gap-4 mb-4">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex-1">
          <CategoryFilter
            value={filtroKPI}
            onChange={setFiltroKPI}
            options={categoriasDisponibles}
            label="Filtrar KPIs por categoría"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        <div className="bg-pastel-white p-6 rounded-xl shadow-lg border-2 border-pastel-accent">
          <h3 className="text-lg font-semibold text-pastel-strong mb-2">Total de Productos</h3>
          <p className="text-3xl text-pastel-accent font-bold">{totalProductos.toLocaleString('es-CO')}</p>
        </div>
        <div className="bg-pastel-white p-6 rounded-xl shadow-lg border-2 border-pastel-accent">
          <h3 className="text-lg font-semibold text-pastel-strong mb-2">Precio Promedio</h3>
          <p className="text-3xl text-pastel-accent font-bold">{precioPromedio > 0 ? formatoCOP(precioPromedio) : 'N/A'}</p>
        </div>
        <div className="bg-pastel-white p-6 rounded-xl shadow-lg border-2 border-pastel-accent">
          <h3 className="text-lg font-semibold text-pastel-strong mb-2">Productos con Full</h3>
          <p className="text-3xl text-pastel-accent font-bold">{productosConFull.toLocaleString('es-CO')}</p>
        </div>
      </div>
    </div>
  );
}
