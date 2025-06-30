import React from "react";

export default function CategoryFilter({ value, onChange, options, label }) {
  return (
    <div className="mb-2">
      {label && <span className="block text-pastel-strong font-semibold mb-1">{label}</span>}
      <select
        className="mb-2 px-2 py-1 rounded border"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        {options.map(cat => (
          <option key={cat} value={cat}>
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </option>
        ))}
      </select>
    </div>
  );
}
