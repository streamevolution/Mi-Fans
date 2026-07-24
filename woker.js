// worker.js - Lógica de WebSockets para Mi Fans

// Esta variable en memoria RAM guardará temporalmente a los usuarios conectados
const connectedClients = new Set();

export default {
  async fetch(request) {
    const upgradeHeader = request.headers.get('Upgrade');
    
    // Verificamos si la petición es para abrir un WebSocket
    if (!upgradeHeader || upgradeHeader !== 'websocket') {
      return new Response('Este endpoint es exclusivo para WebSockets.', { status: 426 });
    }

    // Creamos la conexión par (Cliente - Servidor)
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    // Aceptamos la conexión y agregamos al usuario a nuestra RAM temporal
    server.accept();
    connectedClients.add(server);

    // Cuando el Worker recibe un mensaje de un usuario (Ej. "Ya leí el mensaje 123")
    server.addEventListener('message', event => {
      // Rebotamos (Broadcast) ese mensaje a TODOS los demás usuarios conectados
      for (let connectedClient of connectedClients) {
        if (connectedClient !== server) {
          try {
            connectedClient.send(event.data);
          } catch (err) {
            // Si hay error (ej. se desconectó de golpe), lo borramos de la memoria
            connectedClients.delete(connectedClient);
          }
        }
      }
    });

    // Limpieza de memoria RAM cuando el usuario cierra la app
    server.addEventListener('close', () => {
      connectedClients.delete(server);
    });
    
    server.addEventListener('error', () => {
      connectedClients.delete(server);
    });

    // Respondemos con el túnel abierto
    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }
};
