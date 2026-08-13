// Historial persistente del Chat Grupal (rama Prueba).
// Este módulo centraliza la lectura y escritura del historial en Supabase.

const HISTORY_TABLE = "chat_messages";
const HISTORY_LIMIT = 100;

export async function loadChatHistory(supabaseClient, addChatMessage, addMemeMessage) {
  const { data, error } = await supabaseClient
    .from(HISTORY_TABLE)
    .select("id,name,message_type,text,image_url,created_at")
    .order("created_at", { ascending: true })
    .limit(HISTORY_LIMIT);

  if (error) throw error;

  for (const row of data || []) {
    if (row.message_type === "meme" && typeof row.image_url === "string") {
      if (row.image_url.startsWith("https://api.memegen.link/")) {
        addMemeMessage(row.name, row.image_url);
      }
    } else if (row.message_type === "text" && typeof row.text === "string") {
      addChatMessage(row.name, row.text);
    }
  }
}

export async function saveTextMessage(supabaseClient, name, text) {
  return supabaseClient.from(HISTORY_TABLE).insert({
    name,
    message_type: "text",
    text,
    image_url: null
  });
}

export async function saveMemeMessage(supabaseClient, name, imageUrl) {
  return supabaseClient.from(HISTORY_TABLE).insert({
    name,
    message_type: "meme",
    text: null,
    image_url: imageUrl
  });
}
