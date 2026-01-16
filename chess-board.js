import * as THREE from 'three';

export class ChessBoard {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.squares = []; // 2D array or map could be useful, or just linear 64

        // Settings
        this.squareSize = 1;
        this.boardHeight = 0.2;
        this.whiteColor = 0xeeeed2;
        this.blackColor = 0x769656; // Standard chess green/white

        this.initBoard();
    }

    initBoard() {
        const geometry = new THREE.BoxGeometry(this.squareSize, this.boardHeight, this.squareSize);

        // Materials
        const whiteMat = new THREE.MeshPhongMaterial({ color: this.whiteColor });
        const blackMat = new THREE.MeshPhongMaterial({ color: this.blackColor });

        for (let x = 0; x < 8; x++) {
            for (let z = 0; z < 8; z++) {
                const isWhite = (x + z) % 2 === 0;
                const material = isWhite ? whiteMat : blackMat;

                const square = new THREE.Mesh(geometry, material);

                // Position: Centered around 0,0
                // x goes from -3.5 to 3.5
                square.position.x = (x - 3.5) * this.squareSize;
                square.position.y = 0;
                square.position.z = (z - 3.5) * this.squareSize;

                square.receiveShadow = true;

                // Metadata for raycasting
                square.userData = {
                    type: 'square',
                    x: x,
                    z: z
                };

                this.group.add(square);
                this.squares.push(square);
            }
        }

        // Add a board border/base
        const borderGeo = new THREE.BoxGeometry(this.squareSize * 8 + 0.5, this.boardHeight * 0.8, this.squareSize * 8 + 0.5);
        const borderMat = new THREE.MeshPhongMaterial({ color: 0x444444 });
        const border = new THREE.Mesh(borderGeo, borderMat);
        border.position.y = -this.boardHeight / 2;
        border.receiveShadow = true;
        this.group.add(border);

        this.scene.add(this.group);
    }

    getSquare(x, z) {
        // x, z are 0-7 indices
        // squares are pushed in order x:0->7 (inner z:0->7)
        return this.squares.find(s => s.userData.x === x && s.userData.z === z);
    }

    highlightSquare(x, z, color = 0xffff00) {
        if (!this.highlightMesh) {
            const geo = new THREE.PlaneGeometry(this.squareSize, this.squareSize);
            const mat = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 0.5,
                side: THREE.DoubleSide
            });
            this.highlightMesh = new THREE.Mesh(geo, mat);
            this.highlightMesh.rotation.x = -Math.PI / 2;
            this.highlightMesh.position.y = this.boardHeight / 2 + 0.01; // Slightly above board
            this.group.add(this.highlightMesh);
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
}
