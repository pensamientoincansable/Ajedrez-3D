import * as THREE from 'three';

export class InputController {
    constructor(camera, scene, domElement) {
        this.camera = camera;
        this.scene = scene;
        this.domElement = domElement;
        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();
        this.callbacks = {
            onSquareClick: null,
            onPieceClick: null
        };
        this.lastClickTime = 0;
        this.clickThreshold = 300;
        this.init();
    }

    init() {
        // Use pointerdown for responsiveness, but also handle touch
        this.domElement.addEventListener('pointerdown', (e) => this.onPointerDown(e), { passive: false });
        this.domElement.addEventListener('touchstart', (e) => {
            // Prevent double handling
            e.preventDefault();
        }, { passive: false });
    }

    onPointerDown(event) {
        // Prevent interaction if clicking on UI
        if (event.target.closest && event.target.closest('.menu-overlay, #game-ui, .panel, .btn')) {
            return;
        }

        // Debounce rapid clicks
        const now = performance.now();
        if (now - this.lastClickTime < 80) return;
        this.lastClickTime = now;

        const rect = this.domElement.getBoundingClientRect();
        this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.pointer, this.camera);

        // Intersect with high precision
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        if (intersects.length === 0) return;

        // Prioritize pieces over squares, and closest intersection
        let pieceHit = null;
        let squareHit = null;
        let minPieceDist = Infinity;
        let minSquareDist = Infinity;

        for (const hit of intersects) {
            let obj = hit.object;
            // Traverse up to find semantic object
            while (obj && obj.parent && obj.parent.type !== 'Scene') {
                if (obj.userData && obj.userData.type === 'piece') break;
                if (obj.userData && obj.userData.type === 'square') break;
                obj = obj.parent;
            }

            if (obj && obj.userData) {
                if (obj.userData.type === 'piece' && hit.distance < minPieceDist) {
                    pieceHit = obj;
                    minPieceDist = hit.distance;
                } else if (obj.userData.type === 'square' && !pieceHit && hit.distance < minSquareDist) {
                    squareHit = obj;
                    minSquareDist = hit.distance;
                }
            }
        }

        // Prefer piece if it's very close to square (piece on square)
        if (pieceHit) {
            if (this.callbacks.onPieceClick) {
                this.callbacks.onPieceClick(pieceHit);
                return;
            }
        }

        if (squareHit) {
            if (this.callbacks.onSquareClick) {
                this.callbacks.onSquareClick(squareHit.userData.x, squareHit.userData.z);
            }
        }
    }

    setCallbacks(onSquareClick, onPieceClick) {
        this.callbacks.onSquareClick = onSquareClick;
        this.callbacks.onPieceClick = onPieceClick;
    }

    // Haptic feedback for mobile
    vibrate(pattern = 20) {
        if (navigator.vibrate) {
            navigator.vibrate(pattern);
        }
    }
}
