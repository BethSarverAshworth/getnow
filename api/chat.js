const store = globalThis.__getnowChat || (globalThis.__getnowChat = { rooms: {} });

function cleanRoom(r) {
  return (
    String(r || "general")
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, "")
      .slice(0, 24) || "general"
  );
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const room = cleanRoom(req.query.room);
  if (!store.rooms[room]) store.rooms[room] = [];

  if (req.method === "GET") {
    return res.status(200).json(store.rooms[room].slice(-80));
  }

  if (req.method === "POST") {
    const bodyIn = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const text = String(bodyIn.body || "").trim().slice(0, 1000);
    const author = String(bodyIn.author || "Anonymous").trim().slice(0, 32) || "Anonymous";
    const authorKey = String(bodyIn.author_key || bodyIn.authorKey || "").trim().slice(0, 80);
    if (!text) return res.status(400).json({ error: "empty" });
    const row = {
      id:
        (globalThis.crypto && crypto.randomUUID && crypto.randomUUID()) ||
        "m-" + Date.now() + "-" + Math.random().toString(36).slice(2),
      room,
      author,
      author_key: authorKey,
      body: text,
      created_at: new Date().toISOString(),
    };
    store.rooms[room].push(row);
    if (store.rooms[room].length > 200) store.rooms[room] = store.rooms[room].slice(-200);
    return res.status(200).json(row);
  }

  return res.status(405).end();
}
