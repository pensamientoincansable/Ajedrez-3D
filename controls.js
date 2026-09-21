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
        // Tap vs drag detection: orbiting/zooming must not select squares
        this.downX = 0;
        this.downY = 0;
        this.downTime = 0;
        this.isDown = false;
        this.maxTapDistance = 10; // px
        this.maxTapDuration = 600; // ms
        this.init();
    }

    init() {
        // Tap detection via down/up pair so camera drags and pinch-zoom
        // gestures never trigger square selection (essential on touch).
        this.domElement.addEventListener('pointerdown', (e) => this.onPointerDown(e));
        this.domElement.addEventListener('pointerup', (e) => this.onPointerUp(e));
        this.domElement.addEventListener('pointercancel', () => { this.isDown = false; });
    }

    onPointerDown(event) {
        // Ignore multi-touch (pinch zoom) for selection purposes
        if (event.isPrimary === false) {
            this.isDown = false;
            return;
        }
        this.isDown = true;
        this.downX = event.clientX;
        this.downY = event.clientY;
        this.downTime = performance.now();
    }

    onPointerUp(event) {
        if (!this.isDown) return;
        this.isDown = false;

        // Prevent interaction if clicking on UI
        if (event.target.closest && event.target.closest('.menu-overlay, #game-ui, .panel, .btn')) {
            return;
        }

        // It was a drag, not a tap: let OrbitControls have it
        const dx = event.clientX - this.downX;
        const dy = event.clientY - this.downY;
        const dist = Math.hypot(dx, dy);
        const duration = performance.now() - this.downTime;
        if (dist > this.maxTapDistance || duration > this.maxTapDuration) return;

        // Debounce rapid taps
        const now = performance.now();
        if (now - this.lastClickTime < 80) return;
        this.lastClickTime = now;

        this.handleTap(event.clientX, event.clientY);
    }

    handleTap(clientX, clientY) {
        const rect = this.domElement.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;

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
