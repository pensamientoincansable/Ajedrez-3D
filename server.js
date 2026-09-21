/**
 * Professional Chess 3D - Multiplayer Server
 * Handles lobby, matchmaking, and real-time game relay
 * Run with: node server.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Try to load ws, fallback to no websocket
let WebSocket;
try {
    WebSocket = require('ws');
} catch (e) {
    console.log('ws module not found, installing...');
    // We'll run without ws for now, but try to require later
}

const PORT = process.env.PORT || 3000;

// In-memory storage
const rooms = new Map(); // roomId -> { id, host, hostName, guest, guestName, gameState }
const players = new Map(); // playerId -> { ws, name, roomId }

function serveFile(res, filePath, contentType) {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('Not found');
            return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
}

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    let filePath = req.url.split('?')[0];
    if (filePath === '/') filePath = '/index.html';
    
    const fullPath = path.join(__dirname, filePath);
    
    // Security: prevent directory traversal
    if (!fullPath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    const ext = path.extname(fullPath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    // Check if file exists
    fs.access(fullPath, fs.constants.F_OK, (err) => {
        if (err) {
            // Try index.html for SPA routing
            if (ext === '') {
                serveFile(res, path.join(__dirname, 'index.html'), 'text/html');
            } else {
                res.writeHead(404);
                res.end('Not found: ' + filePath);
            }
            return;
        }
        serveFile(res, fullPath, contentType);
    });
});

let wss = null;

if (WebSocket) {
    wss = new WebSocket.Server({ server });

    wss.on('connection', (ws) => {
        let currentPlayerId = null;

        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message);
                handleMessage(ws, data);
            } catch (e) {
                console.error('Message parse error:', e);
            }
        });

        ws.on('close', () => {
            if (currentPlayerId) {
                const player = players.get(currentPlayerId);
                if (player && player.roomId) {
                    const room = rooms.get(player.roomId);
                    if (room) {
                        // Notify opponent
                        const opponentId = room.host === currentPlayerId ? room.guest : room.host;
                        if (opponentId) {
                            const opponent = players.get(opponentId);
                            if (opponent && opponent.ws.readyState === WebSocket.OPEN) {
                                opponent.ws.send(JSON.stringify({
                                    type: 'opponent_left',
                                    roomId: room.id
                                }));
                            }
                        }
                        // Clean room if host leaves or both leave
                        if (room.host === currentPlayerId) {
                            rooms.delete(room.id);
                            console.log(`Room ${room.id} deleted (host left)`);
                        } else {
                            room.guest = null;
                            room.guestName = null;
                        }
                    }
                }
                players.delete(currentPlayerId);
                console.log(`Player ${currentPlayerId} disconnected`);
            }
        });

        function handleMessage(ws, data) {
            switch (data.type) {
                case 'register':
                    currentPlayerId = data.playerId;
                    players.set(data.playerId, {
                        ws: ws,
                        name: data.playerName,
                        roomId: null
                    });
                    console.log(`Player registered: ${data.playerName} (${data.playerId})`);
                    break;

                case 'create_room':
                    {
                        const roomId = data.roomId;
                        if (rooms.has(roomId)) {
                            ws.send(JSON.stringify({
                                type: 'error',
                                message: 'Room already exists'
                            }));
                            return;
                        }

                        rooms.set(roomId, {
                            id: roomId,
                            host: data.playerId,
                            hostName: data.playerName,
                            guest: null,
                            guestName: null,
                            createdAt: Date.now()
                        });

                        const player = players.get(data.playerId);
                        if (player) player.roomId = roomId;

                        ws.send(JSON.stringify({
                            type: 'room_created',
                            roomId: roomId
                        }));

                        console.log(`Room created: ${roomId} by ${data.playerName}`);
                    }
                    break;

                case 'join_room':
                    {
                        const room = rooms.get(data.roomId);
                        if (!room) {
                            ws.send(JSON.stringify({
                                type: 'error',
                                message: 'Room not found'
                            }));
                            return;
                        }

                        if (room.guest) {
                            ws.send(JSON.stringify({
                                type: 'error',
                                message: 'Room full'
                            }));
                            return;
                        }

                        room.guest = data.playerId;
                        room.guestName = data.playerName;

                        const hostPlayer = players.get(room.host);
                        const guestPlayer = players.get(data.playerId);
                        if (guestPlayer) guestPlayer.roomId = data.roomId;

                        // Notify host
                        if (hostPlayer && hostPlayer.ws.readyState === WebSocket.OPEN) {
                            hostPlayer.ws.send(JSON.stringify({
                                type: 'opponent_joined',
                                roomId: room.id,
                                opponentName: data.playerName,
                                opponentId: data.playerId
                            }));
                        }

                        // Notify guest
                        ws.send(JSON.stringify({
                            type: 'room_joined',
                            roomId: room.id,
                            color: 'black',
                            opponentName: room.hostName
                        }));

                        // Notify both game start
                        const startMsg = JSON.stringify({ type: 'game_start', roomId: room.id });
                        if (hostPlayer && hostPlayer.ws.readyState === WebSocket.OPEN) {
                            hostPlayer.ws.send(startMsg);
                        }
                        ws.send(startMsg);

                        console.log(`${data.playerName} joined room ${room.id}`);
                    }
                    break;

                case 'get_rooms':
                    {
                        const available = Array.from(rooms.values())
                            .filter(r => !r.guest)
                            .map(r => ({
                                id: r.id,
                                hostName: r.hostName,
                                players: r.guest ? 2 : 1,
                                createdAt: r.createdAt
                            }));
                        
                        ws.send(JSON.stringify({
                            type: 'room_list',
                            rooms: available
                        }));
                    }
                    break;

                case 'move':
                    {
                        const room = rooms.get(data.roomId);
                        if (!room) return;

                        const opponentId = room.host === data.playerId ? room.guest : room.host;
                        if (!opponentId) return;

                        const opponent = players.get(opponentId);
                        if (opponent && opponent.ws.readyState === WebSocket.OPEN) {
                            opponent.ws.send(JSON.stringify({
                                type: 'move',
                                roomId: data.roomId,
                                move: data.move,
                                playerId: data.playerId
                            }));
                        }
                    }
                    break;

                case 'leave_room':
                    {
                        const room = rooms.get(data.roomId);
                        if (!room) return;

                        const isHost = room.host === data.playerId;
                        
                        if (isHost) {
                            // Host leaves, delete room and notify guest
                            if (room.guest) {
                                const guest = players.get(room.guest);
                                if (guest && guest.ws.readyState === WebSocket.OPEN) {
                                    guest.ws.send(JSON.stringify({
                                        type: 'opponent_left',
                                        roomId: room.id
                                    }));
                                }
                                if (guest) guest.roomId = null;
                            }
                            rooms.delete(room.id);
                            console.log(`Room ${room.id} deleted (host left)`);
                        } else {
                            // Guest leaves
                            const host = players.get(room.host);
                            if (host && host.ws.readyState === WebSocket.OPEN) {
                                host.ws.send(JSON.stringify({
                                    type: 'opponent_left',
                                    roomId: room.id
                                }));
                            }
                            room.guest = null;
                            room.guestName = null;
                        }

                        const player = players.get(data.playerId);
                        if (player) player.roomId = null;
                    }
                    break;
            }
        }
    });

    // Cleanup old rooms every 5 minutes
    setInterval(() => {
        const now = Date.now();
        for (const [id, room] of rooms) {
            if (now - room.createdAt > 30 * 60 * 1000) { // 30 min
                if (!room.guest) {
                    rooms.delete(id);
                    console.log(`Cleaned old room ${id}`);
                }
            }
        }
    }, 5 * 60 * 1000);
}

server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n♟️  Ajedrez 3D Cristalino - Professional Edition`);
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`🌐 Network: http://0.0.0.0:${PORT}`);
    if (wss) {
        console.log(`🔌 WebSocket multiplayer enabled`);
    } else {
        console.log(`⚠️  WebSocket disabled (run: npm install ws)`);
        console.log(`   Multiplayer will use BroadcastChannel (same browser only)`);
    }
    console.log(`\n`);
});
