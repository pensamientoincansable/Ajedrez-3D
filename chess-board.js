import * as THREE from 'three';

export class ChessBoard {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.squares = [];

        this.squareSize = 1;
        this.boardHeight = 0.2;
        this.whiteColor = 0xf0d9b5;
        this.blackColor = 0xb58863;

        this.initBoard();
    }

    initBoard() {
        const geometry = new THREE.BoxGeometry(this.squareSize, this.boardHeight, this.squareSize);

        const whiteMat = new THREE.MeshStandardMaterial({
            color: this.whiteColor,
            roughness: 0.6,
            metalness: 0.0
        });
        const blackMat = new THREE.MeshStandardMaterial({
            color: this.blackColor,
            roughness: 0.7,
            metalness: 0.0
        });

        for (let x = 0; x < 8; x++) {
            for (let z = 0; z < 8; z++) {
                const isWhite = (x + z) % 2 === 0;
                const material = isWhite ? whiteMat : blackMat;

                const square = new THREE.Mesh(geometry, material);

                square.position.x = (x - 3.5) * this.squareSize;
                square.position.y = 0;
                square.position.z = (z - 3.5) * this.squareSize;

                square.receiveShadow = true;

                square.userData = {
                    type: 'square',
                    x: x,
                    z: z
                };

                this.group.add(square);
                this.squares.push(square);
            }
        }

        // Border
        const borderGeo = new THREE.BoxGeometry(
            this.squareSize * 8 + 0.6,
            this.boardHeight * 0.6,
            this.squareSize * 8 + 0.6
        );
        const borderMat = new THREE.MeshStandardMaterial({
            color: 0x7a5c3a,
            roughness: 0.8,
            metalness: 0.1
        });
        const border = new THREE.Mesh(borderGeo, borderMat);
        border.position.y = -this.boardHeight / 2;
        border.receiveShadow = true;
        this.group.add(border);

        // Wood grain details on border edges
        const edgeMat = new THREE.MeshStandardMaterial({
            color: 0x6a4c2a,
            roughness: 0.9,
            metalness: 0.0
        });

        // Top edge
        const topEdgeGeo = new THREE.BoxGeometry(this.squareSize * 8 + 0.6, 0.05, 0.15);
        [0, 1].forEach(yOff => {
            const topEdge = new THREE.Mesh(topEdgeGeo, edgeMat);
            topEdge.position.set(0, yOff - this.boardHeight / 2 + 0.02, -(this.squareSize * 8) / 2 - 0.3);
            this.group.add(topEdge);
        });

        // Bottom edge
        const bottomEdge = new THREE.Mesh(topEdgeGeo, edgeMat);
        bottomEdge.position.set(0, -this.boardHeight / 2 + 0.02, (this.squareSize * 8) / 2 + 0.3);
        this.group.add(bottomEdge);

        // Left edge
        const sideEdgeGeo = new THREE.BoxGeometry(0.15, 0.05, this.squareSize * 8 + 0.6);
        const leftEdge = new THREE.Mesh(sideEdgeGeo, edgeMat);
        leftEdge.position.set(-(this.squareSize * 8) / 2 - 0.3, -this.boardHeight / 2 + 0.02, 0);
        this.group.add(leftEdge);

        // Right edge
        const rightEdge = new THREE.Mesh(sideEdgeGeo, edgeMat);
        rightEdge.position.set((this.squareSize * 8) / 2 + 0.3, -this.boardHeight / 2 + 0.02, 0);
        this.group.add(rightEdge);

        this.scene.add(this.group);
    }

    getSquare(x, z) {
        if (x < 0 || x > 7 || z < 0 || z > 7) return null;
        return this.squares.find(s => s.userData.x === x && s.userData.z === z);
    }

    highlightSquare(x, z, color = 0xffff00) {
        if (!this.highlightMesh) {
            const geo = new THREE.PlaneGeometry(this.squareSize * 0.95, this.squareSize * 0.95);
            const mat = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.5,
                side: THREE.DoubleSide,
                depthTest: true,
                depthWrite: false
            });
            this.highlightMesh = new THREE.Mesh(geo, mat);
            this.highlightMesh.rotation.x = -Math.PI / 2;
            this.highlightMesh.position.y = this.boardHeight / 2 + 0.005;
            this.group.add(this.highlightMesh);

            this.highlightPulse = { phase: 0 };
        }

        if (x >= 0 && z >= 0) {
            this.highlightMesh.visible = true;
            this.highlightMesh.material.color.setHex(color);
            this.highlightMesh.position.x = (x - 3.5) * this.squareSize;
            this.highlightMesh.position.z = (z - 3.5) * this.squareSize;
        } else {
            this.highlightMesh.visible = false;
        }
    }

    highlightSquareForTarget(x, z, color = 0x00ff00, alpha = 0.4) {
        if (!this.targetHighlights) {
            this.targetHighlights = [];
        }

        if (x < 0 || z < 0) return;

        // Remove existing if any at same position
        this.targetHighlights = this.targetHighlights.filter(h =>
            h.userData.x !== x || h.userData.z !== z
        );

        const geo = new THREE.RingGeometry(0.1, 0.5, 32);
        const mat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: alpha,
            side: THREE.DoubleSide,
            depthTest: true,
            depthWrite: false
        });
        const mesh = new THREE.Mesh(geo, mat);

        mesh.position.set(
            (x - 3.5) * this.squareSize,
            this.boardHeight / 2 + 0.01,
            (z - 3.5) * this.squareSize
        );
        mesh.rotation.x = -Math.PI / 2;

        mesh.userData = { x, z };
        this.targetHighlights.push(mesh);
        this.group.add(mesh);
    }

    clearTargetHighlights() {
        if (this.targetHighlights) {
            this.targetHighlights.forEach(h => this.group.remove(h));
            this.targetHighlights = [];
        }
    }

    animate(time) {
        if (this.highlightPulse) {
            const pulse = 0.5 + 0.5 * Math.sin(time * 0.003);
            this.highlightMesh.material.opacity = 0.3 + pulse * 0.3;
        }

        if (this.targetHighlights) {
            this.targetHighlights.forEach((h, i) => {
                const scale = 0.8 + 0.2 * Math.sin(time * 0.005 + i);
                h.scale.set(scale, scale, scale);
                h.material.opacity = 0.3 + 0.2 * Math.sin(time * 0.005 + i);
            });
        }
    }
}
