import React, { useState, useEffect } from "react";
import { fetchData } from "../utils/api.js";
import BarChart from "./BarChart.jsx";
import LineChart from "./LineChart.jsx";
import PieChart from "./PieChart.jsx";
import ScatterChart from "./ScatterChart.jsx";
import CategoryFilter from "./CategoryFilter.jsx";
import MultiLineChart from "./MultiLineChart.jsx";

const formatoCOP = valor => valor.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

// Utilidades de agrupación y filtrado (idénticas a las de Astro, pero aquí en React)
export function limpiarPrecioColombiano(precio) {
  if (precio === null || precio === undefined) return NaN;
  if (typeof precio === 'number') return Math.round(precio);
  let str = String(precio).replace(/[^0-9,\.]/g, '');
  str = str.replace(/\./g, '');
  str = str.replace(/,/g, '.');
  const num = parseFloat(str);
  return isNaN(num) ? NaN : Math.round(num);
}

function extraerVentas(str) {
  if (!str) return NaN;
  const match = String(str).replace(/[^\d]/g, '');
  return match ? Number(match) : NaN;
}

function clasificarRating(rating) {
  if (isNaN(rating)) return null;
  if (rating < 3.5) return 'Rating bajo';
  if (rating < 4.5) return 'Rating medio';
  return 'Rating alto';
}

function clasificarPrecio(precio, umbralBajo, umbralAlto) {
  if (precio < umbralBajo) return 'Económico';
  if (precio <= umbralAlto) return 'Medio';
  return 'Premium';
}

function getBarChartData(data, categoria) {
  const preciosPorSearchTerm = {};
  for (const item of data) {
    if (!item.search_term) continue;
    if (categoria !== 'todas' && item.categoria !== categoria) continue;
    if (!preciosPorSearchTerm[item.search_term]) preciosPorSearchTerm[item.search_term] = { sum: 0, count: 0 };
    // Usar la función centralizada para limpiar el precio
    const price = limpiarPrecioColombiano(item.price);
    if (filtrarPrecioRealista(price)) {
      preciosPorSearchTerm[item.search_term].sum += price;
      preciosPorSearchTerm[item.search_term].count++;
    }
  }
  const barLabels = Object.keys(preciosPorSearchTerm);
  const barData = barLabels.map(term => {
    const avg = preciosPorSearchTerm[term].count > 0
      ? Math.round(preciosPorSearchTerm[term].sum / preciosPorSearchTerm[term].count)
      : null;
    return filtrarPrecioRealista(avg) ? avg : null;
  });
  if (barData.every(v => v === null)) return { barLabels: [], barData: [] };
  return { barLabels, barData };
}

function getLineChartData(data, categoria, filtroTermino) {
  const preciosPorPagina = {};
  for (const item of data) {
    if (!item.search_term || typeof item.page === 'undefined') continue;
    if (item.search_term !== filtroTermino) continue;
    if (categoria !== 'todas' && item.categoria !== categoria) continue;
    const key = `Pág ${item.page}`;
    if (!preciosPorPagina[key]) preciosPorPagina[key] = { sum: 0, count: 0 };
    const price = limpiarPrecioColombiano(item.price);
    if (filtrarPrecioRealista(price)) {
      preciosPorPagina[key].sum += price;
      preciosPorPagina[key].count++;
    }
  }
  const lineLabels = Object.keys(preciosPorPagina).sort((a, b) => {
    // Extrae el número de página para ordenar correctamente
    const numA = parseInt(a.replace(/\D/g, ""), 10);
    const numB = parseInt(b.replace(/\D/g, ""), 10);
    return numA - numB;
  });
  const lineData = lineLabels.map(key => {
    const avg = preciosPorPagina[key].count > 0
      ? Math.round(preciosPorPagina[key].sum / preciosPorPagina[key].count)
      : null;
    return filtrarPrecioRealista(avg) ? avg : null;
  });
  if (lineData.every(v => v === null)) return { lineLabels: [], lineData: [] };
  return { lineLabels, lineData };
}

function getPieFullData(data, categoria) {
  const filtered = data.filter(item => categoria === 'todas' || item.categoria === categoria);
  const conFull = filtered.filter(item => (item.full_description || '').includes('FULL')).length;
  const sinFull = filtered.length - conFull;
  return { pieLabelsFull: ['Con Full', 'Sin Full'], pieDataFull: [conFull, sinFull] };
}

function getPieFeaturesData(data, categoria) {
  const filtered = data.filter(item => categoria === 'todas' || item.categoria === categoria);
  const features = {
    'Envío gratis': filtered.filter(item => (item.shipping || '').toLowerCase().includes('gratis')).length,
    'MercadoLibre Full': filtered.filter(item => (item.full_description || '').length > 0).length,
    'Con promoción': filtered.filter(item => (item.promotion || '').length > 0).length
  };
  return { pieLabelsFeatures: Object.keys(features), pieDataFeatures: Object.values(features) };
}

function getPieProblemsData(data, categoria) {
  const problemCategories = {
    'Envío': ['envío', 'envio', 'entrega', 'demora', 'tardó', 'llegó tarde'],
    'Calidad': ['calidad', 'malo', 'mala', 'defecto', 'roto', 'dañado'],
    'Precio': ['caro', 'precio', 'costoso', 'valor', 'dinero'],
    'Funcionalidad': ['funciona', 'sirve', 'uso', 'inútil', 'no sirve'],
    'Descripción': ['descripción', 'diferente', 'engaño', 'publicidad falsa'],
    'Atención': ['atención', 'vendedor', 'servicio', 'respuesta']
  };
  let negativeReviews = [];
  for (const item of data) {
    if (categoria !== 'todas' && item.categoria !== categoria) continue;
    if (Array.isArray(item.reviews)) {
      for (const r of item.reviews) {
        // rating puede ser string o número, considerar 1 o 2 como negativo
        const ratingNum = Number(r.rating);
        if (!isNaN(ratingNum) && ratingNum <= 4.0) {
          if (r.content && r.content.trim()) negativeReviews.push(r.content);
        }
      }
    }
  }
  // Si no hay reseñas negativas, mostrar "Sin problemas reportados"
  if (negativeReviews.length === 0) {
    return { pieLabelsProblems: ['Sin problemas reportados'], pieDataProblems: [1] };
  }
  const categories = {};
  for (const review of negativeReviews) {
    let found = false;
    const reviewLower = review.toLowerCase();
    for (const [cat, keywords] of Object.entries(problemCategories)) {
      if (keywords.some(k => reviewLower.includes(k))) {
        categories[cat] = (categories[cat] || 0) + 1;
        found = true;
      }
    }
    if (!found) categories['Otros'] = (categories['Otros'] || 0) + 1;
  }
  return { pieLabelsProblems: Object.keys(categories), pieDataProblems: Object.values(categories) };
}

function getVentasPorCategoriaYRating(data) {
  // Limpia precios y ratings
  const precios = data.map(item => limpiarPrecioColombiano(item.price)).filter(filtrarPrecioRealista);
  if (precios.length === 0) return { categorias: [], datasets: [] };

  const precioPromedio = precios.reduce((a, b) => a + b, 0) / precios.length;
  const umbralBajo = precioPromedio * 0.8;
  const umbralAlto = precioPromedio * 1.2;

  const categorias = ['Económico', 'Medio', 'Premium', 'Envío gratis'];
  const ratings = ['Rating bajo', 'Rating medio', 'Rating alto'];
  const colores = ['#FF4D4D', '#3498DB', '#0047AB'];

  // Inicializa estructura
  const datosPorRating = ratings.map(() => []);

  // Por categoría de precio
  for (const cat of ['Económico', 'Medio', 'Premium']) {
    for (let i = 0; i < ratings.length; i++) {
      const rating = ratings[i];
      const subset = data.filter(item => {
        const precio = limpiarPrecioColombiano(item.price);
        if (!filtrarPrecioRealista(precio)) return false;
        const avgRating = Number(item.avg_rating);
        let ratingCat = null;
        if (!isNaN(avgRating)) {
          if (avgRating < 3.5) ratingCat = 'Rating bajo';
          else if (avgRating < 4.5) ratingCat = 'Rating medio';
          else ratingCat = 'Rating alto';
        }
        let precioCat = null;
        if (precio < umbralBajo) precioCat = 'Económico';
        else if (precio <= umbralAlto) precioCat = 'Medio';
        else precioCat = 'Premium';
        return ratingCat === rating && precioCat === cat;
      });
      const ventas = subset.map(item => extraerVentas(item.total_ratings)).filter(v => !isNaN(v));
      const promedio = ventas.length ? ventas.reduce((a, b) => a + b, 0) / ventas.length : 0;
      datosPorRating[i].push(Number(promedio.toFixed(1)));
    }
  }
  // Envío gratis
  for (let i = 0; i < ratings.length; i++) {
    const rating = ratings[i];
    const subset = data.filter(item => {
      const avgRating = Number(item.avg_rating);
      let ratingCat = null;
      if (!isNaN(avgRating)) {
        if (avgRating < 3.5) ratingCat = 'Rating bajo';
        else if (avgRating < 4.5) ratingCat = 'Rating medio';
        else ratingCat = 'Rating alto';
      }
      const envioGratis = (item.shipping || '').toLowerCase().includes('gratis');
      return ratingCat === rating && envioGratis;
    });
    const ventas = subset.map(item => extraerVentas(item.total_ratings)).filter(v => !isNaN(v));
    const promedio = ventas.length ? ventas.reduce((a, b) => a + b, 0) / ventas.length : 0;
    datosPorRating[i].push(Number(promedio.toFixed(1)));
  }

  // Prepara datasets para Chart.js
  const datasets = ratings.map((rating, i) => ({
    label: rating,
    data: datosPorRating[i],
    borderColor: colores[i],
    backgroundColor: colores[i],
    tension: 0.3,
    pointStyle: i === 0 ? "circle" : i === 1 ? "rect" : "triangle",
    pointRadius: 7,
    fill: false,
  }));

  return { categorias, datasets };
}

function getPiePriceRangeData(data, categoria) {
  const filtered = data.filter(item => categoria === 'todas' || item.categoria === categoria);
  const preciosLimpiosCat = filtered.map(item => limpiarPrecioColombiano(item.price)).filter(filtrarPrecioRealista);
  if (preciosLimpiosCat.length === 0) {
    return { pieLabelsPriceRange: ['Sin datos'], pieDataPriceRange: [1] };
  }
  const precioProm = preciosLimpiosCat.reduce((a, b) => a + b, 0) / preciosLimpiosCat.length;
  const umbralBajo = precioProm * 0.8;
  const umbralAlto = precioProm * 1.2;
  const priceRanges = {
    [`Económico (< $${Math.round(umbralBajo).toLocaleString('es-CO')})`]: preciosLimpiosCat.filter(p => p < umbralBajo).length,
    [`Medio ($${Math.round(umbralBajo).toLocaleString('es-CO')} - $${Math.round(umbralAlto).toLocaleString('es-CO')})`]: preciosLimpiosCat.filter(p => p >= umbralBajo && p <= umbralAlto).length,
    [`Premium (> $${Math.round(umbralAlto).toLocaleString('es-CO')})`]: preciosLimpiosCat.filter(p => p > umbralAlto).length
  };
  return { pieLabelsPriceRange: Object.keys(priceRanges), pieDataPriceRange: Object.values(priceRanges) };
}

function getScatterData(data, categoria) {
  // Relación precio vs calificación promedio, como la imagen: X=precio, Y=rating
  return data
    .filter(item => {
      if (categoria !== 'todas' && item.categoria !== categoria) return false;
      const price = limpiarPrecioColombiano(item.price);
      const avgRating = Number(item.avg_rating);
      return !isNaN(price) && price > 0 && !isNaN(avgRating) && avgRating > 0;
    })
    .map(item => ({
      x: limpiarPrecioColombiano(item.price),
      y: Number(item.avg_rating),
      title: item.title
    }));
}

function filtrarPrecioRealista(precio) {
  return typeof precio === "number" && precio >= 10000 && precio <= 20000000;
}

function getLineVentasPorCategoriaYRating(data) {
  const precios = data.map(item => limpiarPrecioColombiano(item.price)).filter(x => !isNaN(x) && x > 0);
  const precioPromedio = precios.length ? precios.reduce((a, b) => a + b, 0) / precios.length : 0;
  const umbralBajo = precioPromedio * 0.8;
  const umbralAlto = precioPromedio * 1.2;
  const categorias = ['Económico', 'Medio', 'Premium', 'Envío gratis'];
  const ratings = ['Rating bajo', 'Rating medio', 'Rating alto'];
  const datos = { 'Rating bajo': [], 'Rating medio': [], 'Rating alto': [] };

  // Por categoría de precio
  for (const cat of ['Económico', 'Medio', 'Premium']) {
    for (const rating of ratings) {
      const subset = data.filter(item => {
        const precio = limpiarPrecioColombiano(item.price);
        const avgRating = Number(item.avg_rating);
        const ratingCat = clasificarRating(avgRating);
        let precioCat;
        if (precio < umbralBajo) precioCat = 'Económico';
        else if (precio <= umbralAlto) precioCat = 'Medio';
        else precioCat = 'Premium';
        return ratingCat === rating && precioCat === cat;
      });
      const ventas = subset.map(item => extraerVentas(item.total_ratings));
      const promedio = ventas.length ? ventas.reduce((a, b) => a + b, 0) / ventas.length : 0;
      datos[rating].push(Number(promedio.toFixed(1)));
    }
  }
  // Envío gratis
  for (const rating of ratings) {
    const subset = data.filter(item => {
      const avgRating = Number(item.avg_rating);
      const ratingCat = clasificarRating(avgRating);
      const envioGratis = (item.shipping || '').toLowerCase().includes('gratis');
      return ratingCat === rating && envioGratis;
    });
    const ventas = subset.map(item => extraerVentas(item.total_ratings));
    const promedio = ventas.length ? ventas.reduce((a, b) => a + b, 0) / ventas.length : 0;
    datos[rating].push(Number(promedio.toFixed(1)));
  }
  return { categorias, datos, ratings };
}


  export default function DashboardCharts({ categoriasDisponibles, preguntas }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtroBar, setFiltroBar] = useState("todas");
  const [filtroLine, setFiltroLine] = useState("todas");
  const [filtroPieFull, setFiltroPieFull] = useState("todas");
  const [filtroPieFeatures, setFiltroPieFeatures] = useState("todas");
  const [filtroPieProblems, setFiltroPieProblems] = useState("todas");
  const [filtroPiePriceRange, setFiltroPiePriceRange] = useState("todas");
  const [filtroScatter, setFiltroScatter] = useState("todas");
  const [filtroTermino, setFiltroTermino] = useState("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchData();
        setData(result);
        // Inicializar filtroTermino con el primer término disponible
        const terms = Array.from(new Set(result.map(item => item.search_term)));
        setFiltroTermino(terms[0] || "");
      } catch (e) {
        setError("No se pudo cargar los datos");
        setData([]);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const { categorias: catVentas, datasets: dsVentas } = getVentasPorCategoriaYRating(data);
  const terminosDisponibles = Array.from(new Set(data.map(item => item.search_term)));

  if (loading) return <div>Cargando datos...</div>;
  if (error) return <div style={{ color: 'red' }}>{error}</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
      {/* BarChart */}
      <div className="bg-pastel-soft p-6 rounded-xl shadow-lg border-2 border-pastel-accent">
        <CategoryFilter
          value={filtroBar}
          onChange={setFiltroBar}
          options={categoriasDisponibles}
          label={preguntas.bar}
        />
        <BarChart
          labels={getBarChartData(data, filtroBar).barLabels}
          data={getBarChartData(data, filtroBar).barData}
          title="Precio Promedio por Término"
          chartId="bar-categorias"
        />
      </div>
      {/* LineChart */}
      <div className="bg-pastel-soft p-6 rounded-xl shadow-lg border-2 border-pastel-accent">
        <div className="mb-2">
            <label className="font-semibold mr-2">Filtrar por término:</label>
            <select
            value={filtroTermino}
            onChange={e => setFiltroTermino(e.target.value)}
            className="border rounded px-2 py-1"
            >
            {terminosDisponibles.map(term => (
                <option key={term} value={term}>{term}</option>
            ))}
            </select>
        </div>
        <LineChart
        labels={getLineChartData(data, filtroLine, filtroTermino).lineLabels}
        data={getLineChartData(data, filtroLine, filtroTermino).lineData}
        title={`¿Cómo evoluciona el precio promedio por página para "${filtroTermino}"?`}
        yLabel="Precio promedio"
        xLabel="Página"
        chartId="line-precio-promedio"
        />
      </div>
      {/* PieChart Full */}
      <div className="bg-pastel-soft p-6 rounded-xl shadow-lg border-2 border-pastel-accent">
        <CategoryFilter
          value={filtroPieFull}
          onChange={setFiltroPieFull}
          options={categoriasDisponibles}
          label={preguntas.pieFull}
        />
        <PieChart
          labels={getPieFullData(data, filtroPieFull).pieLabelsFull}
          data={getPieFullData(data, filtroPieFull).pieDataFull}
          title="Distribución por Full"
          chartId="pie-full"
        />
      </div>
      {/* PieChart Features */}
      <div className="bg-pastel-soft p-6 rounded-xl shadow-lg border-2 border-pastel-accent">
        <CategoryFilter
          value={filtroPieFeatures}
          onChange={setFiltroPieFeatures}
          options={categoriasDisponibles}
          label={preguntas.pieFeatures}
        />
        <PieChart
          labels={getPieFeaturesData(data, filtroPieFeatures).pieLabelsFeatures}
          data={getPieFeaturesData(data, filtroPieFeatures).pieDataFeatures}
          title="Características de Productos"
          chartId="pie-features"
        />
      </div>
      {/* PieChart Problemas */}
      <div className="bg-pastel-soft p-6 rounded-xl shadow-lg border-2 border-pastel-accent">
        <CategoryFilter
          value={filtroPieProblems}
          onChange={setFiltroPieProblems}
          options={categoriasDisponibles}
          label={preguntas.pieProblems}
        />
        <PieChart
          labels={getPieProblemsData(data, filtroPieProblems).pieLabelsProblems}
          data={getPieProblemsData(data, filtroPieProblems).pieDataProblems}
          title="Problemas en Reseñas Negativas"
          chartId="pie-problems"
        />
      </div>
      {/* PieChart Price Range */}
      <div className="bg-pastel-soft p-6 rounded-xl shadow-lg border-2 border-pastel-accent">
        <CategoryFilter
          value={filtroPiePriceRange}
          onChange={setFiltroPiePriceRange}
          options={categoriasDisponibles}
          label={preguntas.piePriceRange}
        />
        <PieChart
          labels={getPiePriceRangeData(data, filtroPiePriceRange).pieLabelsPriceRange}
          data={getPiePriceRangeData(data, filtroPiePriceRange).pieDataPriceRange}
          title="Distribución por Rango de Precio"
          chartId="pie-pricerange"
        />
      </div>
      {/* ScatterChart */}
      <div className="bg-pastel-soft p-6 rounded-xl shadow-lg border-2 border-pastel-accent">
        <CategoryFilter
          value={filtroScatter}
          onChange={setFiltroScatter}
          options={categoriasDisponibles}
          label={preguntas.scatter}
        />
        <ScatterChart
          data={getScatterData(data, filtroScatter)}
          title="Precio vs. Calificación Promedio"
          chartId="scatter-precio-rating"
        />
      </div>
      {/* LineChart por categoría y rating */}
      <div className="bg-pastel-soft p-6 rounded-xl shadow-lg border-2 border-pastel-accent col-span-1 md:col-span-2 xl:col-span-3">
        <MultiLineChart
        labels={catVentas}
        datasets={dsVentas}
        title="Promedio de ventas por categoría según rating del vendedor"
        yLabel="Promedio de ventas"
        xLabel="Categoría de producto"
        chartId="line-ventas-categoria-rating"
        />
      </div>
    </div>
  );
}
