// /api/scheiben.js  (Node.js API Route für Vercel)
let boards = []; // simple In-Memory (für Tests). Für persistent: Vercel KV/Postgres.

export default async function handler(req, res) {
  // CORS
  const allow = [
    "https://darttraining.pages.dev",
    "https://spitzbuwe.github.io",
    "http://localhost:3000"
  ];
  const origin = req.headers.origin || "";
  res.setHeader("Access-Control-Allow-Origin", allow.some(o => origin.startsWith(o)) ? origin : "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    return res.status(200).json({ scheiben: boards });
  }

  if (req.method === "POST") {
    const body = (req.body && typeof req.body === "object") ? req.body : {};
    const eintrag = {
      id: (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)),
      name: body?.name || `Scheibe ${boards.length + 1}`,
      location: body?.location || 'Unbekannt',
      status: body?.status || 'online',
      apiKey: body?.apiKey || generateApiKey(),
      url: body?.url || 'http://localhost:3000',
      createdAt: new Date().toISOString()
    };
    boards.push(eintrag);
    return res.status(201).json({ erfolgreich: true, eintrag });
  }

  if (req.method === "PUT") {
    const { id } = req.query;
    const body = (req.body && typeof req.body === "object") ? req.body : {};
    const index = boards.findIndex(b => b.id === id);
    
    if (index === -1) {
      return res.status(404).json({ error: "Board nicht gefunden" });
    }
    
    boards[index] = { ...boards[index], ...body, updatedAt: new Date().toISOString() };
    return res.status(200).json({ erfolgreich: true, eintrag: boards[index] });
  }

  if (req.method === "DELETE") {
    const { id } = req.query;
    const index = boards.findIndex(b => b.id === id);
    
    if (index === -1) {
      return res.status(404).json({ error: "Board nicht gefunden" });
    }
    
    const deleted = boards.splice(index, 1)[0];
    return res.status(200).json({ erfolgreich: true, eintrag: deleted });
  }

  return res.status(404).send("Nicht gefunden");
}

// Hilfsfunktion für API Key Generierung
function generateApiKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
