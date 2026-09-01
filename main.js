import * as THREE from 'three';
import { CameraManager } from './camera-manager.js';
import { ChessBoard } from './chess-board.js';
import { PieceFactory } from './pieces.js';
import { GameLogic } from './game-logic.js';
import { InputController } from './controls.js';

const ANIMATION_LIFETIME = 350; // ms for piece movement animation

class Game {
    constructor() {
        this.container = document.getElementById('game-container');

        this.initScene();
        this.initLights();
        this.initCamera();
        this.initRenderer();

        this.board = new ChessBoard(this.scene);
        this.pieceFactory = new PieceFactory();
        this.gameLogic = new GameLogic();
        this.inputController = new InputController(this.camera, this.scene, this.container);

        this.selectedSquare = null;
        this.piecesMeshes = new Map();
        this.isAnimating = false;
        this.gameMode = localStorage.getItem('chess3d_mode') || 'pvp';
        this.isAiThinking = false;
        this.aiDifficulty = localStorage.getItem('chess3d_difficulty') || 'medium';
        this.legalMoveHighlights = [];
        this.currentAnimations = [];

        this.initGame();

        this.addEventListeners();
        this.animate();
    }

    setGameMode(mode) {
        this.gameMode = mode;
        this.gameLogic.reset();
    }

    setAiDifficulty(level) {
        this.aiDifficulty = level;
        this.gameLogic.setDifficulty(level);
        localStorage.setItem('chess3d_difficulty', level);
    }

    initGame() {
        // Cancel any ongoing animations
        this.cancelAnimations();

        // Remove all existing pieces from scene
        for (const [key, mesh] of this.piecesMeshes) {
            this.scene.remove(mesh);
        }
        this.piecesMeshes.clear();

        // Clear legal move highlights
        this.clearLegalMoveHighlights();

        // Create pieces from logic
        for (let z = 0; z < 8; z++) {
            for (let x = 0; x < 8; x++) {
                const piece = this.gameLogic.getPieceAt(x, z);
                if (piece) {
                    this.createPieceMesh(piece.type, piece.color, x, z);
                }
            }
        }

        this.inputController.setCallbacks(
            (x, z) => this.onSquareClick(x, z),
            (mesh) => this.onPieceClick(mesh)
        );

        this.updateTurnUI();
        this.updateDifficultyUI();
    }

    createPieceMesh(type, color, x, z) {
        const mesh = this.pieceFactory.createPiece(type, color);
        if (!mesh) return;

        this.placePiece(mesh, x, z);
        this.scene.add(mesh);

        mesh.userData.logicX = x;
        mesh.userData.logicZ = z;
        this.piecesMeshes.set(`${x},${z}`, mesh);
    }

    placePiece(mesh, x, z) {
        const worldX = (x - 3.5);
        const worldZ = (z - 3.5);
        mesh.position.set(worldX, 0, worldZ);
    }

    cancelAnimations() {
        this.isAnimating = false;
        this.currentAnimations = [];
    }

    /**
     * Animate a piece moving from (fromX,fromZ) to (toX,toZ).
     * If there's a capture, first animate the captured piece flying away,
     * then animate the attacker moving through an arc.
     */
    animateMove(fromX, fromZ, toX, toZ, callback) {
        if (this.isAnimating) return;

        this.isAnimating = true;
        this.cancelAnimations();

        const keyFrom = `${fromX},${fromZ}`;
        const keyTo = `${toX},${toZ}`;

        const mesh = this.piecesMeshes.get(keyFrom);
        if (!mesh) {
            this.isAnimating = false;
            if (callback) callback();
            return;
        }

        const startPos = mesh.position.clone();
        const endPos = new THREE.Vector3(
            (toX - 3.5),
            0,
            (toZ - 3.5)
        );

        const hasCapture = this.piecesMeshes.has(keyTo);

        if (hasCapture) {
            const capturedMesh = this.piecesMeshes.get(keyTo);
            // Remove from scene immediately but keep reference for animation
            this.scene.remove(capturedMesh);
            this.piecesMeshes.delete(keyTo);

            const capturedStart = capturedMesh.position.clone();
            const capturedEnd = new THREE.Vector3(capturedStart.x, 3.0, capturedStart.z);

            this.playCaptureAnimation(capturedMesh, capturedStart, capturedEnd, () => {
                // After capture animation, move the attacker
                this.playMoveArcAnimation(mesh, startPos, endPos, () => {
                    this.finalizeMove(keyFrom, keyTo, mesh);
                    this.isAnimating = false;
                    if (callback) callback();
                });
            });
        } else {
            this.playMoveArcAnimation(mesh, startPos, endPos, () => {
                this.finalizeMove(keyFrom, keyTo, mesh);
                this.isAnimating = false;
                if (callback) callback();
            });
        }
    }

    playMoveArcAnimation(mesh, startPos, endPos, onComplete) {
        mesh.position.copy(startPos);

        const duration = ANIMATION_LIFETIME;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            if (elapsed < 0) {
                requestAnimationFrame(animate);
                return;
            }

            const t = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3);

            mesh.position.x = startPos.x + (endPos.x - startPos.x) * eased;
            mesh.position.z = startPos.z + (endPos.z - startPos.z) * eased;
            mesh.position.y = Math.sin(t * Math.PI) * 0.6;
            mesh.rotation.y = (1 - eased) * 0.25;

            if (t < 1) {
                requestAnimationFrame(animate);
            } else {
                if (onComplete) onComplete();
            }
        };

        requestAnimationFrame(animate);
    }

    playCaptureAnimation(mesh, startPos, endPos, onComplete) {
        mesh.position.copy(startPos);

        const duration = 450;

        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            if (elapsed < 0) {
                requestAnimationFrame(animate);
                return;
            }

            const t = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3);

            mesh.position.x = startPos.x + (endPos.x - startPos.x) * eased;
            mesh.position.z = startPos.z + (endPos.z - startPos.z) * eased;
            mesh.position.y = startPos.y + (endPos.y - startPos.y) * eased;
            mesh.rotation.z = t * Math.PI;

            if (t < 1) {
                requestAnimationFrame(animate);
            } else {
                // Dispose captured piece
                if (mesh.type === 'Group') {
                    mesh.children.forEach(child => {
                        if (child.material) {
                            child.material.dispose();
                        }
                        if (child.geometry) {
                            child.geometry.dispose();
                        }
                    });
                } else {
                    if (mesh.material) mesh.material.dispose();
                    if (mesh.geometry) mesh.geometry.dispose();
                }
                if (onComplete) onComplete();
            }
        };

        requestAnimationFrame(animate);
    }

    finalizeMove(keyFrom, keyTo, mesh) {
        mesh.userData.logicX = parseInt(keyTo.split(',')[0]);
        mesh.userData.logicZ = parseInt(keyTo.split(',')[1]);

        this.piecesMeshes.delete(keyFrom);
        this.piecesMeshes.set(keyTo, mesh);

        this.clearLegalMoveHighlights();
    }

    clearLegalMoveHighlights() {
        this.legalMoveHighlights.forEach(h => {
            this.board.group.remove(h);
            if (h.geometry) h.geometry.dispose();
            if (h.material) h.material.dispose();
        });
        this.legalMoveHighlights = [];
    }

    addLegalMoveHighlight(x, z) {
        const ringGeo = new THREE.RingGeometry(0.12, 0.38, 24);
        const ringMat = new THREE.MeshBasicMaterial({
            color: 0x44ff88,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide,
            depthTest: true,
            depthWrite: false
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);

        ring.position.set(
            (x - 3.5),
            this.board.boardHeight / 2 + 0.015,
            (z - 3.5)
        );
        ring.rotation.x = -Math.PI / 2;

        this.board.group.add(ring);
        this.legalMoveHighlights.push(ring);
    }

    onSquareClick(x, z) {
        this.handleInteraction(x, z);
    }

    onPieceClick(mesh) {
        this.handleInteraction(mesh.userData.logicX, mesh.userData.logicZ);
    }

    handleInteraction(x, z) {
        if (this.isAiThinking) return;
        if (this.isAnimating) return;

        // In CPU mode, only allow white (human) moves
        if (this.gameMode === 'cpu' && this.gameLogic.turn !== 'white') return;

        if (this.selectedSquare) {
            const fromX = this.selectedSquare.x;
            const fromZ = this.selectedSquare.z;

            // Clicking the same square deselects
            if (fromX === x && fromZ === z) {
                this.deselect();
                return;
            }

            const success = this.gameLogic.move(fromX, fromZ, x, z);
            if (success) {
                this.clearLegalMoveHighlights();
                this.deselect();

                this.animateMove(fromX, fromZ, x, z, () => {
                    this.updateTurnUI();
                    this.checkGameEnd();

                    // If CPU mode and it's now black's turn, trigger AI
                    if (this.gameMode === 'cpu' && !this.isAiThinking &&
                        this.gameLogic.turn === 'black') {
                        this.triggerAiMove();
                    }
                });
            } else {
                // Invalid move - try selecting this square if it has a piece
                this.selectSquare(x, z);
            }
        } else {
            this.selectSquare(x, z);
        }
    }

    selectSquare(x, z) {
        const piece = this.gameLogic.getPieceAt(x, z);
        if (piece && piece.color === this.gameLogic.turn) {
            this.selectedSquare = { x, z };
            this.board.highlightSquare(x, z, 0xffff00);

            // Highlight legal moves
            this.clearLegalMoveHighlights();
            const moves = this.gameLogic.getAllLegalMoves(this.gameLogic.turn);
            const validMoves = moves.filter(m => m.from.x === x && m.from.z === z);

            validMoves.forEach(m => {
                this.addLegalMoveHighlight(m.to.x, m.to.z);
            });
        } else {
            this.deselect();
        }
    }

    deselect() {
        this.selectedSquare = null;
        this.board.highlightSquare(-1, -1);
        this.clearLegalMoveHighlights();
    }

    triggerAiMove() {
        if (this.isAiThinking || this.isAnimating) return;
        if (this.gameLogic.turn !== 'black') return;

        this.isAiThinking = true;
        document.getElementById('turn-indicator').innerText = 'Turno: Pensando...';

        // Add a small delay so the UI update is visible
        setTimeout(() => {
            const move = this.gameLogic.makeBestMove('black');

            if (move) {
                this.animateMove(move.from.x, move.from.z, move.to.x, move.to.z, () => {
                    this.updateTurnUI();
                    this.checkGameEnd();
                });
            } else {
                // AI has no legal moves - check why
                const moves = this.gameLogic.getAllLegalMoves('black');
                if (moves.length === 0) {
                    // Check if it's checkmate or stalemate
                    // Simple check: verify if king is in check
                    const kingPos = this._findKing('black');
                    const inCheck = kingPos ? this._isInCheck('black') : false;

                    if (inCheck) {
                        this.endGame('Jaque Mate! ¡Las Blancas ganan!');
                    } else {
                        this.endGame('Tablas por insuficiencia de material.');
                    }
                }
            }

            this.isAiThinking = false;
        }, 350);
    }

    _findKing(color) {
        for (let z = 0; z < 8; z++) {
            for (let x = 0; x < 8; x++) {
                const p = this.gameLogic.board[z][x];
                if (p && p.type === 'king' && p.color === color) {
                    return { x, z };
                }
            }
        }
        return null;
    }

    _isInCheck(color) {
        const kingPos = this._findKing(color);
        if (!kingPos) return false;

        const opponent = color === 'white' ? 'black' : 'white';
        for (let z = 0; z < 8; z++) {
            for (let x = 0; x < 8; x++) {
                const p = this.gameLogic.board[z][x];
                if (p && p.color === opponent && this.gameLogic._pieceCanAttack(x, z, kingPos.x, kingPos.z, p)) {
                    return true;
                }
            }
        }
        return false;
    }

    checkGameEnd() {
        const moves = this.gameLogic.getAllLegalMoves(this.gameLogic.turn);
        if (moves.length === 0) {
            if (this.gameLogic.turn === 'white') {
                this.endGame('Jaque Mate! ¡Las Blancas ganan!');
            } else {
                this.endGame('Jaque Mate! ¡Las Negras ganan!');
            }
            return;
        }
    }

    endGame(message) {
        this.isAiThinking = false;
        this.isAnimating = false;

        document.getElementById('game-message').innerText = message;
        document.getElementById('message-overlay').classList.remove('hidden');
        document.getElementById('turn-indicator').innerText = 'Partida Finalizada';
    }

    updateTurnUI() {
        const ui = document.getElementById('turn-indicator');
        if (ui) {
            ui.innerText = `Turno: ${this.gameLogic.turn === 'white' ? 'Blancas' : 'Negras'}`;
        }
    }

    updateDifficultyUI() {
        const cpuBtn = document.getElementById('cpu-btn');
        if (cpuBtn) {
            const diffLabel = this.aiDifficulty.charAt(0).toUpperCase() + this.aiDifficulty.slice(1);
            const btnText = cpuBtn.querySelector('.btn-text');
            if (btnText) {
                btnText.innerText = `Vs CPU (${diffLabel})`;
            }
        }
    }

    initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a2e);
        this.scene.fog = new THREE.Fog(0x1a1a2e, 25, 60);
    }

    initLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xfff4e8, 2.0);
        dirLight.position.set(6, 16, 10);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 35;
        dirLight.shadow.camera.left = -10;
        dirLight.shadow.camera.right = 10;
        dirLight.shadow.camera.top = 10;
        dirLight.shadow.camera.bottom = -10;
        dirLight.shadow.bias = -0.0005;
        this.scene.add(dirLight);

        const fillLight = new THREE.DirectionalLight(0x7799cc, 0.5);
        fillLight.position.set(-6, 10, -8);
        this.scene.add(fillLight);

        const rimLight = new THREE.DirectionalLight(0xcccccc, 0.4);
        rimLight.position.set(0, 4, -12);
        this.scene.add(rimLight);

        const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x362907, 0.4);
        this.scene.add(hemiLight);
    }

    initCamera() {
        this.camera = new THREE.PerspectiveCamera(
            45,
            window.innerWidth / window.innerHeight,
            0.1,
            100
        );

        this.cameraManager = new CameraManager(this.camera, this.container);
    }

    initRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.container.appendChild(this.renderer.domElement);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    addEventListeners() {
        window.addEventListener('resize', () => this.onWindowResize());

        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.gameLogic.reset();
                this.initGame();
                document.getElementById('message-overlay').classList.add('hidden');
            });
        }

        const cpuBtn = document.getElementById('cpu-btn');
        if (cpuBtn) {
            cpuBtn.addEventListener('click', () => {
                const difficulties = ['easy', 'medium', 'hard'];
                const currentIdx = difficulties.indexOf(this.aiDifficulty);
                const nextIdx = (currentIdx + 1) % difficulties.length;
                this.setAiDifficulty(difficulties[nextIdx]);
                this.gameLogic.reset();
                this.initGame();
                document.getElementById('message-overlay').classList.add('hidden');
            });
        }

        const pvpBtn = document.getElementById('pvp-btn');
        if (pvpBtn) {
            pvpBtn.addEventListener('click', () => {
                this.gameMode = 'pvp';
                localStorage.setItem('chess3d_mode', 'pvp');
                this.gameLogic.reset();
                this.initGame();
                document.getElementById('message-overlay').classList.add('hidden');
            });
        }

        const closeMsg = document.getElementById('close-msg');
        if (closeMsg) {
            closeMsg.addEventListener('click', () => {
                document.getElementById('message-overlay').classList.add('hidden');
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'r' || e.key === 'R') {
                if (!e.ctrlKey && !e.metaKey) {
                    this.gameLogic.reset();
                    this.initGame();
                    document.getElementById('message-overlay').classList.add('hidden');
                }
            }
            if (e.key === '1') {
                this.setAiDifficulty('easy');
                this.gameLogic.reset();
                this.initGame();
                document.getElementById('message-overlay').classList.add('hidden');
            }
            if (e.key === '2') {
                this.setAiDifficulty('medium');
                this.gameLogic.reset();
                this.initGame();
                document.getElementById('message-overlay').classList.add('hidden');
            }
            if (e.key === '3') {
                this.setAiDifficulty('hard');
                this.gameLogic.reset();
                this.initGame();
                document.getElementById('message-overlay').classList.add('hidden');
            }
        });
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
