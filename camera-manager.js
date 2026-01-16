import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class CameraManager {
    constructor(camera, domElement) {
        this.camera = camera;
        this.controls = new OrbitControls(camera, domElement);

        this.init();
    }

    init() {
        // Basic configuration
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.enablePan = false;
        this.controls.minDistance = 5;
        this.controls.maxDistance = 20;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.1; // Don't go below board

        // Initial position
        this.setInitialView();

        // Handle window resize specific adjustments if needed
        window.addEventListener('resize', () => this.handleResize());
    }

    setInitialView() {
        const isMobile = window.innerWidth < 768;

        if (isMobile) {
            this.camera.position.set(0, 12, 8);
        } else {
            this.camera.position.set(0, 10, 10);
        }

        this.camera.lookAt(0, 0, 0);
        this.controls.target.set(0, 0, 0);
        this.controls.update();
    }

    handleResize() {
        // Adjust zoom limits or position if orientation changes drastically?
        // For now, OrbitControls handles aspect ratio via the renderer/camera update in main.js
    }

    update() {
        this.controls.update();
    }
}
