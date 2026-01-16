import * as THREE from 'three';

export class PieceFactory {
    constructor() {
        this.materials = {
            white: new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 60 }),
            black: new THREE.MeshPhongMaterial({ color: 0x333333, shininess: 60 })
        };
    }

    createPiece(type, color) {
        // type: 'pawn', 'rook', 'knight', 'bishop', 'queen', 'king'
        // color: 'white' or 'black'

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

        // Metadata
        mesh.userData = {
            type: 'piece',
            pieceType: type,
            color: color
        };

        return mesh;
    }

    _createPawn(material) {
        const group = new THREE.Group();

        // Base
        const baseGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.1, 16);
        const base = new THREE.Mesh(baseGeo, material);
        base.position.y = 0.05;
        group.add(base);

        // Body
        const bodyGeo = new THREE.ConeGeometry(0.25, 0.7, 16);
        const body = new THREE.Mesh(bodyGeo, material);
        body.position.y = 0.45;
        group.add(body);

        // Head
        const headGeo = new THREE.SphereGeometry(0.2, 16, 16);
        const head = new THREE.Mesh(headGeo, material);
        head.position.y = 0.85;
        group.add(head);

        return group;
    }

    _createRook(material) {
        const group = new THREE.Group();

        const baseGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.2, 16);
        const base = new THREE.Mesh(baseGeo, material);
        base.position.y = 0.1;
        group.add(base);

        const bodyGeo = new THREE.CylinderGeometry(0.25, 0.3, 0.6, 16);
        const body = new THREE.Mesh(bodyGeo, material);
        body.position.y = 0.5;
        group.add(body);

        const headGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.3, 16);
        const head = new THREE.Mesh(headGeo, material);
        head.position.y = 0.95;
        group.add(head);

        return group;
    }

    _createKnight(material) {
        const group = new THREE.Group();

        const baseGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.2, 16);
        const base = new THREE.Mesh(baseGeo, material);
        base.position.y = 0.1;
        group.add(base);

        const bodyGeo = new THREE.BoxGeometry(0.3, 0.6, 0.2);
        const body = new THREE.Mesh(bodyGeo, material);
        body.position.y = 0.5;
        // Tilt slightly
        body.rotation.z = 0.2;
        group.add(body);

        // Head - approximate knight shape with extruded box
        const headGeo = new THREE.BoxGeometry(0.25, 0.3, 0.5);
        const head = new THREE.Mesh(headGeo, material);
        head.position.set(0, 0.9, -0.1);
        head.rotation.x = 0.5;
        group.add(head);

        return group;
    }

    _createBishop(material) {
        const group = new THREE.Group();

        const baseGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.2, 16);
        const base = new THREE.Mesh(baseGeo, material);
        base.position.y = 0.1;
        group.add(base);

        const bodyGeo = new THREE.CylinderGeometry(0.15, 0.3, 0.8, 16);
        const body = new THREE.Mesh(bodyGeo, material);
        body.position.y = 0.6;
        group.add(body);

        const headGeo = new THREE.SphereGeometry(0.25, 16, 16);
        const head = new THREE.Mesh(headGeo, material);
        head.position.y = 1.1;
        // Elongate slightly
        head.scale.y = 1.4;
        group.add(head);

        return group;
    }

    _createQueen(material) {
        const group = new THREE.Group();

        const baseGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 16);
        const base = new THREE.Mesh(baseGeo, material);
        base.position.y = 0.1;
        group.add(base);

        const bodyGeo = new THREE.CylinderGeometry(0.2, 0.35, 1.0, 16);
        const body = new THREE.Mesh(bodyGeo, material);
        body.position.y = 0.7;
        group.add(body);

        const headGeo = new THREE.SphereGeometry(0.3, 16, 16);
        const head = new THREE.Mesh(headGeo, material);
        head.position.y = 1.35;
        group.add(head);

        // Crown
        const crownGeo = new THREE.CylinderGeometry(0.35, 0.1, 0.1, 8);
        const crown = new THREE.Mesh(crownGeo, material);
        crown.position.y = 1.55;
        group.add(crown);

        return group;
    }

    _createKing(material) {
        const group = new THREE.Group();

        const baseGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 16);
        const base = new THREE.Mesh(baseGeo, material);
        base.position.y = 0.1;
        group.add(base);

        const bodyGeo = new THREE.CylinderGeometry(0.2, 0.35, 1.2, 16);
        const body = new THREE.Mesh(bodyGeo, material);
        body.position.y = 0.8;
        group.add(body);

        // Cross top
        const crossVGeo = new THREE.BoxGeometry(0.1, 0.3, 0.1);
        const crossV = new THREE.Mesh(crossVGeo, material);
        crossV.position.y = 1.6;
        group.add(crossV);

        const crossHGeo = new THREE.BoxGeometry(0.3, 0.1, 0.1);
        const crossH = new THREE.Mesh(crossHGeo, material);
        crossH.position.y = 1.6;
        group.add(crossH);

        return group;
    }
}
