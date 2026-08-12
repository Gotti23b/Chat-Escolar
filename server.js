const http = require("http");
const { WebSocketServer } = require("ws");

const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || "0.0.0.0";

const MAX_NAME_LENGTH = 24;
const MAX_MESSAGE_LENGTH = 500;
const MAX_PAYLOAD_BYTES = 4096;

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Servidor Escolar Chat - WebSocket activo\n");
});

const wss = new WebSocketServer({
  server,
  maxPayload: MAX_PAYLOAD_BYTES
});

const clients = new Map();

function cleanText(value, maxLength) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
}

function isValidName(name) {
  return name.length >= 1 && name.length <= MAX_NAME_LENGTH;
}

function isValidMessage(message) {
  return message.length >= 1 && message.length <= MAX_MESSAGE_LENGTH;
}

function send(ws, data) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function broadcast(data, except = null) {
  const payload = JSON.stringify(data);

  for (const client of wss.clients) {
    if (client !== except && client.readyState === client.OPEN) {
      client.send(payload);
    }
  }
}

function broadcastSystem(text, except = null) {
  broadcast({ type: "system", text }, except);
}

wss.on("connection", (ws) => {
  let clientName = null;

  ws.on("message", (raw) => {
    let data;

    try {
      data = JSON.parse(raw.toString());
    } catch {
      send(ws, { type: "error", text: "Mensaje inválido." });
      return;
    }

    if (!data || typeof data !== "object") {
      send(ws, { type: "error", text: "Formato inválido." });
      return;
    }

    if (data.type === "join") {
      if (clientName !== null) {
        send(ws, { type: "error", text: "Ya estás conectado." });
        return;
      }

      const name = cleanText(data.name, MAX_NAME_LENGTH);

      if (!isValidName(name)) {
        send(ws, { type: "error", text: "El nombre debe tener entre 1 y 24 caracteres." });
        return;
      }

      // Evita nombres duplicados mientras no haya cuentas/autenticación.
      const normalizedName = name.toLocaleLowerCase();
      for (const existingName of clients.values()) {
        if (existingName.toLocaleLowerCase() === normalizedName) {
          send(ws, { type: "error", text: "Ese nombre ya está en uso." });
          ws.close(1008, "Nombre duplicado");
          return;
        }
      }

      clientName = name;
      clients.set(ws, clientName);
      broadcastSystem(`🟢 ${clientName} se conectó`, ws);
      return;
    }

    if (data.type === "message") {
      if (clientName === null) {
        send(ws, { type: "error", text: "Primero tenés que entrar con un nombre." });
        return;
      }

      const text = cleanText(data.text, MAX_MESSAGE_LENGTH);

      if (!isValidMessage(text)) {
        send(ws, { type: "error", text: "El mensaje debe tener entre 1 y 500 caracteres." });
        return;
      }

      broadcast({
        type: "message",
        name: clientName,
        text
      });

      return;
    }

    send(ws, { type: "error", text: "Tipo de operación desconocido." });
  });

  ws.on("close", () => {
    if (clientName !== null) {
      clients.delete(ws);
      broadcastSystem(`🔴 ${clientName} se desconectó`);
    }
  });

  ws.on("error", () => {
    // El evento close se ocupa de limpiar el cliente.
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Servidor Escolar Chat escuchando en http://${HOST}:${PORT}`);
});
