// Cambiá esta dirección cuando publiques el backend.
// Desarrollo local:
const SERVER_URL = "ws://localhost:8080";
// Producción (ejemplo): const SERVER_URL = "wss://tu-servidor.example.com";

const NAME_KEY = "servidorEscolarChatName";
const MAX_NAME_LENGTH = 24;
const MAX_MESSAGE_LENGTH = 500;

const namePanel = document.getElementById("namePanel");
const nameForm = document.getElementById("nameForm");
const nameInput = document.getElementById("nameInput");
const chatPanel = document.getElementById("chatPanel");
const messages = document.getElementById("messages");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const changeNameButton = document.getElementById("changeNameButton");
const connectionStatus = document.getElementById("connectionStatus");
const errorMessage = document.getElementById("errorMessage");

let socket = null;
let currentName = "";
let reconnectTimer = null;
let manualClose = false;

function sanitizePlainText(value, maxLength) {
  return String(value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, maxLength);
}

function setStatus(text, className) {
  connectionStatus.textContent = text;
  connectionStatus.className = `status ${className}`;
}

function showError(text) {
  errorMessage.textContent = text;
}

function addSystemMessage(text) {
  const element = document.createElement("div");
  element.className = "system-message";
  element.textContent = text;
  messages.appendChild(element);
  scrollToBottom();
}

function addChatMessage(name, text) {
  const wrapper = document.createElement("article");
  wrapper.className = "message";
  if (name === currentName) {
    wrapper.classList.add("mine");
  }

  const nameElement = document.createElement("div");
  nameElement.className = "message-name";
  nameElement.textContent = name;

  const bodyElement = document.createElement("div");
  bodyElement.className = "message-body";
  bodyElement.textContent = text;

  wrapper.append(nameElement, bodyElement);
  messages.appendChild(wrapper);
  scrollToBottom();
}

function scrollToBottom() {
  messages.scrollTop = messages.scrollHeight;
}

function setChatEnabled(enabled) {
  messageInput.disabled = !enabled;
  sendButton.disabled = !enabled;
}

function connect() {
  if (!currentName || manualClose) {
    return;
  }

  if (socket && (socket.readyState === WebSocket.OPEN ||
                 socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  setStatus("🟡 Conectando...", "status-connecting");

  try {
    socket = new WebSocket(SERVER_URL);
  } catch {
    setStatus("🔴 Dirección del servidor inválida", "status-offline");
    scheduleReconnect();
    return;
  }

  socket.addEventListener("open", () => {
    setStatus("🟢 Conectado", "status-online");
    setChatEnabled(true);
    showError("");

    socket.send(JSON.stringify({
      type: "join",
      name: currentName
    }));
  });

  socket.addEventListener("message", (event) => {
    let data;

    try {
      data = JSON.parse(event.data);
    } catch {
      return;
    }

    if (data.type === "system") {
      addSystemMessage(data.text);
      return;
    }

    if (data.type === "message") {
      addChatMessage(data.name, data.text);
      return;
    }

    if (data.type === "error") {
      showError(data.text || "El servidor rechazó la operación.");
    }
  });

  socket.addEventListener("close", () => {
    setChatEnabled(false);
    setStatus("🔴 Desconectado", "status-offline");
    socket = null;

    if (!manualClose) {
      scheduleReconnect();
    }
  });

  socket.addEventListener("error", () => {
    setChatEnabled(false);
    setStatus("🔴 Error de conexión", "status-offline");
  });
}

function scheduleReconnect() {
  if (reconnectTimer || manualClose || !currentName) {
    return;
  }

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, 2500);
}

function enterChat(name) {
  const cleanName = sanitizePlainText(name, MAX_NAME_LENGTH);

  if (!cleanName) {
    showError("Escribí un nombre o apodo.");
    nameInput.focus();
    return;
  }

  currentName = cleanName;
  localStorage.setItem(NAME_KEY, currentName);

  namePanel.classList.add("hidden");
  chatPanel.classList.remove("hidden");
  showError("");
  connect();
  messageInput.focus();
}

function leaveChat() {
  manualClose = true;

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (socket) {
    socket.close();
    socket = null;
  }

  currentName = "";
  localStorage.removeItem(NAME_KEY);
  messages.replaceChildren();
  setChatEnabled(false);
  setStatus("🔴 Desconectado", "status-offline");

  chatPanel.classList.add("hidden");
  namePanel.classList.remove("hidden");
  nameInput.value = "";
  nameInput.focus();

  manualClose = false;
}

nameForm.addEventListener("submit", (event) => {
  event.preventDefault();
  enterChat(nameInput.value);
});

messageForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const text = sanitizePlainText(messageInput.value, MAX_MESSAGE_LENGTH);

  if (!text) {
    return;
  }

  if (!socket || socket.readyState !== WebSocket.OPEN) {
    showError("Todavía no estás conectado al servidor.");
    return;
  }

  socket.send(JSON.stringify({
    type: "message",
    text
  }));

  messageInput.value = "";
  messageInput.focus();
});

changeNameButton.addEventListener("click", leaveChat);

window.addEventListener("beforeunload", () => {
  manualClose = true;
  if (socket) {
    socket.close();
  }
});

const savedName = localStorage.getItem(NAME_KEY);

if (savedName) {
  nameInput.value = sanitizePlainText(savedName, MAX_NAME_LENGTH);
  enterChat(nameInput.value);
} else {
  nameInput.focus();
}
