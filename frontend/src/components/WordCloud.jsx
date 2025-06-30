import React, { useEffect, useState, useRef } from "react";
import ReactWordcloud from "react-wordcloud";

export default function WordCloudComponent({ words = [], title = "", chartId = "" }) {
  const [isClient, setIsClient] = useState(false);
  const [canRender, setCanRender] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      setCanRender(width > 0 && height > 0);
    }
  }, [isClient, words]);

  // Log para depuración
  useEffect(() => {
    console.log("Palabras recibidas en WordCloud:", words);
  }, [words]);

  // Validación estricta de datos
  const validWords = Array.isArray(words)
    ? words.filter(
        w =>
          w &&
          typeof w.text === "string" &&
          w.text.length > 0 &&
          typeof w.value === "number" &&
          !isNaN(w.value)
      )
    : [];

  const options = {
    rotations: 2,
    rotationAngles: [-90, 0, 90],
    fontSizes: [14, 60],
    fontFamily: "sans-serif",
    scale: "sqrt",
    spiral: "archimedean",
    padding: 2,
  };

  if (!isClient) return null;

  if (!validWords.length) {
    return (
      <div>
        <h3 className="font-semibold mb-2">{title}</h3>
        <div style={{ minHeight: 100, color: "#888" }}>Sin datos suficientes</div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <div ref={containerRef} style={{ width: "100%", height: 400 }}>
        {canRender && (
          <ReactWordcloud words={validWords} options={options} />
        )}
      </div>
    </div>
  );
}