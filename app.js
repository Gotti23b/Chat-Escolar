const SUPABASE_URL = "https://cemxebmssszbdcddzdye.supabase.co";
const SUPABASE_KEY = "sb_publishable_tOtHYdFRu_EFbxwaLgph9w_4CyW0Ebq";
const ROOM_NAME = "servidor-escolar-publico";

const NAME_KEY = "servidorEscolarChatName";
const MAX_NAME_LENGTH = 24;
const MAX_MESSAGE_LENGTH = 500;
const HISTORY_TABLE = "chat_messages";
const HISTORY_LIMIT = 100;

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
const memeButton = document.getElementById("memeButton");
const memeDialog = document.getElementById("memeDialog");
const closeMemeButton = document.getElementById("closeMemeButton");
const memeGrid = document.getElementById("memeGrid");

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let channel = null;
let currentName = "";
let manualClose = false;
const renderedMessageIds = new Set();

const MEMES = [
  { name: "This is fine", template: "thisisfine" },
  { name: "Drake", template: "drake" },
  { name: "Distracted boyfriend", template: "db" },
  { name: "Doge", template: "doge" },
  { name: "Success", template: "success" },
  { name: "One does not simply", template: "aag" },
  { name: "Running away", template: "runningawayball" },
  { name: "Disaster girl", template: "disastergirl" }
];

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

function addChatMessage(name, text, id = null) {
  if (id && renderedMessageIds.has(id)) return;
  if (id) renderedMessageIds.add(id);

  const wrapper = document.createElement("article");
  wrapper.className = "message";
  if (name === currentName) wrapper.classList.add("mine");

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

function addMemeMessage(name, imageUrl, id = null) {
  if (id && renderedMessageIds.has(id)) return;
  if (id) renderedMessageIds.add(id);

  const wrapper = document.createElement("article");
  wrapper.className = "message meme-message";
  if (name === currentName) wrapper.classList.add("mine");

  const nameElement = document.createElement("div");
  nameElement.className = "message-name";
  nameElement.textContent = name;

  const image = document.createElement("img");
  image.className = "meme-image";
  image.src = imageUrl;
  image.alt = `Meme enviado por ${name}`;
  image.loading = "lazy";

  wrapper.append(nameElement, image);
  messages.appendChild(wrapper);
  scrollToBottom();
}

function scrollToBottom() {
  messages.scrollTop = messages.scrollHeight;
}

function setChatEnabled(enabled) {
  messageInput.disabled = !enabled;
  sendButton.disabled = !enabled;
  memeButton.disabled = !enabled;
}

function createMemeUrl(template) {
  const top = encodeURIComponent("CUANDO EL CHAT FUNCIONA").replace(/%20/g, "_");
  const bottom = encodeURIComponent("Y NADIE LO ROMPIÓ").replace(/%20/g, "_");
  return `https://api.memegen.link/images/${template}/${top}/${bottom}.webp?width=700`;
}

function openMemePicker() {
  memeGrid.replaceChildren();

  MEMES.forEach((meme) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "meme-option";

    const image = document.createElement("img");
    image.src = createMemeUrl(meme.template);
    image.alt = meme.name;
    image.loading = "lazy";

    const label = document.createElement("span");
    label.textContent = meme.name;

    button.append(image, label);
    button.addEventListener("click", () => sendMeme(createMemeUrl(meme.template)));
    memeGrid.appendChild(button);
  });

  memeDialog.showModal();
}

async function saveTextMessage(name, text) {
  const { data, error } = await supabaseClient
    .from(HISTORY_TABLE)
    .insert({ name, message_type: "text", text, image_url: null })
    .select("id")
    .single();
  if (error) throw error;
  return data?.id ?? null;
}

async function saveMemeMessage(name, imageUrl) {
  const { data, error } = await supabaseClient
    .from(HISTORY_TABLE)
    .insert({ name, message_type: "meme", text: null, image_url: imageUrl })
    .select("id")
    .single();
  if (error) throw error;
  return data?.id ?? null;
}

async function loadChatHistory() {
  const { data, error } = await supabaseClient
    .from(HISTORY_TABLE)
    .select("id,name,message_type,text,image_url,created_at")
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);

  if (error) throw error;

  renderedMessageIds.clear();
  messages.replaceChildren();

  for (const row of [...(data || [])].reverse()) {
    const name = sanitizePlainText(row.name, MAX_NAME_LENGTH);
    if (!name) continue;

    if (row.message_type === "meme" && typeof row.image_url === "string") {
      if (row.image_url.startsWith("https://api.memegen.link/")) {
        addMemeMessage(name, row.image_url, row.id);
      }
    } else if (row.message_type === "text" && typeof row.text === "string") {
      const text = sanitizePlainText(row.text, MAX_MESSAGE_LENGTH);
      if (text) addChatMessage(name, text, row.id);
    }
  }
}

async function sendMeme(imageUrl) {
  if (!channel || !currentName) return;

  try {
    const id = await saveMemeMessage(currentName, imageUrl);
    const response = await channel.send({
      type: "broadcast",
      event: "meme",
      payload: { id, name: currentName, imageUrl }
    });

    if (response !== "ok") {
      showError("No se pudo enviar el meme.");
      return;
    }

    memeDialog.close();
  } catch (error) {
    showError(error?.message || "No se pudo guardar el meme.");
  }
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

  try {
    await loadChatHistory();
  } catch (error) {
    showError("No se pudo cargar el historial: " + (error?.message || "error desconocido"));
  }

  channel = supabaseClient.channel(ROOM_NAME, {
    config: { broadcast: { self: true, ack: true } }
  });

  channel.on("broadcast", { event: "message" }, ({ payload }) => {
    if (!payload || typeof payload !== "object") return;
    const name = sanitizePlainText(payload.name, MAX_NAME_LENGTH);
    const text = sanitizePlainText(payload.text, MAX_MESSAGE_LENGTH);
    if (!name || !text) return;
    addChatMessage(name, text, payload.id || null);
  });

  channel.on("broadcast", { event: "meme" }, ({ payload }) => {
    if (!payload || typeof payload !== "object") return;
    const name = sanitizePlainText(payload.name, MAX_NAME_LENGTH);
    if (!name || typeof payload.imageUrl !== "string") return;
    if (!payload.imageUrl.startsWith("https://api.memegen.link/")) return;
    addMemeMessage(name, payload.imageUrl, payload.id || null);
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
  renderedMessageIds.clear();
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

  try {
    const id = await saveTextMessage(currentName, text);
    const response = await channel.send({
      type: "broadcast",
      event: "message",
      payload: { id, name: currentName, text }
    });

    if (response !== "ok") {
      showError("No se pudo enviar el mensaje.");
      return;
    }

    messageInput.value = "";
    messageInput.focus();
  } catch (error) {
    showError(error?.message || "No se pudo guardar el mensaje.");
  }
});

memeButton.addEventListener("click", openMemePicker);
closeMemeButton.addEventListener("click", () => memeDialog.close());
changeNameButton.addEventListener("click", leaveChat);

window.addEventListener("beforeunload", () => {
  manualClose = true;
  if (channel) supabaseClient.removeChannel(channel);
});

const savedName = localStorage.getItem(NAME_KEY);
if (savedName) {
  nameInput.value = sanitizePlainText(savedName, MAX_NAME_LENGTH);
  enterChat(nameInput.value);
} else {
  nameInput.focus();
}
