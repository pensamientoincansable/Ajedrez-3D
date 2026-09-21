import * as THREE from 'three';
import { CameraManager } from './camera-manager.js';
import { ChessBoard } from './chess-board.js';
import { PieceFactory } from './pieces.js';
import { GameLogic } from './game-logic.js';
import { InputController } from './controls.js';
import { OnlineManager } from './online-manager.js';

const ANIMATION_DURATION = 380;

class Game {
    constructor() {
        this.container = document.getElementById('game-container');
        this.state = 'MENU'; // MENU, LOBBY, PLAYING, GAME_OVER
        this.gameMode = null; // 'cpu', 'pvp', 'online'
        this.difficulty = localStorage.getItem('chess3d_difficulty') || 'medium';
        this.playerName = localStorage.getItem('chess3d_playerName') || '';

        this.selectedSquare = null;
        this.piecesMeshes = new Map();
        this.isAnimating = false;
        this.isAiThinking = false;
        this.legalMoveHighlights = [];
        this.myColorOnline = 'white';
        this.moveHistory = [];

        this.initScene();
        this.initLights();
        this.initCamera();
        this.initRenderer();
        this.initGameObjects();
        this.initUI();
        this.initOnline();

        this.animate();
        this.showMainMenu();
    }

    // Scene setup - optimized
    initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a14);
        this.scene.fog = new THREE.Fog(0x0a0a14, 18, 45);

        // Environment map for crystal reflections
        const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256);
        cubeRenderTarget.texture.type = THREE.HalfFloatType;
        this.cubeCamera = new THREE.CubeCamera(0.1, 100, cubeRenderTarget);
        this.scene.add(this.cubeCamera);
        this.envMap = cubeRenderTarget.texture;
    }

    initLights() {
        // Optimized lighting setup
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambient);

        const hemi = new THREE.HemisphereLight(0x88ccff, 0x221100, 0.5);
        hemi.position.set(0, 20, 0);
        this.scene.add(hemi);

        // Main directional - soft shadows
        const mainLight = new THREE.DirectionalLight(0xfff5e6, 1.8);
        mainLight.position.set(8, 18, 6);
        mainLight.castShadow = true;
        mainLight.shadow.mapSize.set(2048, 2048);
        mainLight.shadow.camera.near = 0.5;
        mainLight.shadow.camera.far = 40;
        mainLight.shadow.camera.left = -12;
        mainLight.shadow.camera.right = 12;
        mainLight.shadow.camera.top = 12;
        mainLight.shadow.camera.bottom = -12;
        mainLight.shadow.bias = -0.0003;
        mainLight.shadow.radius = 4;
        this.scene.add(mainLight);
        this.mainLight = mainLight;

        // Fill light - cool tone for crystal
        const fill = new THREE.DirectionalLight(0x77aaff, 0.6);
        fill.position.set(-8, 12, -6);
        this.scene.add(fill);

        // Rim light for crystal edges
        const rim = new THREE.DirectionalLight(0xffaa88, 0.4);
        rim.position.set(0, 5, -10);
        this.scene.add(rim);

        // Point lights for crystal sparkle
        const sparkle1 = new THREE.PointLight(0x88ccff, 0.8, 15);
        sparkle1.position.set(3, 4, 3);
        this.scene.add(sparkle1);

        const sparkle2 = new THREE.PointLight(0xffaa66, 0.6, 12);
        sparkle2.position.set(-3, 3, -3);
        this.scene.add(sparkle2);
    }

    initCamera() {
        this.camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
        this.cameraManager = new CameraManager(this.camera, this.container);
    }

    initRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: 'high-performance',
            stencil: false
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.1;
        this.container.appendChild(this.renderer.domElement);

        // Performance: auto clear
        this.renderer.autoClear = true;
    }

    initGameObjects() {
        this.board = new ChessBoard(this.scene);
        this.pieceFactory = new PieceFactory();
        this.gameLogic = new GameLogic();
        this.gameLogic.setDifficulty(this.difficulty);
        this.inputController = new InputController(this.camera, this.scene, this.container);

        this.inputController.setCallbacks(
            (x, z) => this.onSquareClick(x, z),
            (mesh) => this.onPieceClick(mesh)
        );

        window.addEventListener('resize', () => this.onWindowResize());
    }

    initUI() {
        // Main menu elements
        this.mainMenu = document.getElementById('main-menu');
        this.lobbyMenu = document.getElementById('lobby-menu');
        this.gameUI = document.getElementById('game-ui');

        // Menu buttons - mode cards
        document.querySelectorAll('.mode-card').forEach(card => {
            card.addEventListener('click', () => {
                const mode = card.dataset.mode;
                this.selectMode(mode);
            });
        });

        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const diff = e.currentTarget.dataset.diff;
                this.setDifficulty(diff);
                document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');
            });
        });

        document.getElementById('start-game-btn')?.addEventListener('click', () => this.startGame());

        // Lobby
        document.getElementById('player-name-input')?.addEventListener('input', (e) => {
            this.playerName = e.target.value;
            localStorage.setItem('chess3d_playerName', this.playerName);
        });
        if (this.playerName) {
            const input = document.getElementById('player-name-input');
            if (input) input.value = this.playerName;
        }

        document.getElementById('create-room-btn')?.addEventListener('click', () => this.createOnlineRoom());
        document.getElementById('refresh-rooms-btn')?.addEventListener('click', () => this.refreshRooms());
        document.getElementById('leave-lobby-btn')?.addEventListener('click', () => this.leaveLobby());

        // Game UI
        document.getElementById('back-to-menu-btn')?.addEventListener('click', () => this.backToMenu());
        document.getElementById('reset-game-btn')?.addEventListener('click', () => this.resetGame());
        document.getElementById('close-msg-btn')?.addEventListener('click', () => {
            document.getElementById('message-overlay').classList.add('hidden');
            if (this.state === 'GAME_OVER') this.backToMenu();
        });

        // Set initial difficulty UI
        document.querySelectorAll('.diff-btn').forEach(b => {
            if (b.dataset.diff === this.difficulty) b.classList.add('active');
        });
    }

    initOnline() {
        this.onlineManager = new OnlineManager();
        this.onlineManager.setPlayerName(this.playerName || 'Jugador');

        this.onlineManager.onOpponentJoin((name, color) => {
            this.myColorOnline = color === 'white' ? 'white' : 'black';
            document.getElementById('lobby-status').textContent = `Conectado con ${name} - Eres ${this.myColorOnline === 'white' ? 'Blancas' : 'Negras'}`;
            document.getElementById('lobby-status').className = 'status connected';
            document.getElementById('waiting-overlay').classList.add('hidden');
            
            // Auto start after short delay
            setTimeout(() => {
                this.startOnlineGame();
            }, 1200);
        });

        this.onlineManager.onOpponentLeave(() => {
            if (this.state === 'PLAYING' && this.gameMode === 'online') {
                this.endGame('El oponente ha abandonado la partida. ¡Victoria!');
            } else {
                document.getElementById('lobby-status').textContent = 'Esperando oponente...';
                document.getElementById('lobby-status').className = 'status waiting';
                document.getElementById('waiting-overlay').classList.remove('hidden');
            }
        });

        this.onlineManager.onMove((move, senderId) => {
            if (senderId === this.onlineManager.playerId) return;
            // Opponent move
            this.applyOpponentMove(move);
        });

        this.onlineManager.setTimerCallbacks(
            (timeLeft) => this.updateTimerUI(timeLeft),
            () => this.handleTimeout()
        );

        // Try websocket
        this.onlineManager.connectWebSocket().then(connected => {
            console.log('[Game] WS connection:', connected ? 'OK' : 'fallback to BroadcastChannel');
        });
    }

    // Menu System
    showMainMenu() {
        this.state = 'MENU';
        this.mainMenu.classList.remove('hidden');
        this.lobbyMenu.classList.add('hidden');
        this.gameUI.classList.add('hidden');
        document.getElementById('message-overlay').classList.add('hidden');
        this.onlineManager.leaveRoom();
        this.stopTimer();
    }

    selectMode(mode) {
        document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
        document.querySelector(`[data-mode="${mode}"]`)?.classList.add('selected');
        this.selectedMode = mode;

        const diffSection = document.getElementById('difficulty-section');
        if (mode === 'cpu') {
            diffSection.classList.remove('hidden');
        } else {
            diffSection.classList.add('hidden');
        }

        document.getElementById('start-game-btn').disabled = false;
        document.getElementById('start-game-btn').textContent = mode === 'online' ? 'Ir al Lobby' : 'Jugar Ahora';
    }

    setDifficulty(diff) {
        this.difficulty = diff;
        this.gameLogic.setDifficulty(diff);
        localStorage.setItem('chess3d_difficulty', diff);
    }

    startGame() {
        if (!this.selectedMode) {
            this.showMessage('Selecciona un modo de juego', true);
            return;
        }

        this.gameMode = this.selectedMode;

        if (this.gameMode === 'online') {
            this.showLobby();
        } else {
            this.startLocalGame();
        }
    }

    showLobby() {
        this.state = 'LOBBY';
        this.mainMenu.classList.add('hidden');
        this.lobbyMenu.classList.remove('hidden');
        this.gameUI.classList.add('hidden');

        document.getElementById('player-name-input').value = this.playerName;
        this.onlineManager.setPlayerName(this.playerName || 'Jugador_' + Math.floor(Math.random() * 1000));
        this.refreshRooms();
    }

    async refreshRooms() {
        const listEl = document.getElementById('rooms-list');
        listEl.innerHTML = '<div class="loading">Buscando salas...</div>';

        const rooms = await this.onlineManager.getRoomList();
        
        if (rooms.length === 0) {
            listEl.innerHTML = '<div class="no-rooms">No hay salas disponibles. ¡Crea una!</div>';
        } else {
            listEl.innerHTML = '';
            rooms.forEach(room => {
                const div = document.createElement('div');
                div.className = 'room-item';
                div.innerHTML = `
                    <div class="room-info">
                        <span class="room-id">${room.id}</span>
                        <span class="room-host">${room.hostName || 'Anfitrión'}</span>
                    </div>
                    <button class="btn btn-small join-room-btn" data-room="${room.id}">Unirse</button>
                `;
                listEl.appendChild(div);
            });

            document.querySelectorAll('.join-room-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const roomId = e.currentTarget.dataset.room;
                    this.joinOnlineRoom(roomId);
                });
            });
        }
    }

    createOnlineRoom() {
        if (!this.playerName || this.playerName.trim().length < 2) {
            this.showLobbyMessage('Ingresa un nombre válido (mín 2 caracteres)', 'error');
            return;
        }

        this.onlineManager.setPlayerName(this.playerName);
        const roomId = this.onlineManager.createRoom();
        
        document.getElementById('lobby-status').textContent = `Sala creada: ${roomId} - Esperando oponente...`;
        document.getElementById('lobby-status').className = 'status waiting';
        document.getElementById('waiting-overlay').classList.remove('hidden');
        document.getElementById('current-room-id').textContent = roomId;
        const waitingCodeEl = document.getElementById('waiting-room-code');
        if (waitingCodeEl) waitingCodeEl.textContent = roomId;
        document.getElementById('current-room-display').classList.remove('hidden');

        this.showLobbyMessage(`Sala ${roomId} creada. Comparte el código con tu amigo o espera a que alguien se una.`, 'success');
    }

    joinOnlineRoom(roomId) {
        if (!this.playerName || this.playerName.trim().length < 2) {
            this.showLobbyMessage('Ingresa un nombre válido', 'error');
            return;
        }

        this.onlineManager.setPlayerName(this.playerName);
        this.onlineManager.joinRoom(roomId);
        
        document.getElementById('lobby-status').textContent = `Uniéndose a ${roomId}...`;
        document.getElementById('lobby-status').className = 'status connecting';
        document.getElementById('waiting-overlay').classList.remove('hidden');
        document.getElementById('current-room-id').textContent = roomId;
        const waitingCodeEl2 = document.getElementById('waiting-room-code');
        if (waitingCodeEl2) waitingCodeEl2.textContent = roomId;
        document.getElementById('current-room-display').classList.remove('hidden');
    }

    startOnlineGame() {
        this.gameMode = 'online';
        this.state = 'PLAYING';
        this.mainMenu.classList.add('hidden');
        this.lobbyMenu.classList.add('hidden');
        this.gameUI.classList.remove('hidden');

        this.myColorOnline = this.onlineManager.myColor || 'white';
        this.initGameBoard();

        document.getElementById('game-mode-display').textContent = `Online - ${this.myColorOnline === 'white' ? 'Blancas' : 'Negras'}`;
        document.getElementById('opponent-display').textContent = this.onlineManager.opponentName || 'Oponente';
        document.getElementById('opponent-panel').classList.remove('hidden');
        document.getElementById('timer-panel').classList.remove('hidden');

        this.updateTurnUI();
        this.checkIfMyTurnOnline();
    }

    startLocalGame() {
        this.state = 'PLAYING';
        this.mainMenu.classList.add('hidden');
        this.lobbyMenu.classList.add('hidden');
        this.gameUI.classList.remove('hidden');

        this.initGameBoard();

        const modeText = this.gameMode === 'cpu' ? `VS CPU (${this.difficulty})` : '2 Jugadores Local';
        document.getElementById('game-mode-display').textContent = modeText;
        document.getElementById('opponent-panel').classList.add('hidden');
        document.getElementById('timer-panel').classList.add('hidden');

        // If CPU mode and player is black? No, player always white vs CPU
        if (this.gameMode === 'cpu' && this.gameLogic.turn === 'black') {
            setTimeout(() => this.triggerAiMove(), 600);
        }
    }

    initGameBoard() {
        // Clear previous
        for (const [key, mesh] of this.piecesMeshes) {
            this.scene.remove(mesh);
            this.disposeMesh(mesh);
        }
        this.piecesMeshes.clear();
        this.clearLegalMoveHighlights();
        this.board.clearCheckHighlight();
        this.board.highlightSquare(-1, -1);
        this.selectedSquare = null;
        this.moveHistory = [];
        this.isAnimating = false;
        this.isAiThinking = false;

        this.gameLogic.reset();
        this.gameLogic.setDifficulty(this.difficulty);

        // Create pieces
        for (let z = 0; z < 8; z++) {
            for (let x = 0; x < 8; x++) {
                const piece = this.gameLogic.getPieceAt(x, z);
                if (piece) {
                    this.createPieceMesh(piece.type, piece.color, x, z);
                }
            }
        }

        this.updateTurnUI();
        document.getElementById('message-overlay').classList.add('hidden');
        this.updateEnvMap();
    }

    updateEnvMap() {
        // Update cube camera for crystal reflections
        if (this.cubeCamera) {
            this.cubeCamera.position.set(0, 3, 0);
            this.cubeCamera.update(this.renderer, this.scene);
        }
    }

    createPieceMesh(type, color, x, z) {
        const mesh = this.pieceFactory.createPiece(type, color);
        if (!mesh) return;

        // Assign envMap to crystal materials
        mesh.traverse(child => {
            if (child.isMesh && child.material && child.material.envMap !== undefined) {
                child.material.envMap = this.envMap;
                child.material.needsUpdate = true;
            }
        });

        this.placePiece(mesh, x, z);
        this.scene.add(mesh);
        mesh.userData.logicX = x;
        mesh.userData.logicZ = z;
        this.piecesMeshes.set(`${x},${z}`, mesh);
    }

    placePiece(mesh, x, z) {
        mesh.position.set((x - 3.5), 0, (z - 3.5));
    }

    disposeMesh(mesh) {
        mesh.traverse(child => {
            if (child.geometry) child.geometry.dispose();
            // Don't dispose materials as they are shared/cached
        });
    }

    // Interaction
    onSquareClick(x, z) {
        this.handleInteraction(x, z);
    }

    onPieceClick(mesh) {
        this.handleInteraction(mesh.userData.logicX, mesh.userData.logicZ);
    }

    handleInteraction(x, z) {
        if (this.state !== 'PLAYING') return;
        if (this.isAnimating || this.isAiThinking) return;

        // Online mode - only allow moves on your turn and your color
        if (this.gameMode === 'online') {
            const piece = this.gameLogic.getPieceAt(x, z);
            const isMyTurn = this.gameLogic.turn === this.myColorOnline;
            
            if (this.selectedSquare) {
                // Trying to move
                if (!isMyTurn) return;
            } else {
                // Trying to select - must be own color and own turn
                if (!isMyTurn) {
                    this.showMessage('No es tu turno', true, 1500);
                    return;
                }
                if (piece && piece.color !== this.myColorOnline) return;
            }
        }

        // CPU mode - only white can move
        if (this.gameMode === 'cpu' && this.gameLogic.turn !== 'white') return;

        if (this.selectedSquare) {
            const fromX = this.selectedSquare.x;
            const fromZ = this.selectedSquare.z;

            if (fromX === x && fromZ === z) {
                this.deselect();
                return;
            }

            const result = this.gameLogic.move(fromX, fromZ, x, z);
            if (result.success) {
                this.clearLegalMoveHighlights();
                this.deselect();

                this.animateMove(fromX, fromZ, x, z, result, () => {
                    this.afterMove(result, { fromX, fromZ, toX: x, toZ: z });
                });
            } else {
                // Invalid, try select new
                this.selectSquare(x, z);
            }
        } else {
            this.selectSquare(x, z);
        }
    }

    selectSquare(x, z) {
        const piece = this.gameLogic.getPieceAt(x, z);
        if (!piece) {
            this.deselect();
            return;
        }

        // Check turn
        if (piece.color !== this.gameLogic.turn) {
            this.deselect();
            return;
        }

        // Online check
        if (this.gameMode === 'online' && piece.color !== this.myColorOnline) {
            return;
        }

        this.selectedSquare = { x, z };
        this.board.highlightSquare(x, z, piece.color === 'white' ? 0x88ccff : 0xffaa66);

        this.clearLegalMoveHighlights();
        const moves = this.gameLogic.getAllLegalMoves(piece.color);
        const valid = moves.filter(m => m.from.x === x && m.from.z === z);
        valid.forEach(m => this.addLegalMoveHighlight(m.to.x, m.to.z, !!this.gameLogic.getPieceAt(m.to.x, m.to.z)));
    }

    deselect() {
        this.selectedSquare = null;
        this.board.highlightSquare(-1, -1);
        this.clearLegalMoveHighlights();
    }

    addLegalMoveHighlight(x, z, isCapture = false) {
        const geo = isCapture
            ? new THREE.RingGeometry(0.22, 0.42, 16)
            : new THREE.CircleGeometry(0.14, 16);

        const mat = new THREE.MeshBasicMaterial({
            color: isCapture ? 0xff4444 : 0x44ff88,
            transparent: true,
            opacity: isCapture ? 0.7 : 0.5,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set((x - 3.5), this.board.boardHeight / 2 + 0.02, (z - 3.5));
        mesh.rotation.x = -Math.PI / 2;
        mesh.renderOrder = 8;
        this.board.group.add(mesh);
        this.legalMoveHighlights.push(mesh);
    }

    clearLegalMoveHighlights() {
        this.legalMoveHighlights.forEach(m => {
            this.board.group.remove(m);
            m.geometry.dispose();
            m.material.dispose();
        });
        this.legalMoveHighlights = [];
    }

    animateMove(fromX, fromZ, toX, toZ, moveResult, callback) {
        if (this.isAnimating) {
            if (callback) callback();
            return;
        }

        this.isAnimating = true;
        const keyFrom = `${fromX},${fromZ}`;
        const keyTo = `${toX},${toZ}`;
        const mesh = this.piecesMeshes.get(keyFrom);

        if (!mesh) {
            this.isAnimating = false;
            if (callback) callback();
            return;
        }

        const start = mesh.position.clone();
        const end = new THREE.Vector3((toX - 3.5), 0, (toZ - 3.5));

        const capturedMesh = this.piecesMeshes.get(keyTo);
        const hasCapture = !!capturedMesh || moveResult.enPassantCapture;

        const finish = () => {
            // Handle en passant visual removal
            if (moveResult.enPassantCapture) {
                const capZ = moveResult.piece?.color === 'white' || this.gameLogic.turn === 'black' ? toZ - 1 : toZ + 1;
                // Actually en passant captured pawn is behind
                const epZ = this.gameLogic.turn === 'white' ? toZ - 1 : toZ + 1; // After toggle, turn is opponent, so inverse
                // Find pawn to remove - it's at toX, fromZ
                const epKey = `${toX},${fromZ}`;
                const epMesh = this.piecesMeshes.get(epKey);
                if (epMesh) {
                    this.scene.remove(epMesh);
                    this.disposeMesh(epMesh);
                    this.piecesMeshes.delete(epKey);
                }
            }

            // Handle castling rook movement
            if (moveResult.castling) {
                const rank = fromZ;
                let rookFromX, rookToX;
                if (moveResult.castling === 'kingSide') {
                    rookFromX = 7; rookToX = 5;
                } else {
                    rookFromX = 0; rookToX = 3;
                }
                const rookKeyFrom = `${rookFromX},${rank}`;
                const rookKeyTo = `${rookToX},${rank}`;
                const rookMesh = this.piecesMeshes.get(rookKeyFrom);
                if (rookMesh) {
                    rookMesh.position.set((rookToX - 3.5), 0, (rank - 3.5));
                    rookMesh.userData.logicX = rookToX;
                    this.piecesMeshes.delete(rookKeyFrom);
                    this.piecesMeshes.set(rookKeyTo, rookMesh);
                }
            }

            // Handle promotion - replace pawn mesh with queen
            if (moveResult.promotion) {
                this.scene.remove(mesh);
                this.disposeMesh(mesh);
                this.piecesMeshes.delete(keyFrom);
                
                const color = this.gameLogic.getPieceAt(toX, toZ)?.color || (this.gameLogic.turn === 'white' ? 'black' : 'white');
                this.createPieceMesh('queen', color, toX, toZ);
            } else {
                mesh.userData.logicX = toX;
                mesh.userData.logicZ = toZ;
                this.piecesMeshes.delete(keyFrom);
                this.piecesMeshes.set(keyTo, mesh);
            }

            this.isAnimating = false;
            if (callback) callback();
        };

        if (hasCapture && capturedMesh) {
            this.animateCapture(capturedMesh, () => {
                this.animateArc(mesh, start, end, finish);
            });
        } else {
            this.animateArc(mesh, start, end, finish);
        }
    }

    animateArc(mesh, start, end, onComplete) {
        const duration = ANIMATION_DURATION;
        const startTime = performance.now();

        const animate = (now) => {
            const elapsed = now - startTime;
            const t = Math.min(elapsed / duration, 1);
            // Ease out cubic + slight overshoot for professional feel
            const eased = t < 0.8 ? 1 - Math.pow(1 - t * 1.25, 3) : 1;
            const arc = Math.sin(t * Math.PI) * 0.7;

            mesh.position.x = start.x + (end.x - start.x) * eased;
            mesh.position.z = start.z + (end.z - start.z) * eased;
            mesh.position.y = arc + (t > 0.9 ? 0 : 0);

            // Subtle rotation for elegance
            mesh.rotation.y = (1 - eased) * 0.15 * Math.sin(t * Math.PI * 2);

            if (t < 1) {
                requestAnimationFrame(animate);
            } else {
                mesh.position.copy(end);
                mesh.rotation.y = 0;
                mesh.position.y = 0;
                if (onComplete) onComplete();
            }
        };
        requestAnimationFrame(animate);
    }

    animateCapture(mesh, onComplete) {
        const start = mesh.position.clone();
        const duration = 320;
        const startTime = performance.now();

        // Remove from map immediately
        for (const [key, m] of this.piecesMeshes) {
            if (m === mesh) {
                this.piecesMeshes.delete(key);
                break;
            }
        }

        const animate = (now) => {
            const elapsed = now - startTime;
            const t = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3);

            mesh.position.y = start.y + eased * 3.5;
            mesh.rotation.x = t * Math.PI * 1.5;
            mesh.rotation.z = t * Math.PI;
            mesh.scale.setScalar(1 - t * 0.5);
            mesh.traverse(child => {
                if (child.material) {
                    child.material.transparent = true;
                    child.material.opacity = 1 - t;
                }
            });

            if (t < 1) {
                requestAnimationFrame(animate);
            } else {
                this.scene.remove(mesh);
                this.disposeMesh(mesh);
                if (onComplete) onComplete();
            }
        };
        requestAnimationFrame(animate);
    }

    afterMove(moveResult, coords) {
        this.moveHistory.push({
            ...coords,
            piece: this.gameLogic.history[this.gameLogic.history.length - 1]
        });

        // Highlight last move
        this.board.highlightLastMove(
            { x: coords.fromX, z: coords.fromZ },
            { x: coords.toX, z: coords.toZ }
        );

        this.updateTurnUI();
        this.checkGameEnd();

        // Online: send move
        if (this.gameMode === 'online' && this.state === 'PLAYING') {
            this.onlineManager.sendMove({
                from: { x: coords.fromX, z: coords.fromZ },
                to: { x: coords.toX, z: coords.toZ },
                promotion: moveResult.promotion,
                castling: moveResult.castling
            });
            this.checkIfMyTurnOnline();
        }

        // CPU move
        if (this.gameMode === 'cpu' && this.state === 'PLAYING' && this.gameLogic.turn === 'black') {
            setTimeout(() => this.triggerAiMove(), 500);
        }

        // Update env map occasionally for crystal reflections
        if (this.moveHistory.length % 3 === 0) {
            setTimeout(() => this.updateEnvMap(), 100);
        }
    }

    triggerAiMove() {
        if (this.isAiThinking || this.isAnimating) return;
        if (this.gameLogic.turn !== 'black') return;
        if (this.state !== 'PLAYING') return;

        this.isAiThinking = true;
        document.getElementById('turn-indicator').textContent = 'CPU pensando...';
        document.getElementById('turn-indicator').className = 'panel thinking';

        // Difficulty based delay for realism
        const delays = { easy: 400, medium: 800, hard: 1200 };
        const delay = delays[this.difficulty] || 800;

        setTimeout(() => {
            const move = this.gameLogic.makeBestMove('black');
            if (!move) {
                this.isAiThinking = false;
                this.checkGameEnd();
                return;
            }

            const result = this.gameLogic.move(move.from.x, move.from.z, move.to.x, move.to.z);
            if (result.success) {
                this.animateMove(move.from.x, move.from.z, move.to.x, move.to.z, result, () => {
                    this.afterMove(result, {
                        fromX: move.from.x,
                        fromZ: move.from.z,
                        toX: move.to.x,
                        toZ: move.to.z
                    });
                    this.isAiThinking = false;
                });
            } else {
                this.isAiThinking = false;
            }
        }, delay);
    }

    applyOpponentMove(move) {
        if (this.isAnimating) {
            setTimeout(() => this.applyOpponentMove(move), 100);
            return;
        }

        const result = this.gameLogic.move(move.from.x, move.from.z, move.to.x, move.to.z);
        if (result.success) {
            this.animateMove(move.from.x, move.from.z, move.to.x, move.to.z, result, () => {
                this.afterMove(result, {
                    fromX: move.from.x,
                    fromZ: move.from.z,
                    toX: move.to.x,
                    toZ: move.to.z
                });
            });
        }
    }

    // Timer for online
    checkIfMyTurnOnline() {
        if (this.gameMode !== 'online') return;

        const isMyTurn = this.gameLogic.turn === this.myColorOnline;
        if (isMyTurn) {
            this.onlineManager.startTimer(true);
            document.getElementById('timer-panel').classList.add('my-turn');
        } else {
            this.onlineManager.stopTimer();
            document.getElementById('timer-panel').classList.remove('my-turn');
            document.getElementById('timer-display').textContent = '20s';
        }
    }

    updateTimerUI(timeLeft) {
        const el = document.getElementById('timer-display');
        if (el) {
            el.textContent = `${timeLeft}s`;
            el.className = timeLeft <= 5 ? 'timer-warning' : timeLeft <= 10 ? 'timer-caution' : '';
        }
        const progress = document.getElementById('timer-progress');
        if (progress) {
            const pct = (timeLeft / 20) * 100;
            progress.style.width = `${pct}%`;
            if (timeLeft <= 5) {
                progress.style.background = 'linear-gradient(90deg, #d63031, #e17055)';
            } else if (timeLeft <= 10) {
                progress.style.background = 'linear-gradient(90deg, #fdcb6e, #e17055)';
            } else {
                progress.style.background = 'linear-gradient(90deg, #00b894, #00cec9)';
            }
        }
    }

    handleTimeout() {
        if (this.gameMode !== 'online') return;
        
        const isMyTurn = this.gameLogic.turn === this.myColorOnline;
        if (isMyTurn) {
            this.endGame('¡Tiempo agotado! Has perdido por tiempo.');
            this.onlineManager.leaveRoom();
        }
    }

    stopTimer() {
        this.onlineManager.stopTimer();
    }

    // Game state
    updateTurnUI() {
        const indicator = document.getElementById('turn-indicator');
        if (!indicator) return;

        const turn = this.gameLogic.turn;
        const isCheck = this.gameLogic.isInCheck(turn);

        let text = `Turno: ${turn === 'white' ? 'Blancas' : 'Negras'}`;
        if (isCheck) {
            text += ' ¡Jaque!';
            indicator.className = 'panel check';
            const kingPos = this.gameLogic._findKing(turn);
            if (kingPos) this.board.highlightCheck(kingPos);
        } else {
            indicator.className = 'panel';
            this.board.clearCheckHighlight();
        }

        if (this.gameMode === 'online') {
            const myTurn = turn === this.myColorOnline;
            text = myTurn ? '¡Tu turno!' : `Turno de ${this.onlineManager.opponentName || 'Oponente'}`;
            if (isCheck) text += ' ¡Jaque!';
            indicator.className = myTurn ? 'panel my-turn' : 'panel opponent-turn';
            if (isCheck) indicator.classList.add('check');
        }

        indicator.textContent = text;

        // Update mode display
        const modeEl = document.getElementById('game-mode-display');
        if (modeEl && this.gameMode !== 'online') {
            const modeText = this.gameMode === 'cpu' ? `VS CPU (${this.difficulty})` : '2 Jugadores';
            modeEl.textContent = modeText;
        }
    }

    checkGameEnd() {
        const turn = this.gameLogic.turn;
        
        if (this.gameLogic.isCheckmate(turn)) {
            const winner = turn === 'white' ? 'Negras' : 'Blancas';
            let message = `¡Jaque Mate! ¡Ganan las ${winner}!`;
            
            if (this.gameMode === 'online') {
                const iWon = (winner === 'Blancas' && this.myColorOnline === 'white') ||
                            (winner === 'Negras' && this.myColorOnline === 'black');
                message = iWon ? '¡Jaque Mate! ¡Has ganado!' : '¡Jaque Mate! Has perdido.';
            } else if (this.gameMode === 'cpu') {
                message = winner === 'Blancas' ? '¡Jaque Mate! ¡Has ganado!' : '¡Jaque Mate! La CPU gana.';
            }
            
            this.endGame(message);
        } else if (this.gameLogic.isStalemate(turn)) {
            this.endGame('¡Tablas por ahogado! Empate.');
        } else if (this.gameLogic.getAllLegalMoves(turn).length === 0) {
            // Fallback
            this.endGame('¡Tablas! Sin movimientos legales.');
        }
    }

    endGame(message) {
        this.state = 'GAME_OVER';
        this.isAiThinking = false;
        this.isAnimating = false;
        this.stopTimer();

        document.getElementById('game-message').textContent = message;
        document.getElementById('message-overlay').classList.remove('hidden');
        document.getElementById('turn-indicator').textContent = 'Partida Finalizada';
        document.getElementById('turn-indicator').className = 'panel game-over';
    }

    resetGame() {
        if (this.gameMode === 'online') {
            // Don't reset in online, leave room first
            this.showMessage('En modo online no puedes reiniciar. Abandona la sala.', true);
            return;
        }
        this.initGameBoard();
        if (this.gameMode === 'cpu' && this.gameLogic.turn === 'black') {
            setTimeout(() => this.triggerAiMove(), 600);
        }
    }

    backToMenu() {
        this.showMainMenu();
    }

    leaveLobby() {
        this.onlineManager.leaveRoom();
        this.showMainMenu();
    }

    showMessage(text, isError = false, duration = 3000) {
        const overlay = document.getElementById('message-overlay');
        const msgEl = document.getElementById('game-message');
        msgEl.textContent = text;
        overlay.classList.remove('hidden');
        if (isError) msgEl.className = 'error';
        else msgEl.className = '';

        if (duration) {
            setTimeout(() => {
                if (this.state !== 'GAME_OVER') overlay.classList.add('hidden');
            }, duration);
        }
    }

    showLobbyMessage(text, type = 'info') {
        const el = document.getElementById('lobby-message');
        if (!el) return;
        el.textContent = text;
        el.className = `lobby-message ${type}`;
        el.classList.remove('hidden');
        setTimeout(() => el.classList.add('hidden'), 4000);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const time = performance.now();
        this.cameraManager.update();
        this.board.animate(time);
        this.renderer.render(this.scene, this.camera);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new Game();
});
