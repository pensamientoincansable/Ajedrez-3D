import * as THREE from 'three';

export class PieceFactory {
    constructor() {
        this.materials = {
            white: new THREE.MeshStandardMaterial({
                color: 0xffffff,
                roughness: 0.25,
                metalness: 0.6,
                envMapIntensity: 0.8
            }),
            black: new THREE.MeshStandardMaterial({
                color: 0x1a1a1a,
                roughness: 0.3,
                metalness: 0.7,
                envMapIntensity: 0.8
            })
        };

        // Accent materials for detail
        this.goldMaterial = new THREE.MeshStandardMaterial({
            color: 0xffd700,
            roughness: 0.2,
            metalness: 0.9
        });
        this.redMaterial = new THREE.MeshStandardMaterial({
            color: 0x8b0000,
            roughness: 0.4,
            metalness: 0.1
        });
    }

    createPiece(type, color) {
        let mesh;
        const material = color === 'white' ? this.materials.white : this.materials.black;

        switch (type) {
            case 'pawn':
                mesh = this._createPawn(material);
                break;
            case 'rook':
                mesh = this._createRook(material);
                break;
            case 'knight':
                mesh = this._createKnight(material);
                break;
            case 'bishop':
                mesh = this._createBishop(material);
                break;
            case 'queen':
                mesh = this._createQueen(material);
                break;
            case 'king':
                mesh = this._createKing(material);
                break;
            default:
                console.error('Unknown piece type:', type);
                return null;
        }

        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = {
            type: 'piece',
            pieceType: type,
            color: color
        };

        return mesh;
    }

    _createPawn(material) {
        const group = new THREE.Group();

        // Wide elegant base
        const baseGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.12, 24);
        const base = new THREE.Mesh(baseGeo, material);
        base.position.y = 0.06;
        group.add(base);

        // Base rim
        const rimGeo = new THREE.TorusGeometry(0.42, 0.025, 8, 24);
        const rim = new THREE.Mesh(rimGeo, material);
        rim.rotation.x = Math.PI / 2;
        rim.position.y = 0.12;
        group.add(rim);

        // Lower body (bell-shaped)
        const bodyGeo = new THREE.CylinderGeometry(0.18, 0.32, 0.4, 16);
        const body = new THREE.Mesh(bodyGeo, material);
        body.position.y = 0.4;
        group.add(body);

        // Upper body taper
        const upperGeo = new THREE.CylinderGeometry(0.12, 0.18, 0.25, 16);
        const upper = new THREE.Mesh(upperGeo, material);
        upper.position.y = 0.68;
        group.add(upper);

        // Neck ring
        const ringGeo = new THREE.TorusGeometry(0.12, 0.02, 8, 16);
        const ring = new THREE.Mesh(ringGeo, material);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = 0.68;
        group.add(ring);

        // Head sphere
        const headGeo = new THREE.SphereGeometry(0.14, 16, 16);
        const head = new THREE.Mesh(headGeo, material);
        head.position.y = 0.88;
        head.scale.set(1, 0.85, 1);
        group.add(head);

        return group;
    }

    _createRook(material) {
        const group = new THREE.Group();

        // Wide base
        const baseGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.15, 20);
        const base = new THREE.Mesh(baseGeo, material);
        base.position.y = 0.075;
        group.add(base);

        const rimGeo = new THREE.TorusGeometry(0.45, 0.03, 8, 20);
        const rim = new THREE.Mesh(rimGeo, material);
        rim.rotation.x = Math.PI / 2;
        rim.position.y = 0.15;
        group.add(rim);

        // Main tower body
        const towerGeo = new THREE.CylinderGeometry(0.3, 0.38, 0.65, 16);
        const tower = new THREE.Mesh(towerGeo, material);
        tower.position.y = 0.55;
        group.add(tower);

        // Crenellations (merlons)
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2;
            const merlonGeo = new THREE.BoxGeometry(0.08, 0.18, 0.08);
            const merlon = new THREE.Mesh(merlonGeo, material);
            merlon.position.set(
                Math.cos(angle) * 0.34,
                0.9,
                Math.sin(angle) * 0.34
            );
            group.add(merlon);
        }

        // Top flat cap
        const capGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.06, 16);
        const cap = new THREE.Mesh(capGeo, material);
        cap.position.y = 0.99;
        group.add(cap);

        // Gold finial on top
        const finialGeo = new THREE.ConeGeometry(0.08, 0.15, 8);
        const finial = new THREE.Mesh(finialGeo, this.goldMaterial);
        finial.position.y = 1.1;
        group.add(finial);

        return group;
    }

    _createKnight(material) {
        const group = new THREE.Group();

        // Base
        const baseGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.15, 20);
        const base = new THREE.Mesh(baseGeo, material);
        base.position.y = 0.075;
        group.add(base);

        const rimGeo = new THREE.TorusGeometry(0.42, 0.025, 8, 20);
        const rim = new THREE.Mesh(rimGeo, material);
        rim.rotation.x = Math.PI / 2;
        rim.position.y = 0.15;
        group.add(rim);

        // Main body (curved torso)
        const torsoGeo = new THREE.CylinderGeometry(0.22, 0.3, 0.5, 12);
        const torso = new THREE.Mesh(torsoGeo, material);
        torso.position.y = 0.48;
        torso.rotation.z = -0.15;
        group.add(torso);

        // Horse head
        const neckGeo = new THREE.CylinderGeometry(0.12, 0.18, 0.25, 10);
        const neck = new THREE.Mesh(neckGeo, material);
        neck.position.set(0.08, 0.72, -0.18);
        neck.rotation.x = -0.3;
        neck.rotation.z = 0.2;
        group.add(neck);

        // Head of the horse
        const headGeo = new THREE.SphereGeometry(0.14, 12, 12);
        const head = new THREE.Mesh(headGeo, material);
        head.position.set(0.08, 0.88, -0.22);
        head.scale.set(1, 0.8, 1.4);
        group.add(head);

        // Ear
        const earGeo = new THREE.ConeGeometry(0.05, 0.1, 6);
        const ear = new THREE.Mesh(earGeo, material);
        ear.position.set(0.13, 0.96, -0.18);
        ear.rotation.x = -0.3;
        group.add(ear);

        // Eye (gold detail)
        const eyeGeo = new THREE.SphereGeometry(0.03, 8, 8);
        const eye = new THREE.Mesh(eyeGeo, this.goldMaterial);
        eye.position.set(0.12, 0.87, -0.18);
        group.add(eye);

        // Legs
        const legPositions = [
            [-0.15, 0.25, -0.12],
            [0.15, 0.25, -0.12],
            [-0.15, 0.25, 0.12],
            [0.15, 0.25, 0.12]
        ];

        for (const pos of legPositions) {
            const legGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.2, 8);
            const leg = new THREE.Mesh(legGeo, material);
            leg.position.set(pos[0], pos[1], pos[2]);
            leg.rotation.z = (pos[0] > 0 ? 0.1 : -0.1);
            leg.rotation.x = (pos[2] > 0 ? 0.1 : -0.1);
            group.add(leg);
        }

        return group;
    }

    _createBishop(material) {
        const group = new THREE.Group();

        // Base
        const baseGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.15, 20);
        const base = new THREE.Mesh(baseGeo, material);
        base.position.y = 0.075;
        group.add(base);

        const rimGeo = new THREE.TorusGeometry(0.42, 0.025, 8, 20);
        const rim = new THREE.Mesh(rimGeo, material);
        rim.rotation.x = Math.PI / 2;
        rim.position.y = 0.15;
        group.add(rim);

        // Slender body
        const bodyGeo = new THREE.CylinderGeometry(0.12, 0.28, 0.7, 12);
        const body = new THREE.Mesh(bodyGeo, material);
        body.position.y = 0.5;
        group.add(body);

        // Band around body
        const bandGeo = new THREE.TorusGeometry(0.15, 0.025, 8, 12);
        const band = new THREE.Mesh(bandGeo, this.goldMaterial);
        band.rotation.x = Math.PI / 2;
        band.position.y = 0.45;
        group.add(band);

        // Mitre top (bishop crown)
        const mitreLowerGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.12, 12);
        const mitreLower = new THREE.Mesh(mitreLowerGeo, material);
        mitreLower.position.y = 0.88;
        group.add(mitreLower);

        // Slit in mitre
        const slitGeo = new THREE.BoxGeometry(0.04, 0.06, 0.16);
        const slit = new THREE.Mesh(slitGeo, this.goldMaterial);
        slit.position.set(0, 0.92, 0.1);
        group.add(slit);

        // Peak
        const peakGeo = new THREE.ConeGeometry(0.06, 0.15, 8);
        const peak = new THREE.Mesh(peakGeo, material);
        peak.position.set(0, 1.04, 0.15);
        peak.rotation.x = 0.2;
        group.add(peak);

        // Cross on top
        const crossVGeo = new THREE.BoxGeometry(0.03, 0.14, 0.03);
        const crossV = new THREE.Mesh(crossVGeo, this.goldMaterial);
        crossV.position.set(0, 1.04, 0.15);
        group.add(crossV);

        const crossHGeo = new THREE.BoxGeometry(0.08, 0.03, 0.03);
        const crossH = new THREE.Mesh(crossHGeo, this.goldMaterial);
        crossH.position.set(0, 1.04, 0.15);
        group.add(crossH);

        return group;
    }

    _createQueen(material) {
        const group = new THREE.Group();

        // Wide majestic base
        const baseGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.18, 24);
        const base = new THREE.Mesh(baseGeo, material);
        base.position.y = 0.09;
        group.add(base);

        const rimGeo = new THREE.TorusGeometry(0.48, 0.03, 8, 24);
        const rim = new THREE.Mesh(rimGeo, material);
        rim.rotation.x = Math.PI / 2;
        rim.position.y = 0.18;
        group.add(rim);

        // Lower crown tier
        const tier1Geo = new THREE.CylinderGeometry(0.35, 0.42, 0.15, 12);
        const tier1 = new THREE.Mesh(tier1Geo, material);
        tier1.position.y = 0.45;
        group.add(tier1);

        // Middle tier
        const tier2Geo = new THREE.CylinderGeometry(0.28, 0.35, 0.15, 12);
        const tier2 = new THREE.Mesh(tier2Geo, material);
        tier2.position.y = 0.68;
        group.add(tier2);

        // Crown points (5 points around)
        const crownPoints = [
            [0, 0.08, -0.31],
            [0.27, 0.08, 0.08],
            [-0.27, 0.08, 0.08],
            [0.19, 0.08, -0.23],
            [-0.19, 0.08, -0.23]
        ];

        for (const pos of crownPoints) {
            const pointGeo = new THREE.ConeGeometry(0.04, 0.14, 6);
            const point = new THREE.Mesh(pointGeo, material);
            point.position.set(pos[0], 0.8, pos[2]);
            point.rotation.x = -pos[1] * 0.3;
            group.add(point);
        }

        // Central orb
        const orbGeo = new THREE.SphereGeometry(0.1, 12, 12);
        const orb = new THREE.Mesh(orbGeo, this.goldMaterial);
        orb.position.y = 0.82;
        group.add(orb);

        // Upper body
        const bodyGeo = new THREE.CylinderGeometry(0.2, 0.28, 0.5, 12);
        const body = new THREE.Mesh(bodyGeo, material);
        body.position.y = 1.1;
        group.add(body);

        // Scepter (small)
        const scepterGeo = new THREE.CylinderGeometry(0.03, 0.04, 0.3, 6);
        const scepter = new THREE.Mesh(scepterGeo, this.goldMaterial);
        scepter.position.set(0.25, 1.05, 0);
        group.add(scepter);

        // Scepter top
        const scepterTopGeo = new THREE.SphereGeometry(0.04, 8, 8);
        const scepterTop = new THREE.Mesh(scepterTopGeo, this.goldMaterial);
        scepterTop.position.set(0.25, 1.2, 0);
        group.add(scepterTop);

        return group;
    }

    _createKing(material) {
        const group = new THREE.Group();

        // Grand base
        const baseGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.2, 24);
        const base = new THREE.Mesh(baseGeo, material);
        base.position.y = 0.1;
        group.add(base);

        const rimGeo = new THREE.TorusGeometry(0.5, 0.035, 8, 24);
        const rim = new THREE.Mesh(rimGeo, material);
        rim.rotation.x = Math.PI / 2;
        rim.position.y = 0.2;
        group.add(rim);

        // Body
        const bodyGeo = new THREE.CylinderGeometry(0.28, 0.38, 0.9, 12);
        const body = new THREE.Mesh(bodyGeo, material);
        body.position.y = 0.65;
        group.add(body);

        // Shoulders
        const shoulderGeo = new THREE.SphereGeometry(0.22, 12, 12);
        const shoulderL = new THREE.Mesh(shoulderGeo, material);
        shoulderL.position.set(-0.28, 0.7, 0);
        shoulderL.scale.set(0.8, 0.4, 1);
        group.add(shoulderL);

        const shoulderR = new THREE.Mesh(shoulderGeo, material);
        shoulderR.position.set(0.28, 0.7, 0);
        shoulderR.scale.set(0.8, 0.4, 1);
        group.add(shoulderR);

        // Crown base ring
        const crownRingGeo = new THREE.TorusGeometry(0.28, 0.03, 8, 12);
        const crownRing = new THREE.Mesh(crownRingGeo, this.goldMaterial);
        crownRing.rotation.x = Math.PI / 2;
        crownRing.position.y = 1.1;
        group.add(crownRing);

        // Crown points (7 points)
        const kingPoints = [
            [0, 0.1, -0.32],
            [0.25, 0.1, -0.17],
            [-0.25, 0.1, -0.17],
            [0.25, 0.1, 0.17],
            [-0.25, 0.1, 0.17],
            [0.15, 0.1, 0.28],
            [-0.15, 0.1, 0.28]
        ];

        for (const pos of kingPoints) {
            const pointGeo = new THREE.ConeGeometry(0.05, 0.2, 6);
            const point = new THREE.Mesh(pointGeo, material);
            point.position.set(pos[0], 1.2, pos[2]);
            point.rotation.x = -pos[1] * 0.4;
            group.add(point);
        }

        // Central orb
        const orbGeo = new THREE.SphereGeometry(0.09, 12, 12);
        const orb = new THREE.Mesh(orbGeo, this.goldMaterial);
        orb.position.y = 1.24;
        group.add(orb);

        // Large cross
        const crossVGeo = new THREE.BoxGeometry(0.05, 0.28, 0.05);
        const crossV = new THREE.Mesh(crossVGeo, this.goldMaterial);
        crossV.position.y = 1.38;
        group.add(crossV);

        const crossHGeo = new THREE.BoxGeometry(0.2, 0.05, 0.05);
        const crossH = new THREE.Mesh(crossHGeo, this.goldMaterial);
        crossH.position.y = 1.38;
        group.add(crossH);

        return group;
    }
}
