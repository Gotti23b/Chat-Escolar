# Servidor Escolar Chat

Mini chat escolar para navegador, sin cuentas ni contraseñas. El frontend usa WebSocket para recibir y enviar mensajes en tiempo real, y el backend Node.js retransmite los mensajes a los usuarios conectados.

## Estructura

```text
servidor-escolar-chat/
├── index.html
├── style.css
├── app.js
├── README.md
└── servidor/
    ├── server.js
    └── package.json
```

## 1. Instalar Node.js

Instalá una versión reciente de Node.js (18 o superior) desde el sitio oficial de Node.js.

Después comprobá que esté disponible:

```bash
node --version
npm --version
```

## 2. Entrar en la carpeta del servidor

Desde una terminal:

```bash
cd servidor-escolar-chat/servidor
```

## 3. Instalar las dependencias

```bash
npm install
```

Esto instala `ws`, la librería utilizada para WebSocket.

## 4. Iniciar el servidor

```bash
npm start
```

Por defecto queda escuchando en el puerto `8080`.

También existe un endpoint de prueba:

```text
http://localhost:8080/health
```

Si responde `{"status":"ok"}`, el servidor está funcionando.

## 5. Probar el chat localmente

El frontend necesita abrirse desde un servidor HTTP para evitar problemas del navegador con archivos locales.

Una forma sencilla es usar cualquier servidor estático. Por ejemplo, si tenés Python instalado:

```bash
cd servidor-escolar-chat
python -m http.server 5500
```

Luego abrí:

```text
http://localhost:5500
```

En `app.js` ya está configurado:

```js
const SERVER_URL = "ws://localhost:8080";
```

Abrí dos pestañas o dos dispositivos dentro de la misma red (si el backend está accesible) y usá nombres diferentes. Los mensajes deberían aparecer automáticamente sin recargar.

## 6. Subir el frontend a GitHub Pages

GitHub Pages puede alojar los tres archivos del frontend:

- `index.html`
- `style.css`
- `app.js`

No puede ejecutar `servidor/server.js`.

Podés subir el proyecto a un repositorio de GitHub y activar GitHub Pages desde la configuración del repositorio, usando la rama/carpeta donde estén los archivos del frontend.

Una vez publicado, la página tendrá una dirección `https://...`.

## 7. Ejecutar el backend online

El backend debe ejecutarse en un servicio que permita aplicaciones Node.js y conexiones WebSocket.

El proveedor elegido debe darte una dirección pública para el WebSocket, por ejemplo:

```text
wss://tu-servidor.example.com
```

Después cambiá en `app.js`:

```js
const SERVER_URL = "ws://localhost:8080";
```

por algo como:

```js
const SERVER_URL = "wss://tu-servidor.example.com";
```

Usá `wss://` cuando el frontend de GitHub Pages se sirva mediante HTTPS. Los navegadores normalmente bloquean una conexión `ws://` insegura desde una página HTTPS.

## Variables del backend

El backend acepta:

- `PORT`: puerto de escucha. Si no se especifica, usa `8080`.
- `HOST`: dirección de escucha. Si no se especifica, usa `0.0.0.0`.

Ejemplo:

```bash
PORT=8080 npm start
```

El código también es compatible con plataformas que asignan automáticamente el puerto mediante la variable `PORT`.

## Seguridad básica incluida

Este proyecto no tiene autenticación, tal como se solicitó. Aun así:

- El servidor valida la estructura JSON recibida.
- El servidor limita los nombres a 24 caracteres.
- El servidor limita los mensajes a 500 caracteres.
- Se eliminan caracteres de control problemáticos.
- El frontend utiliza `textContent` para mostrar nombres y mensajes; no inserta contenido del usuario mediante `innerHTML`.
- Se evita que dos usuarios conectados utilicen exactamente el mismo nombre, sin distinguir mayúsculas/minúsculas.
- El servidor limita el tamaño máximo del payload WebSocket.
- El nombre se guarda únicamente en `localStorage` del navegador.

## Importante: sin autenticación

Como no hay cuentas ni contraseñas, el nombre no es una identidad segura. Un usuario podría volver a conectarse usando otro nombre. Si en el futuro necesitás moderación, permisos, historial persistente o identidades verificadas, habría que agregar autenticación y almacenamiento en el backend.

## Qué queda ejecutándose dónde

### GitHub Pages

Ejecuta/publica:

```text
index.html
style.css
app.js
```

### Servidor Node.js

Ejecuta:

```text
servidor/server.js
servidor/package.json
```

El navegador se conecta directamente desde `app.js` al backend mediante WebSocket.

## Historial

Este ejemplo retransmite los mensajes solamente a los usuarios conectados. No guarda un historial en una base de datos. Si el servidor se reinicia, los mensajes anteriores no se recuperan.

## Compatibilidad

Está pensado para navegadores modernos en celulares y computadoras, con una interfaz responsive.
