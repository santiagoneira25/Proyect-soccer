# Fútbol en Bloques – Liga Colombiana (versión online con servidor propio)

Un solo servicio sirve el juego y las salas. Sin dependencias (solo Node 18+).

## Probar en tu computador
    node server.js
Abre http://localhost:3000 (en tu misma red usa http://TU-IP:3000).

## Publicarlo gratis para jugar con tu amigo por internet
1. Sube esta carpeta a un repositorio de GitHub.
2. En render.com: New > Web Service > conecta el repo.
   - Runtime: Node · Build command: (vacío) · Start command: `node server.js`
3. Render te da una URL https://algo.onrender.com. Tú y tu amigo abren esa URL.
4. Uno pulsa "Crear sala online" y pasa el código de 4 letras; el otro lo escribe en "Unirse a sala".

Sirve igual en Railway, Fly.io, Glitch o Replit (el servidor lee el puerto de la variable PORT).
Los planes gratis se duermen tras un rato sin uso; la primera carga puede tardar ~30 s.
