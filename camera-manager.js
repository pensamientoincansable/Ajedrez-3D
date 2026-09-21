import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class CameraManager {
    constructor(camera, domElement) {
        this.camera = camera;
        this.controls = new OrbitControls(camera, domElement);
        this.init();
    }

    init() {
        // Professional camera settings
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.enablePan = false;
        this.controls.minDistance = 4;
        this.controls.maxDistance = 18;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.08;
        this.controls.minPolarAngle = Math.PI * 0.15;
        this.controls.autoRotate = false;
        this.controls.autoRotateSpeed = 0.3;
        this.controls.enableZoom = true;
        this.controls.zoomSpeed = 0.8;
        this.controls.rotateSpeed = 0.7;

        // Smooth orbit
        this.controls.target.set(0, 0, 0);
        
        this.setInitialView();
        window.addEventListener('resize', () => this.handleResize());
    }

    setInitialView() {
        const isMobile = window.innerWidth < 768;
        const isTablet = window.innerWidth < 1024;

        if (isMobile) {
            this.camera.position.set(0, 11, 7);
        } else if (isTablet) {
            this.camera.position.set(0, 9.5, 8.5);
        } else {
            // Cinematic angle for crystal pieces
            this.camera.position.set(2.5, 8.5, 8.5);
        }

        this.camera.lookAt(0, 0, 0);
        this.controls.target.set(0, 0.2, 0);
        this.controls.update();
    }

    setViewForColor(color) {
        // Adjust camera for player color
        if (color === 'black') {
            this.camera.position.set(-2.5, 8.5, -8.5);
        } else {
            this.camera.position.set(2.5, 8.5, 8.5);
        }
        this.controls.target.set(0, 0.2, 0);
        this.controls.update();
    }

    handleResize() {
        const isMobile = window.innerWidth < 768;
        if (isMobile) {
            this.controls.maxDistance = 15;
        } else {
            this.controls.maxDistance = 18;
        }
    }

    update() {
        this.controls.update();
    }

    // Cinematic intro animation
    playIntroAnimation() {
        const startPos = new THREE.Vector3(0, 20, 0);
        const endPos = this.camera.position.clone();
        const duration = 2000;
        const startTime = performance.now();

        this.camera.position.copy(startPos);

        const animate = (now) => {
            const elapsed = now - startTime;
            const t = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3);

            this.camera.position.lerpVectors(startPos, endPos, eased);
            this.camera.lookAt(0, 0, 0);

            if (t < 1) {
                requestAnimationFrame(animate);
            }
        };
        requestAnimationFrame(animate);
    }
}
