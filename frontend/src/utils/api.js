const API_URL = import.meta.env.PUBLIC_API_URL;

export async function fetchData(password) {
  const res = await fetch(`${API_URL}/data/all`, {
    headers: { 'Authorization': password }
  });
  if (!res.ok) throw new Error('No autorizado o error de red');
  return await res.json();
}

export async function uploadCsv(file, password) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_URL}/upload_csv`, {
    method: 'POST',
    headers: { 'Authorization': password },
    body: formData
  });
  if (!res.ok) throw new Error('No autorizado o error de red');
  return await res.json();
}

export async function startScraping(query, pages, password) {
  const res = await fetch(`${API_URL}/scrap`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': password
    },
    body: JSON.stringify({ query, pages: Number(pages) })
  });
  if (!res.ok) throw new Error('No autorizado o error de red');
  return await res.json();
}

export async function getScrapingStatus() {
  const res = await fetch(`${API_URL}/scrap-status`);
  if (!res.ok) throw new Error('Error de red');
  return await res.json();
}
