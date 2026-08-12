const SUPABASE_URL = "https://cemxebmssszbdcddzdye.supabase.co";
const SUPABASE_KEY = "sb_publishable_tOtHYdFRu_EFbxwaLgph9w_4CyW0Ebq";
const ROOM_NAME = "servidor-escolar-publico";

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

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let channel = null;
let currentName = "";
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

async function connect() {
  if (!currentName || manualClose) return;

  if (channel) {
    await supabaseClient.removeChannel(channel);
    channel = null;
  }

  setStatus("🟡 Conectando...", "status-connecting");
  setChatEnabled(false);
  showError("");

  channel = supabaseClient.channel(ROOM_NAME, {
    config: {
      broadcast: {
        self: true,
        ack: true
      }
    }
  });

  channel.on("broadcast", { event: "message" }, ({ payload }) => {
    if (!payload || typeof payload !== "object") return;

    const name = sanitizePlainText(payload.name, MAX_NAME_LENGTH);
    const text = sanitizePlainText(payload.text, MAX_MESSAGE_LENGTH);

    if (!name || !text) return;
    addChatMessage(name, text);
  });

  channel.on("broadcast", { event: "system" }, ({ payload }) => {
    if (!payload || typeof payload.text !== "string") return;
    addSystemMessage(sanitizePlainText(payload.text, 200));
  });

  channel.subscribe(async (status, error) => {
    if (status === "SUBSCRIBED") {
      setStatus("🟢 Conectado", "status-online");
      setChatEnabled(true);
      showError("");
      return;
    }

    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
      setChatEnabled(false);
      setStatus("🔴 Error de conexión", "status-offline");
      showError(error?.message || "No se pudo conectar al chat.");
    }
  });
}

async function leaveChat() {
  manualClose = true;

  if (channel) {
    await supabaseClient.removeChannel(channel);
    channel = null;
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

async function enterChat(name) {
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
  await connect();
  messageInput.focus();
}

nameForm.addEventListener("submit", (event) => {
  event.preventDefault();
  enterChat(nameInput.value);
});

messageForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const text = sanitizePlainText(messageInput.value, MAX_MESSAGE_LENGTH);
  if (!text) return;

  if (!channel) {
    showError("Todavía no estás conectado al chat.");
    return;
  }

  const response = await channel.send({
    type: "broadcast",
    event: "message",
    payload: {
      name: currentName,
      text
    }
  });

  if (response !== "ok") {
    showError("No se pudo enviar el mensaje.");
    return;
  }

  messageInput.value = "";
  messageInput.focus();
});

changeNameButton.addEventListener("click", leaveChat);

window.addEventListener("beforeunload", () => {
  manualClose = true;
  if (channel) {
    supabaseClient.removeChannel(channel);
  }
});

const savedName = localStorage.getItem(NAME_KEY);

if (savedName) {
  nameInput.value = sanitizePlainText(savedName, MAX_NAME_LENGTH);
  enterChat(nameInput.value);
} else {
  nameInput.focus();
}
