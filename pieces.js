import * as THREE from 'three';

export class PieceFactory {
    constructor() {
        // Crystalline materials - professional PBR with transmission
        this.materials = {
            white: new THREE.MeshPhysicalMaterial({
                color: 0xe8f4ff,
                emissive: 0x001122,
                emissiveIntensity: 0.15,
                roughness: 0.08,
                metalness: 0.1,
                transmission: 0.65,
                thickness: 0.8,
                ior: 1.52,
                clearcoat: 1.0,
                clearcoatRoughness: 0.08,
                reflectivity: 0.9,
                envMapIntensity: 1.2,
                flatShading: false,
                side: THREE.DoubleSide
            }),
            black: new THREE.MeshPhysicalMaterial({
                color: 0x1e1e2e,
                emissive: 0x220011,
                emissiveIntensity: 0.2,
                roughness: 0.12,
                metalness: 0.3,
                transmission: 0.35,
                thickness: 0.6,
                ior: 1.65,
                clearcoat: 1.0,
                clearcoatRoughness: 0.12,
                reflectivity: 0.85,
                envMapIntensity: 1.0,
                flatShading: false,
                side: THREE.DoubleSide
            })
        };

        // Accent materials - crystalline gold and ruby
        this.crystalGold = new THREE.MeshPhysicalMaterial({
            color: 0xffd700,
            roughness: 0.05,
            metalness: 0.9,
            transmission: 0.2,
            thickness: 0.3,
            clearcoat: 1.0,
            clearcoatRoughness: 0.05,
            emissive: 0x332200,
            emissiveIntensity: 0.2,
            envMapIntensity: 1.5
        });

        this.crystalRuby = new THREE.MeshPhysicalMaterial({
            color: 0xcc1122,
            roughness: 0.08,
            metalness: 0.1,
            transmission: 0.7,
            thickness: 0.5,
            ior: 1.76,
            clearcoat: 1.0,
            emissive: 0x440000,
            emissiveIntensity: 0.3
        });

        this.crystalIce = new THREE.MeshPhysicalMaterial({
            color: 0xaaddff,
            roughness: 0.02,
            metalness: 0.0,
            transmission: 0.95,
            thickness: 1.0,
            ior: 1.31,
            clearcoat: 1.0,
            clearcoatRoughness: 0.02,
            envMapIntensity: 1.3
        });

        // Geometry cache for performance
        this.geometryCache = new Map();
    }

    getCachedGeometry(key, factory) {
        if (!this.geometryCache.has(key)) {
            this.geometryCache.set(key, factory());
        }
        return this.geometryCache.get(key);
    }

    createPiece(type, color) {
        let mesh;
        const material = color === 'white' ? this.materials.white : this.materials.black;

        switch (type) {
            case 'pawn': mesh = this._createPawn(material, color); break;
            case 'rook': mesh = this._createRook(material, color); break;
            case 'knight': mesh = this._createKnight(material, color); break;
            case 'bishop': mesh = this._createBishop(material, color); break;
            case 'queen': mesh = this._createQueen(material, color); break;
            case 'king': mesh = this._createKing(material, color); break;
            default: console.error('Unknown piece type:', type); return null;
        }

        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { type: 'piece', pieceType: type, color: color };

        // Add subtle crystal edge lines
        this._addCrystalEdges(mesh, color);

        return mesh;
    }

    _addCrystalEdges(group, color) {
        // Add wireframe overlay for triangular faceting effect on key pieces
        group.traverse(child => {
            if (child.isMesh && child.geometry) {
                // Add slight inner glow
                child.material.needsUpdate = true;
            }
        });
    }

    _createLatheCrystal(points, segments = 24, material) {
        const geometry = new THREE.LatheGeometry(points, segments);
        geometry.computeVertexNormals();
        const mesh = new THREE.Mesh(geometry, material);
        return mesh;
    }

    _createPawn(material, color) {
        const group = new THREE.Group();

        // Base - faceted cylinder for triangular look
        const basePoints = [];
        basePoints.push(new THREE.Vector2(0, 0));
        basePoints.push(new THREE.Vector2(0.44, 0));
        basePoints.push(new THREE.Vector2(0.44, 0.08));
        basePoints.push(new THREE.Vector2(0.42, 0.12));
        basePoints.push(new THREE.Vector2(0.38, 0.14));
        basePoints.push(new THREE.Vector2(0.32, 0.15));
        basePoints.push(new THREE.Vector2(0, 0.15));
        const base = this._createLatheCrystal(basePoints, 16, material);
        group.add(base);

        // Crystal ring - torus with triangular cross-section
        const ringGeo = this.getCachedGeometry('pawn_ring', () => {
            const geo = new THREE.TorusGeometry(0.38, 0.03, 6, 16);
            return geo;
        });
        const ring = new THREE.Mesh(ringGeo, color === 'white' ? this.crystalIce : this.crystalGold);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.15;
        group.add(ring);

        // Body - elegant bell with crystalline facets
        const bodyPoints = [];
        bodyPoints.push(new THREE.Vector2(0, 0.15));
        bodyPoints.push(new THREE.Vector2(0.30, 0.16));
        bodyPoints.push(new THREE.Vector2(0.26, 0.30));
        bodyPoints.push(new THREE.Vector2(0.20, 0.50));
        bodyPoints.push(new THREE.Vector2(0.14, 0.65));
        bodyPoints.push(new THREE.Vector2(0, 0.65));
        const body = this._createLatheCrystal(bodyPoints, 12, material);
        group.add(body);

        // Upper crystal collar - icosahedron style
        const collarGeo = this.getCachedGeometry('pawn_collar', () => {
            return new THREE.CylinderGeometry(0.12, 0.16, 0.08, 6);
        });
        const collar = new THREE.Mesh(collarGeo, material);
        collar.position.y = 0.70;
        group.add(collar);

        // Head - faceted icosahedron for triangular crystal look
        const headGeo = this.getCachedGeometry('pawn_head', () => {
            const geo = new THREE.IcosahedronGeometry(0.16, 1);
            // Flatten slightly
            geo.scale(1, 0.85, 1);
            return geo;
        });
        const head = new THREE.Mesh(headGeo, material);
        head.position.y = 0.88;
        group.add(head);

        // Top crystal tip - small tetrahedron
        const tipGeo = this.getCachedGeometry('pawn_tip', () => {
            return new THREE.TetrahedronGeometry(0.06, 0);
        });
        const tipMat = color === 'white' ? this.crystalIce : this.crystalRuby;
        const tip = new THREE.Mesh(tipGeo, tipMat);
        tip.position.y = 1.02;
        tip.rotation.x = Math.PI;
        group.add(tip);

        return group;
    }

    _createRook(material, color) {
        const group = new THREE.Group();

        // Base - heavy crystal fortress base
        const basePoints = [
            new THREE.Vector2(0, 0),
            new THREE.Vector2(0.50, 0),
            new THREE.Vector2(0.50, 0.10),
            new THREE.Vector2(0.48, 0.14),
            new THREE.Vector2(0.42, 0.16),
            new THREE.Vector2(0, 0.16)
        ];
        const base = this._createLatheCrystal(basePoints, 8, material);
        group.add(base);

        // Base crystal ring
        const ringGeo = new THREE.TorusGeometry(0.45, 0.04, 5, 8);
        const ring = new THREE.Mesh(ringGeo, color === 'white' ? this.crystalIce : this.crystalGold);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.16;
        group.add(ring);

        // Main tower - octagonal for crystalline facets
        const towerGeo = this.getCachedGeometry('rook_tower', () => {
            const geo = new THREE.CylinderGeometry(0.32, 0.42, 0.70, 8);
            return geo;
        });
        const tower = new THREE.Mesh(towerGeo, material);
        tower.position.y = 0.58;
        group.add(tower);

        // Middle band - golden crystal
        const bandGeo = new THREE.TorusGeometry(0.34, 0.035, 4, 8);
        const band = new THREE.Mesh(bandGeo, this.crystalGold);
        band.rotation.x = Math.PI / 2;
        band.position.y = 0.55;
        group.add(band);

        // Crenellations - 4 merlons with crystal tops, triangular
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
            const r = 0.32;
            const x = Math.cos(angle) * r;
            const z = Math.sin(angle) * r;

            // Merlon base - box with beveled edges
            const merlonGeo = this.getCachedGeometry('rook_merlon', () => {
                return new THREE.BoxGeometry(0.14, 0.22, 0.14);
            });
            const merlon = new THREE.Mesh(merlonGeo, material);
            merlon.position.set(x, 1.02, z);
            group.add(merlon);

            // Crystal top on merlon
            const topGeo = new THREE.ConeGeometry(0.06, 0.10, 4);
            const top = new THREE.Mesh(topGeo, color === 'white' ? this.crystalIce : this.crystalRuby);
            top.position.set(x, 1.18, z);
            group.add(top);
        }

        // Top platform
        const platformGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.06, 8);
        const platform = new THREE.Mesh(platformGeo, material);
        platform.position.y = 0.96;
        group.add(platform);

        // Central crystal - octahedron
        const centerGeo = this.getCachedGeometry('rook_center', () => {
            return new THREE.OctahedronGeometry(0.10, 0);
        });
        const centerMat = color === 'white' ? this.crystalIce : this.crystalGold;
        const center = new THREE.Mesh(centerGeo, centerMat);
        center.position.y = 1.05;
        group.add(center);

        return group;
    }

    _createKnight(material, color) {
        const group = new THREE.Group();

        // Base - octagonal crystal
        const baseGeo = new THREE.CylinderGeometry(0.44, 0.46, 0.14, 8);
        const base = new THREE.Mesh(baseGeo, material);
        base.position.y = 0.07;
        group.add(base);

        // Body - stylized horse with low-poly crystal look
        // Torso - elongated icosahedron stretched
        const torsoGeo = this.getCachedGeometry('knight_torso', () => {
            const geo = new THREE.CapsuleGeometry(0.18, 0.45, 4, 8);
            return geo;
        });
        const torso = new THREE.Mesh(torsoGeo, material);
        torso.position.set(0, 0.42, 0);
        torso.rotation.z = Math.PI / 2.2;
        torso.rotation.y = 0.2;
        group.add(torso);

        // Neck - triangular prism
        const neckGeo = this.getCachedGeometry('knight_neck', () => {
            return new THREE.CylinderGeometry(0.10, 0.18, 0.35, 6);
        });
        const neck = new THREE.Mesh(neckGeo, material);
        neck.position.set(0.12, 0.72, -0.12);
        neck.rotation.x = -0.4;
        neck.rotation.z = 0.3;
        group.add(neck);

        // Head - crystal horse head using icosahedron
        const headGeo = this.getCachedGeometry('knight_head', () => {
            const geo = new THREE.IcosahedronGeometry(0.16, 0);
            geo.scale(1.2, 0.9, 1.6);
            return geo;
        });
        const head = new THREE.Mesh(headGeo, material);
        head.position.set(0.18, 0.92, -0.22);
        head.rotation.y = 0.3;
        group.add(head);

        // Snout - cone with triangular base
        const snoutGeo = this.getCachedGeometry('knight_snout', () => {
            return new THREE.ConeGeometry(0.08, 0.18, 4);
        });
        const snout = new THREE.Mesh(snoutGeo, material);
        snout.position.set(0.28, 0.88, -0.30);
        snout.rotation.x = Math.PI / 2 + 0.2;
        snout.rotation.z = 0.2;
        group.add(snout);

        // Ears - small tetrahedrons
        const earGeo = this.getCachedGeometry('knight_ear', () => {
            return new THREE.TetrahedronGeometry(0.06, 0);
        });
        const ear1 = new THREE.Mesh(earGeo, material);
        ear1.position.set(0.10, 1.06, -0.18);
        ear1.rotation.x = -0.2;
        group.add(ear1);

        const ear2 = new THREE.Mesh(earGeo, material);
        ear2.position.set(0.18, 1.06, -0.24);
        ear2.rotation.x = -0.2;
        group.add(ear2);

        // Mane - series of small crystals
        for (let i = 0; i < 4; i++) {
            const maneGeo = new THREE.ConeGeometry(0.04, 0.12, 3);
            const mane = new THREE.Mesh(maneGeo, color === 'white' ? this.crystalIce : this.crystalGold);
            mane.position.set(0.05 - i * 0.03, 0.78 + i * 0.06, -0.05);
            mane.rotation.z = 0.5;
            group.add(mane);
        }

        // Eye - ruby crystal
        const eyeGeo = new THREE.OctahedronGeometry(0.035, 0);
        const eye = new THREE.Mesh(eyeGeo, this.crystalRuby);
        eye.position.set(0.24, 0.94, -0.16);
        group.add(eye);

        // Legs - crystal pillars with faceted geometry
        const legPositions = [
            { x: -0.18, z: -0.12, h: 0.32 },
            { x: 0.18, z: -0.12, h: 0.32 },
            { x: -0.18, z: 0.12, h: 0.28 },
            { x: 0.18, z: 0.12, h: 0.28 }
        ];

        legPositions.forEach(pos => {
            const legGeo = new THREE.CylinderGeometry(0.05, 0.07, pos.h, 5);
            const leg = new THREE.Mesh(legGeo, material);
            leg.position.set(pos.x, pos.h / 2, pos.z);
            group.add(leg);

            // Hoof - crystal
            const hoofGeo = new THREE.CylinderGeometry(0.07, 0.06, 0.06, 5);
            const hoof = new THREE.Mesh(hoofGeo, color === 'white' ? this.crystalIce : this.crystalGold);
            hoof.position.set(pos.x, 0.03, pos.z);
            group.add(hoof);
        });

        return group;
    }

    _createBishop(material, color) {
        const group = new THREE.Group();

        // Base
        const basePoints = [
            new THREE.Vector2(0, 0),
            new THREE.Vector2(0.44, 0),
            new THREE.Vector2(0.44, 0.10),
            new THREE.Vector2(0.40, 0.14),
            new THREE.Vector2(0, 0.14)
        ];
        const base = this._createLatheCrystal(basePoints, 8, material);
        group.add(base);

        // Body - slender crystal spire
        const bodyPoints = [
            new THREE.Vector2(0, 0.14),
            new THREE.Vector2(0.28, 0.16),
            new THREE.Vector2(0.22, 0.35),
            new THREE.Vector2(0.16, 0.60),
            new THREE.Vector2(0.12, 0.80),
            new THREE.Vector2(0, 0.80)
        ];
        const body = this._createLatheCrystal(bodyPoints, 8, material);
        group.add(body);

        // Crystal bands - 2 golden rings
        [0.32, 0.58].forEach(y => {
            const bandGeo = new THREE.TorusGeometry(0.20 - y * 0.08, 0.025, 4, 8);
            const band = new THREE.Mesh(bandGeo, this.crystalGold);
            band.rotation.x = Math.PI / 2;
            band.position.y = y;
            group.add(band);
        });

        // Mitre - bishop's hat with triangular faceting
        const mitreLowerGeo = this.getCachedGeometry('bishop_mitre_lower', () => {
            // Create a custom mitre with 6 sides for crystal look
            return new THREE.CylinderGeometry(0.16, 0.22, 0.18, 6);
        });
        const mitreLower = new THREE.Mesh(mitreLowerGeo, material);
        mitreLower.position.y = 0.92;
        group.add(mitreLower);

        // Mitre slit - crystal line
        const slitGeo = new THREE.BoxGeometry(0.02, 0.14, 0.18);
        const slit = new THREE.Mesh(slitGeo, this.crystalGold);
        slit.position.set(0, 0.94, 0.08);
        group.add(slit);

        // Mitre peak - crystal pyramid
        const peakGeo = this.getCachedGeometry('bishop_peak', () => {
            return new THREE.ConeGeometry(0.08, 0.20, 4);
        });
        const peak = new THREE.Mesh(peakGeo, material);
        peak.position.set(0, 1.10, 0.06);
        peak.rotation.x = 0.25;
        group.add(peak);

        // Crystal orb on top
        const orbGeo = this.getCachedGeometry('bishop_orb', () => {
            return new THREE.IcosahedronGeometry(0.05, 1);
        });
        const orb = new THREE.Mesh(orbGeo, color === 'white' ? this.crystalIce : this.crystalRuby);
        orb.position.set(0, 1.22, 0.08);
        group.add(orb);

        // Small cross - crystal
        const crossVGeo = new THREE.BoxGeometry(0.02, 0.14, 0.02);
        const crossV = new THREE.Mesh(crossVGeo, this.crystalGold);
        crossV.position.set(0, 1.30, 0.08);
        group.add(crossV);

        const crossHGeo = new THREE.BoxGeometry(0.08, 0.02, 0.02);
        const crossH = new THREE.Mesh(crossHGeo, this.crystalGold);
        crossH.position.set(0, 1.30, 0.08);
        group.add(crossH);

        return group;
    }

    _createQueen(material, color) {
        const group = new THREE.Group();

        // Majestic base - wide crystal
        const basePoints = [
            new THREE.Vector2(0, 0),
            new THREE.Vector2(0.52, 0),
            new THREE.Vector2(0.52, 0.12),
            new THREE.Vector2(0.48, 0.16),
            new THREE.Vector2(0.44, 0.18),
            new THREE.Vector2(0, 0.18)
        ];
        const base = this._createLatheCrystal(basePoints, 10, material);
        group.add(base);

        // Base crystal crown
        const baseRingGeo = new THREE.TorusGeometry(0.48, 0.04, 5, 10);
        const baseRing = new THREE.Mesh(baseRingGeo, this.crystalGold);
        baseRing.rotation.x = Math.PI / 2;
        baseRing.position.y = 0.18;
        group.add(baseRing);

        // Lower gown - flared crystal
        const gownPoints = [
            new THREE.Vector2(0, 0.18),
            new THREE.Vector2(0.40, 0.20),
            new THREE.Vector2(0.36, 0.35),
            new THREE.Vector2(0.30, 0.55),
            new THREE.Vector2(0, 0.55)
        ];
        const gown = this._createLatheCrystal(gownPoints, 10, material);
        group.add(gown);

        // Waist band - crystal belt
        const waistGeo = new THREE.TorusGeometry(0.28, 0.03, 4, 10);
        const waist = new THREE.Mesh(waistGeo, this.crystalGold);
        waist.rotation.x = Math.PI / 2;
        waist.position.y = 0.56;
        group.add(waist);

        // Upper body - slender crystal torso
        const torsoGeo = new THREE.CylinderGeometry(0.20, 0.28, 0.45, 8);
        const torso = new THREE.Mesh(torsoGeo, material);
        torso.position.y = 0.82;
        group.add(torso);

        // Crown - 8 pointed crystal crown with triangular facets
        const crownPoints = 8;
        for (let i = 0; i < crownPoints; i++) {
            const angle = (i / crownPoints) * Math.PI * 2;
            const r = 0.22;
            const x = Math.cos(angle) * r;
            const z = Math.sin(angle) * r;
            const isHigh = i % 2 === 0;

            // Crown spike - triangular crystal
            const spikeHeight = isHigh ? 0.22 : 0.14;
            const spikeGeo = new THREE.ConeGeometry(0.05, spikeHeight, 3);
            const spikeMat = isHigh ? this.crystalGold : (color === 'white' ? this.crystalIce : this.crystalRuby);
            const spike = new THREE.Mesh(spikeGeo, spikeMat);
            spike.position.set(x, 1.10 + spikeHeight / 2 - 0.05, z);
            spike.lookAt(0, 1.3, 0);
            group.add(spike);
        }

        // Central large crystal orb - queen's jewel
        const jewelGeo = this.getCachedGeometry('queen_jewel', () => {
            return new THREE.IcosahedronGeometry(0.12, 2);
        });
        const jewelMat = color === 'white' ? this.crystalIce : this.crystalRuby;
        const jewel = new THREE.Mesh(jewelGeo, jewelMat);
        jewel.position.y = 1.12;
        group.add(jewel);

        // Small floating crystals around queen
        for (let i = 0; i < 3; i++) {
            const floatGeo = new THREE.OctahedronGeometry(0.04, 0);
            const float = new THREE.Mesh(floatGeo, this.crystalGold);
            const angle = (i / 3) * Math.PI * 2 + Date.now() * 0.001;
            float.position.set(
                Math.cos(angle) * 0.35,
                0.85 + Math.sin(i) * 0.1,
                Math.sin(angle) * 0.35
            );
            group.add(float);
        }

        return group;
    }

    _createKing(material, color) {
        const group = new THREE.Group();

        // Grand base - massive crystal foundation
        const basePoints = [
            new THREE.Vector2(0, 0),
            new THREE.Vector2(0.56, 0),
            new THREE.Vector2(0.56, 0.14),
            new THREE.Vector2(0.52, 0.18),
            new THREE.Vector2(0.48, 0.20),
            new THREE.Vector2(0, 0.20)
        ];
        const base = this._createLatheCrystal(basePoints, 12, material);
        group.add(base);

        // Base royal ring
        const baseRingGeo = new THREE.TorusGeometry(0.52, 0.05, 6, 12);
        const baseRing = new THREE.Mesh(baseRingGeo, this.crystalGold);
        baseRing.rotation.x = Math.PI / 2;
        baseRing.position.y = 0.20;
        group.add(baseRing);

        // Robe - majestic crystal cloak
        const robePoints = [
            new THREE.Vector2(0, 0.20),
            new THREE.Vector2(0.44, 0.22),
            new THREE.Vector2(0.40, 0.40),
            new THREE.Vector2(0.32, 0.70),
            new THREE.Vector2(0.28, 0.90),
            new THREE.Vector2(0, 0.90)
        ];
        const robe = this._createLatheCrystal(robePoints, 12, material);
        group.add(robe);

        // Shoulder crystals - faceted icosahedrons
        const shoulderGeo = this.getCachedGeometry('king_shoulder', () => {
            const geo = new THREE.IcosahedronGeometry(0.18, 0);
            geo.scale(1, 0.6, 0.8);
            return geo;
        });

        const shoulderL = new THREE.Mesh(shoulderGeo, material);
        shoulderL.position.set(-0.30, 0.78, 0);
        group.add(shoulderL);

        const shoulderR = new THREE.Mesh(shoulderGeo, material);
        shoulderR.position.set(0.30, 0.78, 0);
        group.add(shoulderR);

        // Chest crystal - large central gem
        const chestGeo = new THREE.OctahedronGeometry(0.10, 0);
        const chest = new THREE.Mesh(chestGeo, color === 'white' ? this.crystalIce : this.crystalRuby);
        chest.position.set(0, 0.72, 0.18);
        group.add(chest);

        // Crown base - thick golden crystal torus
        const crownBaseGeo = new THREE.TorusGeometry(0.28, 0.045, 6, 12);
        const crownBase = new THREE.Mesh(crownBaseGeo, this.crystalGold);
        crownBase.rotation.x = Math.PI / 2;
        crownBase.position.y = 1.02;
        group.add(crownBase);

        // Crown - 8 majestic points with alternating crystals
        const crownPoints = 8;
        for (let i = 0; i < crownPoints; i++) {
            const angle = (i / crownPoints) * Math.PI * 2;
            const r = 0.28;
            const x = Math.cos(angle) * r;
            const z = Math.sin(angle) * r;

            // Main spike - tall crystal
            const spikeGeo = new THREE.ConeGeometry(0.06, 0.28, 4);
            const spike = new THREE.Mesh(spikeGeo, i % 2 === 0 ? this.crystalGold : material);
            spike.position.set(x, 1.18, z);
            group.add(spike);

            // Small gem on top of each spike
            const gemGeo = new THREE.IcosahedronGeometry(0.04, 0);
            const gemMat = i % 2 === 0 ? this.crystalRuby : this.crystalIce;
            const gem = new THREE.Mesh(gemGeo, gemMat);
            gem.position.set(x, 1.36, z);
            group.add(gem);
        }

        // Central king's orb - massive crystal
        const orbGeo = this.getCachedGeometry('king_orb', () => {
            return new THREE.IcosahedronGeometry(0.14, 2);
        });
        const orb = new THREE.Mesh(orbGeo, color === 'white' ? this.crystalIce : this.crystalGold);
        orb.position.y = 1.18;
        group.add(orb);

        // Royal cross - crystal cross with beveled edges
        const crossGroup = new THREE.Group();
        crossGroup.position.y = 1.45;

        const crossVGeo = new THREE.BoxGeometry(0.06, 0.32, 0.06);
        const crossV = new THREE.Mesh(crossVGeo, this.crystalGold);
        crossGroup.add(crossV);

        const crossHGeo = new THREE.BoxGeometry(0.22, 0.06, 0.06);
        const crossH = new THREE.Mesh(crossHGeo, this.crystalGold);
        crossGroup.add(crossH);

        // Cross center jewel
        const crossJewelGeo = new THREE.OctahedronGeometry(0.05, 0);
        const crossJewel = new THREE.Mesh(crossJewelGeo, this.crystalRuby);
        crossGroup.add(crossJewel);

        group.add(crossGroup);

        // Floating aura crystals
        for (let i = 0; i < 4; i++) {
            const auraGeo = new THREE.TetrahedronGeometry(0.05, 0);
            const aura = new THREE.Mesh(auraGeo, this.crystalIce);
            const angle = (i / 4) * Math.PI * 2;
            aura.position.set(
                Math.cos(angle) * 0.55,
                0.60 + (i % 2) * 0.3,
                Math.sin(angle) * 0.55
            );
            aura.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
            group.add(aura);
        }

        return group;
    }
}
