/**
 * Online Multiplayer Manager
 * Supports:
 * - BroadcastChannel for local tabs (same browser, no server)
 * - WebSocket for real server multiplayer
 * Handles lobby, matchmaking, 20s timer per move
 */

export class OnlineManager {
    constructor() {
        this.mode = null; // 'broadcast' | 'websocket'
        this.channel = null;
        this.ws = null;
        this.roomId = null;
        this.playerId = 'player_' + Math.random().toString(36).substr(2, 9);
        this.playerName = localStorage.getItem('chess3d_playerName') || 'Jugador';
        this.isHost = false;
        this.myColor = null;
        this.opponentName = null;
        this.connected = false;
        this.onMoveCallback = null;
        this.onOpponentJoinCallback = null;
        this.onOpponentLeaveCallback = null;
        this.onGameStartCallback = null;
        this.onRoomListCallback = null;

        // Timer
        this.moveTimer = null;
        this.timeLeft = 20;
        this.onTimerTick = null;
        this.onTimeOut = null;

        this.rooms = new Map(); // For broadcast mode, track rooms
        this._initBroadcast();
    }

    _initBroadcast() {
        try {
            this.broadcastChannel = new BroadcastChannel('chess3d_lobby');
            this.broadcastChannel.onmessage = (e) => this._handleBroadcastMessage(e.data);
            this.mode = 'broadcast';
            console.log('[Online] BroadcastChannel initialized');
        } catch (err) {
            console.warn('[Online] BroadcastChannel not supported', err);
        }
    }

    // Try WebSocket connection
    async connectWebSocket(serverUrl = null) {
        // Auto-detect server URL
        if (!serverUrl) {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.host;
            serverUrl = `${protocol}//${host}`;
        }

        return new Promise((resolve) => {
            try {
                const ws = new WebSocket(serverUrl);
                let resolved = false;

                const timeout = setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        ws.close();
                        resolve(false);
                    }
                }, 2000);

                ws.onopen = () => {
                    if (resolved) return;
                    clearTimeout(timeout);
                    resolved = true;
                    this.ws = ws;
                    this.mode = 'websocket';
                    this._setupWebSocket();
                    console.log('[Online] WebSocket connected to', serverUrl);
                    resolve(true);
                };

                ws.onerror = () => {
                    if (resolved) return;
                    clearTimeout(timeout);
                    resolved = true;
                    resolve(false);
                };

                ws.onclose = () => {
                    if (!resolved) {
                        clearTimeout(timeout);
                        resolved = true;
                        resolve(false);
                    }
                };
            } catch (e) {
                resolve(false);
            }
        });
    }

    _setupWebSocket() {
        if (!this.ws) return;

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this._handleWebSocketMessage(data);
            } catch (e) {
                console.error('[Online] WS parse error', e);
            }
        };

        this.ws.onclose = () => {
            this.connected = false;
            this.mode = 'broadcast';
            console.log('[Online] WS disconnected, falling back to broadcast');
        };

        // Register player
        this.ws.send(JSON.stringify({
            type: 'register',
            playerId: this.playerId,
            playerName: this.playerName
        }));
    }

    _handleWebSocketMessage(data) {
        switch (data.type) {
            case 'room_list':
                if (this.onRoomListCallback) this.onRoomListCallback(data.rooms);
                break;
            case 'room_created':
                this.roomId = data.roomId;
                this.isHost = true;
                this.myColor = 'white';
                this.connected = true;
                break;
            case 'room_joined':
                this.roomId = data.roomId;
                this.isHost = false;
                this.myColor = data.color || 'black';
                this.opponentName = data.opponentName;
                this.connected = true;
                if (this.onOpponentJoinCallback) this.onOpponentJoinCallback(data.opponentName, this.myColor);
                break;
            case 'opponent_joined':
                this.opponentName = data.opponentName;
                this.connected = true;
                if (this.onOpponentJoinCallback) this.onOpponentJoinCallback(data.opponentName, this.myColor);
                if (this.onGameStartCallback) this.onGameStartCallback();
                break;
            case 'game_start':
                if (this.onGameStartCallback) this.onGameStartCallback();
                break;
            case 'move':
                if (this.onMoveCallback) this.onMoveCallback(data.move, data.playerId);
                this.resetTimer();
                break;
            case 'opponent_left':
                if (this.onOpponentLeaveCallback) this.onOpponentLeaveCallback();
                break;
            case 'error':
                console.error('[Online] Server error:', data.message);
                break;
        }
    }

    _handleBroadcastMessage(data) {
        if (!data || data.senderId === this.playerId) return;

        switch (data.type) {
            case 'room_list_request':
                // If we are host of a room, respond
                if (this.roomId && this.isHost) {
                    this.broadcastChannel.postMessage({
                        type: 'room_list_response',
                        room: {
                            id: this.roomId,
                            hostName: this.playerName,
                            players: 1,
                            senderId: this.playerId
                        },
                        senderId: this.playerId
                    });
                }
                break;

            case 'room_list_response':
                if (this._roomListCollector) {
                    this._roomListCollector.push(data.room);
                }
                break;

            case 'create_room':
                // Another player created room, track it
                this.rooms.set(data.roomId, {
                    id: data.roomId,
                    hostName: data.playerName,
                    hostId: data.senderId,
                    players: 1
                });
                break;

            case 'join_room_request':
                if (data.roomId === this.roomId && this.isHost && !this.connected) {
                    // Accept join
                    this.opponentName = data.playerName;
                    this.connected = true;
                    this.broadcastChannel.postMessage({
                        type: 'join_room_accept',
                        roomId: data.roomId,
                        hostId: this.playerId,
                        joinerId: data.senderId,
                        hostName: this.playerName,
                        joinerName: data.playerName,
                        senderId: this.playerId
                    });
                    if (this.onOpponentJoinCallback) {
                        this.onOpponentJoinCallback(data.playerName, this.myColor);
                    }
                    if (this.onGameStartCallback) this.onGameStartCallback();
                }
                break;

            case 'join_room_accept':
                if (data.joinerId === this.playerId) {
                    this.roomId = data.roomId;
                    this.isHost = false;
                    this.myColor = 'black';
                    this.opponentName = data.hostName;
                    this.connected = true;
                    if (this.onOpponentJoinCallback) {
                        this.onOpponentJoinCallback(data.hostName, this.myColor);
                    }
                    if (this.onGameStartCallback) this.onGameStartCallback();
                }
                break;

            case 'move':
                if (data.roomId === this.roomId) {
                    if (this.onMoveCallback) this.onMoveCallback(data.move, data.senderId);
                    this.resetTimer();
                }
                break;

            case 'leave_room':
                if (data.roomId === this.roomId) {
                    this.connected = false;
                    this.opponentName = null;
                    if (this.onOpponentLeaveCallback) this.onOpponentLeaveCallback();
                }
                break;
        }
    }

    // Public API
    setPlayerName(name) {
        this.playerName = name;
        localStorage.setItem('chess3d_playerName', name);
    }

    async getRoomList() {
        if (this.mode === 'websocket' && this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'get_rooms' }));
            return new Promise(resolve => {
                const prev = this.onRoomListCallback;
                this.onRoomListCallback = (rooms) => {
                    this.onRoomListCallback = prev;
                    resolve(rooms);
                };
                setTimeout(() => resolve([]), 1500);
            });
        } else {
            // Broadcast mode - request room list
            this._roomListCollector = [];
            this.broadcastChannel.postMessage({
                type: 'room_list_request',
                senderId: this.playerId
            });

            return new Promise(resolve => {
                setTimeout(() => {
                    const list = [...this.rooms.values()].concat(this._roomListCollector);
                    // Deduplicate
                    const unique = Array.from(new Map(list.map(r => [r.id, r])).values());
                    this._roomListCollector = null;
                    resolve(unique.filter(r => r.players < 2));
                }, 800);
            });
        }
    }

    createRoom() {
        this.roomId = 'room_' + Math.random().toString(36).substr(2, 6).toUpperCase();
        this.isHost = true;
        this.myColor = 'white';
        this.connected = false;

        if (this.mode === 'websocket' && this.ws) {
            this.ws.send(JSON.stringify({
                type: 'create_room',
                roomId: this.roomId,
                playerId: this.playerId,
                playerName: this.playerName
            }));
        } else {
            this.rooms.set(this.roomId, {
                id: this.roomId,
                hostName: this.playerName,
                hostId: this.playerId,
                players: 1
            });
            this.broadcastChannel.postMessage({
                type: 'create_room',
                roomId: this.roomId,
                playerName: this.playerName,
                senderId: this.playerId
            });
        }

        return this.roomId;
    }

    joinRoom(roomId) {
        if (this.mode === 'websocket' && this.ws) {
            this.ws.send(JSON.stringify({
                type: 'join_room',
                roomId: roomId,
                playerId: this.playerId,
                playerName: this.playerName
            }));
        } else {
            this.broadcastChannel.postMessage({
                type: 'join_room_request',
                roomId: roomId,
                playerName: this.playerName,
                senderId: this.playerId
            });
        }
        // Optimistically set
        this.roomId = roomId;
    }

    sendMove(move) {
        if (!this.roomId) return;

        if (this.mode === 'websocket' && this.ws) {
            this.ws.send(JSON.stringify({
                type: 'move',
                roomId: this.roomId,
                move: move,
                playerId: this.playerId
            }));
        } else {
            this.broadcastChannel.postMessage({
                type: 'move',
                roomId: this.roomId,
                move: move,
                playerId: this.playerId,
                senderId: this.playerId
            });
        }
        this.resetTimer();
    }

    leaveRoom() {
        if (!this.roomId) return;

        if (this.mode === 'websocket' && this.ws) {
            this.ws.send(JSON.stringify({
                type: 'leave_room',
                roomId: this.roomId,
                playerId: this.playerId
            }));
        } else {
            this.broadcastChannel.postMessage({
                type: 'leave_room',
                roomId: this.roomId,
                senderId: this.playerId
            });
            this.rooms.delete(this.roomId);
        }

        this.roomId = null;
        this.connected = false;
        this.isHost = false;
        this.myColor = null;
        this.opponentName = null;
        this.stopTimer();
    }

    // Timer management - 20 seconds per move
    startTimer(isMyTurn) {
        this.stopTimer();
        if (!isMyTurn) return;

        this.timeLeft = 20;
        if (this.onTimerTick) this.onTimerTick(this.timeLeft);

        this.moveTimer = setInterval(() => {
            this.timeLeft--;
            if (this.onTimerTick) this.onTimerTick(this.timeLeft);

            if (this.timeLeft <= 0) {
                this.stopTimer();
                if (this.onTimeOut) this.onTimeOut();
            }
        }, 1000);
    }

    resetTimer() {
        this.stopTimer();
        this.timeLeft = 20;
    }

    stopTimer() {
        if (this.moveTimer) {
            clearInterval(this.moveTimer);
            this.moveTimer = null;
        }
    }

    onMove(callback) {
        this.onMoveCallback = callback;
    }

    onOpponentJoin(callback) {
        this.onOpponentJoinCallback = callback;
    }

    onOpponentLeave(callback) {
        this.onOpponentLeaveCallback = callback;
    }

    onGameStart(callback) {
        this.onGameStartCallback = callback;
    }

    onRoomList(callback) {
        this.onRoomListCallback = callback;
    }

    setTimerCallbacks(onTick, onTimeout) {
        this.onTimerTick = onTick;
        this.onTimeOut = onTimeout;
    }
}
