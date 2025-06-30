import React, { useState } from "react";

export default function CategorizeButton({ apiUrl, onCategorized }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleClick = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${apiUrl}/data/categorize-all`, { method: "POST" });
      const json = await res.json();
      setResult(json.message || "¡Listo!");
      if (onCategorized) onCategorized();
    } catch (e) {
      setResult("Error al categorizar: " + e.message);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center gap-2 mb-4">
      <button
        className="bg-white text-pastel-strong border-2 border-pastel-strong px-6 py-2 rounded-xl font-bold shadow hover:bg-pastel-soft focus:outline-none focus:ring-2 focus:ring-pastel-accent transition cursor-pointer"
        onClick={handleClick}
        disabled={loading}
        style={{ minWidth: 180 }}
      >
        {loading ? "Categorizando..." : "Categorizar todos los productos"}
      </button>
      {result && <div className="text-pastel-strong font-semibold ml-2">{result}</div>}
    </div>
  );
}
