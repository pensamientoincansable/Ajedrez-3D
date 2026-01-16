import * as THREE from 'three';
import { CameraManager } from './camera-manager.js';
import { ChessBoard } from './chess-board.js';
import { PieceFactory } from './pieces.js';
import { GameLogic } from './game-logic.js';
import { InputController } from './controls.js';



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

        // State for interaction
        this.selectedSquare = null; // {x, z}
        this.piecesMeshes = new Map(); // Key: "x,z" -> Mesh

        this.initGame();

        this.addEventListeners();
        this.animate();
    }

    initGame() {
        // Create 3D pieces based on logic state
        this.piecesMeshes.clear();

        for (let z = 0; z < 8; z++) {
            for (let x = 0; x < 8; x++) {
                const piece = this.gameLogic.getPieceAt(x, z);
                if (piece) {
                    this.createPieceMesh(piece.type, piece.color, x, z);
                }
            }
        }

        // Setup input callbacks
        this.inputController.setCallbacks(
            (x, z) => this.onSquareClick(x, z),
            (mesh) => this.onPieceClick(mesh)
        );

        this.updateTurnUI();
    }

    createPieceMesh(type, color, x, z) {
        const mesh = this.pieceFactory.createPiece(type, color);
        if (!mesh) return;

        this.placePiece(mesh, x, z);
        this.scene.add(mesh);

        // Store reference
        mesh.userData.logicX = x;
        mesh.userData.logicZ = z;
        this.piecesMeshes.set(`${x},${z}`, mesh);
    }

    placePiece(mesh, x, z) {
        // Convert logic coordinates (0-7) to 3D coordinates
        // Board logic: 0-7. Board visual: -3.5 to 3.5.
        const worldX = (x - 3.5);
        const worldZ = (z - 3.5);

        mesh.position.set(worldX, 0, worldZ);
    }

    movePieceMesh(fromX, fromZ, toX, toZ) {
        const keyFrom = `${fromX},${fromZ}`;
        const keyTo = `${toX},${toZ}`;

        const mesh = this.piecesMeshes.get(keyFrom);
        if (!mesh) return;

        // Capture?
        if (this.piecesMeshes.has(keyTo)) {
            const captured = this.piecesMeshes.get(keyTo);
            this.scene.remove(captured);
            this.piecesMeshes.delete(keyTo);
        }

        // Move
        this.placePiece(mesh, toX, toZ);

        // Update metadata and map
        mesh.userData.logicX = toX;
        mesh.userData.logicZ = toZ;
        this.piecesMeshes.delete(keyFrom);
        this.piecesMeshes.set(keyTo, mesh);
    }

    onSquareClick(x, z) {
        this.handleInteraction(x, z);
    }

    onPieceClick(mesh) {
        this.handleInteraction(mesh.userData.logicX, mesh.userData.logicZ);
    }

    handleInteraction(x, z) {
        if (this.selectedSquare) {
            // Attempt move
            const fromX = this.selectedSquare.x;
            const fromZ = this.selectedSquare.z;

            if (fromX === x && fromZ === z) {
                this.selectedSquare = null;
                this.board.highlightSquare(-1, -1); // Clear highlight
                return;
            }

            const success = this.gameLogic.move(fromX, fromZ, x, z);
            if (success) {
                this.movePieceMesh(fromX, fromZ, x, z);
                this.selectedSquare = null;
                this.board.highlightSquare(-1, -1);
                this.gameLogic.saveState();
                this.updateTurnUI();
            } else {
                // If invalid move, but clicked on own piece, select that instead
                const piece = this.gameLogic.getPieceAt(x, z);
                if (piece && piece.color === this.gameLogic.turn) {
                    this.selectedSquare = { x, z };
                    // Visual feedback would go here (highlight)
                }
            }
        } else {
            // Select if it's our piece
            const piece = this.gameLogic.getPieceAt(x, z);
            if (piece && piece.color === this.gameLogic.turn) {
                this.selectedSquare = { x, z };
                // Visual feedback would go here
            }
        }
    }

    updateTurnUI() {
        const ui = document.getElementById('turn-indicator');
        if (ui) ui.innerText = `Turno: ${this.gameLogic.turn === 'white' ? 'Blancas' : 'Negras'}`;
    }


    initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x222222);
        // Optional: Add fog
        this.scene.fog = new THREE.Fog(0x222222, 10, 30);
    }

    initLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(5, 10, 7);
        dirLight.castShadow = true;
        // Improve shadow quality
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        this.scene.add(dirLight);
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
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Optimize for mobile
        this.renderer.shadowMap.enabled = true;
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
            });
        }

        const toggleBtn = document.getElementById('toggle-view');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                // Simple toggle for now, maybe lock controls
                alert('Modo 2D/3D no implementado visualmente aún, pero la cámara se puede mover libremente.');
            });
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        this.cameraManager.update();
        this.renderer.render(this.scene, this.camera);
    }

}

// Start the game
window.addEventListener('DOMContentLoaded', () => {
    new Game();
});
