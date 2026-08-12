# 💬 Servidor Escolar Chat

Mini chat escolar para navegador, sin cuentas ni contraseñas.

El frontend está publicado en GitHub Pages y usa **Supabase Realtime Broadcast** para enviar mensajes en tiempo real entre los navegadores conectados.

## 🚀 Cómo funciona

```text
GitHub Pages
    │
    │ app.js
    ▼
Supabase Realtime
    │
    ├── 📱 Navegador A
    └── 💻 Navegador B
```

No hace falta Node.js, un servidor propio ni tener una computadora encendida.

## 📁 Estructura

```text
Chat-Escolar/
├── index.html
├── style.css
├── app.js
└── README.md
```

## ☁️ Supabase

El chat utiliza un canal público de Realtime llamado:

```text
servidor-escolar-publico
```

Los mensajes se envían mediante **Broadcast** y no se guardan en una tabla de historial.

El frontend utiliza la **Publishable key** de Supabase, que está diseñada para ser utilizada desde aplicaciones cliente. No se debe colocar nunca una `secret key` o una `service_role key` en este repositorio.

## 💬 Nombres y mensajes

- Nombre: máximo 24 caracteres.
- Mensaje: máximo 500 caracteres.
- Se eliminan caracteres de control problemáticos.
- Los nombres y mensajes se muestran mediante `textContent`, no mediante HTML proporcionado por el usuario.
- El nombre elegido se guarda solamente en `localStorage` del navegador.

Como no hay autenticación, el nombre es solamente un apodo y no una identidad verificada.

## 🧠 Historial

El proyecto **no guarda el historial de mensajes**. Los mensajes se reciben solamente mientras los usuarios están conectados al canal de Realtime.

Si un usuario entra después de que se envió un mensaje, no verá ese mensaje anterior.

## 🌐 GitHub Pages

GitHub Pages se encarga de publicar:

```text
index.html
style.css
app.js
```

Supabase se encarga únicamente de la comunicación Realtime.

## 📱 Compatibilidad

Pensado para navegadores modernos en celulares y computadoras.
