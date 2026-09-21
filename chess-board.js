import * as THREE from 'three';

export class ChessBoard {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.squares = [];
        this.squareSize = 1;
        this.boardHeight = 0.22;
        this.whiteColor = 0xe8e8e8;
        this.blackColor = 0x2a2a3a;

        this.initBoard();
        this.initEnvironment();
    }

    initBoard() {
        // High quality materials with subtle crystal reflection
        const whiteMat = new THREE.MeshPhysicalMaterial({
            color: this.whiteColor,
            roughness: 0.35,
            metalness: 0.05,
            clearcoat: 0.6,
            clearcoatRoughness: 0.3,
            reflectivity: 0.4,
            envMapIntensity: 0.6
        });

        const blackMat = new THREE.MeshPhysicalMaterial({
            color: this.blackColor,
            roughness: 0.4,
            metalness: 0.1,
            clearcoat: 0.5,
            clearcoatRoughness: 0.4,
            reflectivity: 0.3,
            envMapIntensity: 0.5
        });

        // Create squares with beveled edges
        const squareGeo = this._createBeveledSquareGeometry();

        for (let x = 0; x < 8; x++) {
            for (let z = 0; z < 8; z++) {
                const isWhite = (x + z) % 2 === 0;
                const material = isWhite ? whiteMat : blackMat;

                const square = new THREE.Mesh(squareGeo, material.clone());

                square.position.x = (x - 3.5) * this.squareSize;
                square.position.y = 0;
                square.position.z = (z - 3.5) * this.squareSize;

                square.receiveShadow = true;
                square.castShadow = false;

                square.userData = {
                    type: 'square',
                    x: x,
                    z: z,
                    isWhite: isWhite
                };

                this.group.add(square);
                this.squares.push(square);
            }
        }

        // Luxury border - multi-layered crystal wood
        this._createLuxuryBorder();

        // Add coordinate labels (subtle)
        this._addBoardDetails();

        this.scene.add(this.group);
    }

    _createBeveledSquareGeometry() {
        // Create a box with slightly beveled top edges for crystal light play
        const geometry = new THREE.BoxGeometry(this.squareSize, this.boardHeight, this.squareSize, 1, 1, 1);
        return geometry;
    }

    _createLuxuryBorder() {
        // Main border - dark wood with crystal inlay
        const borderSize = this.squareSize * 8 + 0.8;
        const borderGeo = new THREE.BoxGeometry(borderSize, this.boardHeight * 0.7, borderSize);
        const borderMat = new THREE.MeshPhysicalMaterial({
            color: 0x3d2817,
            roughness: 0.6,
            metalness: 0.05,
            clearcoat: 0.8,
            clearcoatRoughness: 0.2,
            emissive: 0x1a0f05,
            emissiveIntensity: 0.1
        });
        const border = new THREE.Mesh(borderGeo, borderMat);
        border.position.y = -this.boardHeight * 0.15;
        border.receiveShadow = true;
        border.castShadow = true;
        this.group.add(border);

        // Inner crystal inlay - glowing edge
        const inlayGeo = new THREE.BoxGeometry(borderSize + 0.02, 0.04, borderSize + 0.02);
        const inlayMat = new THREE.MeshPhysicalMaterial({
            color: 0xffd700,
            roughness: 0.1,
            metalness: 0.9,
            transmission: 0.3,
            emissive: 0x332200,
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.9
        });
        const inlay = new THREE.Mesh(inlayGeo, inlayMat);
        inlay.position.y = this.boardHeight / 2 + 0.01;
        this.group.add(inlay);

        // Outer golden trim
        const trimThickness = 0.12;
        const trimHeight = 0.08;

        const trimMat = new THREE.MeshPhysicalMaterial({
            color: 0x8a6d3b,
            roughness: 0.3,
            metalness: 0.7,
            clearcoat: 1.0,
            clearcoatRoughness: 0.1
        });

        // Four sides of trim
        const sideGeoH = new THREE.BoxGeometry(borderSize + trimThickness * 2, trimHeight, trimThickness);
        const sideGeoV = new THREE.BoxGeometry(trimThickness, trimHeight, borderSize);

        const positions = [
            { x: 0, z: borderSize / 2 + trimThickness / 2, geo: sideGeoH },
            { x: 0, z: -borderSize / 2 - trimThickness / 2, geo: sideGeoH },
            { x: borderSize / 2 + trimThickness / 2, z: 0, geo: sideGeoV },
            { x: -borderSize / 2 - trimThickness / 2, z: 0, geo: sideGeoV }
        ];

        positions.forEach(pos => {
            const trim = new THREE.Mesh(pos.geo, trimMat);
            trim.position.set(pos.x, -this.boardHeight / 2 + trimHeight / 2, pos.z);
            trim.receiveShadow = true;
            this.group.add(trim);
        });

        // Corner crystals - small icosahedrons at corners
        const cornerPositions = [
            [borderSize / 2, borderSize / 2],
            [borderSize / 2, -borderSize / 2],
            [-borderSize / 2, borderSize / 2],
            [-borderSize / 2, -borderSize / 2]
        ];

        cornerPositions.forEach(([cx, cz]) => {
            const crystalGeo = new THREE.IcosahedronGeometry(0.12, 0);
            const crystalMat = new THREE.MeshPhysicalMaterial({
                color: 0xaaddff,
                transmission: 0.9,
                thickness: 0.5,
                roughness: 0.05,
                metalness: 0,
                clearcoat: 1.0,
                ior: 1.5,
                emissive: 0x002244,
                emissiveIntensity: 0.2
            });
            const crystal = new THREE.Mesh(crystalGeo, crystalMat);
            crystal.position.set(cx, 0.05, cz);
            crystal.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
            this.group.add(crystal);
        });
    }

    _addBoardDetails() {
        // Subtle grid lines with emissive crystal
        const lineMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.03
        });

        // Vertical lines
        for (let i = 0; i <= 8; i++) {
            const x = (i - 4) * this.squareSize;
            const lineGeo = new THREE.BoxGeometry(0.02, 0.01, 8 * this.squareSize);
            const line = new THREE.Mesh(lineGeo, lineMat);
            line.position.set(x, this.boardHeight / 2 + 0.005, 0);
            this.group.add(line);
        }

        // Horizontal lines
        for (let i = 0; i <= 8; i++) {
            const z = (i - 4) * this.squareSize;
            const lineGeo = new THREE.BoxGeometry(8 * this.squareSize, 0.01, 0.02);
            const line = new THREE.Mesh(lineGeo, lineMat);
            line.position.set(0, this.boardHeight / 2 + 0.005, z);
            this.group.add(line);
        }
    }

    initEnvironment() {
        // Add subtle fog particles around board for crystal atmosphere
        const particleCount = 20;
        const particleGeo = new THREE.IcosahedronGeometry(0.03, 0);
        const particleMat = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            transmission: 0.95,
            opacity: 0.3,
            transparent: true,
            roughness: 0,
            metalness: 0
        });

        for (let i = 0; i < particleCount; i++) {
            const particle = new THREE.Mesh(particleGeo, particleMat.clone());
            const angle = (i / particleCount) * Math.PI * 2;
            const radius = 5 + Math.random() * 2;
            particle.position.set(
                Math.cos(angle) * radius,
                0.5 + Math.random() * 2,
                Math.sin(angle) * radius
            );
            particle.userData = {
                baseY: particle.position.y,
                phase: Math.random() * Math.PI * 2,
                speed: 0.5 + Math.random() * 0.5
            };
            this.group.add(particle);
            if (!this.particles) this.particles = [];
            this.particles.push(particle);
        }
    }

    getSquare(x, z) {
        if (x < 0 || x > 7 || z < 0 || z > 7) return null;
        return this.squares.find(s => s.userData.x === x && s.userData.z === z);
    }

    highlightSquare(x, z, color = 0xffff00) {
        if (!this.highlightMesh) {
            const geo = new THREE.PlaneGeometry(this.squareSize * 0.92, this.squareSize * 0.92);
            const mat = new THREE.MeshPhysicalMaterial({
                color: color,
                transparent: true,
                opacity: 0.6,
                side: THREE.DoubleSide,
                emissive: new THREE.Color(color),
                emissiveIntensity: 0.4,
                transmission: 0.2,
                roughness: 0.1,
                depthWrite: false
            });
            this.highlightMesh = new THREE.Mesh(geo, mat);
            this.highlightMesh.rotation.x = -Math.PI / 2;
            this.highlightMesh.position.y = this.boardHeight / 2 + 0.015;
            this.highlightMesh.renderOrder = 10;
            this.group.add(this.highlightMesh);
            this.highlightPulse = { phase: 0 };
        }

        if (x >= 0 && z >= 0) {
            this.highlightMesh.visible = true;
            this.highlightMesh.material.color.setHex(color);
            this.highlightMesh.material.emissive.setHex(color);
            this.highlightMesh.position.x = (x - 3.5) * this.squareSize;
            this.highlightMesh.position.z = (z - 3.5) * this.squareSize;
        } else {
            this.highlightMesh.visible = false;
        }
    }

    highlightLastMove(from, to) {
        if (!this.lastMoveHighlights) this.lastMoveHighlights = [];

        // Clear previous
        this.lastMoveHighlights.forEach(m => this.group.remove(m));
        this.lastMoveHighlights = [];

        if (!from || !to) return;

        const createHighlight = (pos, col) => {
            const geo = new THREE.PlaneGeometry(this.squareSize * 0.96, this.squareSize * 0.96);
            const mat = new THREE.MeshBasicMaterial({
                color: col,
                transparent: true,
                opacity: 0.25,
                side: THREE.DoubleSide,
                depthWrite: false
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(
                (pos.x - 3.5) * this.squareSize,
                this.boardHeight / 2 + 0.008,
                (pos.z - 3.5) * this.squareSize
            );
            mesh.rotation.x = -Math.PI / 2;
            mesh.renderOrder = 5;
            this.group.add(mesh);
            this.lastMoveHighlights.push(mesh);
        };

        createHighlight(from, 0xffffaa);
        createHighlight(to, 0xaaffaa);
    }

    highlightCheck(kingPos) {
        if (!kingPos) return;

        if (this.checkHighlight) {
            this.group.remove(this.checkHighlight);
        }

        const geo = new THREE.RingGeometry(0.2, 0.5, 16);
        const mat = new THREE.MeshBasicMaterial({
            color: 0xff2222,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(
            (kingPos.x - 3.5) * this.squareSize,
            this.boardHeight / 2 + 0.02,
            (kingPos.z - 3.5) * this.squareSize
        );
        mesh.rotation.x = -Math.PI / 2;
        mesh.renderOrder = 15;
        this.group.add(mesh);
        this.checkHighlight = mesh;
    }

    clearCheckHighlight() {
        if (this.checkHighlight) {
            this.group.remove(this.checkHighlight);
            this.checkHighlight = null;
        }
    }

    animate(time) {
        if (this.highlightPulse && this.highlightMesh && this.highlightMesh.visible) {
            const pulse = 0.5 + 0.5 * Math.sin(time * 0.004);
            this.highlightMesh.material.opacity = 0.35 + pulse * 0.25;
            this.highlightMesh.material.emissiveIntensity = 0.2 + pulse * 0.3;
        }

        if (this.checkHighlight) {
            const pulse = Math.sin(time * 0.008);
            this.checkHighlight.scale.setScalar(0.9 + pulse * 0.15);
            this.checkHighlight.material.opacity = 0.5 + pulse * 0.2;
        }

        if (this.particles) {
            this.particles.forEach(p => {
                p.position.y = p.userData.baseY + Math.sin(time * 0.001 * p.userData.speed + p.userData.phase) * 0.3;
                p.rotation.y += 0.005;
                p.rotation.x += 0.003;
            });
        }
    }
}
