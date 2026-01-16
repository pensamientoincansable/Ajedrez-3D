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

        this.init();
    }

    init() {
        this.domElement.addEventListener('pointerdown', (e) => this.onPointerDown(e));
        // You might want pointer up to differentiate click from drag, but pointerdown is faster responsiveness
    }

    onPointerDown(event) {
        // Calculate pointer position in normalized device coordinates
        const rect = this.domElement.getBoundingClientRect();

        this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.pointer, this.camera);

        // Intersect objects
        // We assume board squares are in a specific group or easy to filter
        // For now, let's intersect everything in the scene and filter by userData
        const intersects = this.raycaster.intersectObjects(this.scene.children, true);

        if (intersects.length > 0) {
            // Find the first relevant object
            // Priority: Piece, then Square
            let target = null;

            for (let hit of intersects) {
                // Check up the parent chain because pieces are Groups
                let obj = hit.object;
                while (obj.parent && obj.parent.type !== 'Scene') {
                    if (obj.userData && (obj.userData.type === 'piece' || obj.userData.type === 'square')) {
                        break; // Found our semantic object
                    }
                    obj = obj.parent;
                }

                if (obj.userData && obj.userData.type === 'piece') {
                    // We hit a piece
                    if (this.callbacks.onPieceClick) {
                        this.callbacks.onPieceClick(obj);
                        return; // Stop after finding top-most piece
                    }
                } else if (!target && obj.userData && obj.userData.type === 'square') {
                    // Keep looking just in case there's a piece on top of this square that we missed 
                    // (though sorted order usually handles this, pieces are usually "closer" to camera than board if on top)
                    target = obj;
                }
            }

            if (target && target.userData.type === 'square') {
                if (this.callbacks.onSquareClick) {
                    this.callbacks.onSquareClick(target.userData.x, target.userData.z);
                }
            }
        }
    }

    setCallbacks(onSquareClick, onPieceClick) {
        this.callbacks.onSquareClick = onSquareClick;
        this.callbacks.onPieceClick = onPieceClick;
    }
}
