import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class CameraManager {
    constructor(camera, domElement) {
        this.camera = camera;
        this.controls = new OrbitControls(camera, domElement);
        this.userHasMovedCamera = false;
        this.init();
    }

    init() {
        // Professional camera settings
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.enablePan = false;
        this.controls.minDistance = 4;
        this.controls.maxDistance = 26;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.08;
        this.controls.minPolarAngle = Math.PI * 0.12;
        this.controls.autoRotate = false;
        this.controls.autoRotateSpeed = 0.3;
        this.controls.enableZoom = true;
        this.controls.zoomSpeed = 0.9;
        this.controls.rotateSpeed = 0.7;

        // Pinch-zoom friendly on touch devices
        this.controls.touches = {
            ONE: THREE.TOUCH.ROTATE,
            TWO: THREE.TOUCH.DOLLY_PAN
        };

        // Smooth orbit
        this.controls.target.set(0, 0, 0);

        // Track manual camera moves so resize never snaps the view back
        this.controls.addEventListener('start', () => {
            this.userHasMovedCamera = true;
        });

        this.applyResponsiveSettings();
        this.setInitialView();
        window.addEventListener('resize', () => this.handleResize());
        window.addEventListener('orientationchange', () => {
            // Orientation needs a beat for innerWidth/Height to settle
            setTimeout(() => this.handleResize(), 150);
        });
    }

    getDeviceProfile() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const aspect = w / Math.max(h, 1);
        const isPortrait = aspect < 1;
        const isLandscapePhone = !isPortrait && h <= 500;
        const isMobile = w < 768;
        const isTablet = w >= 768 && w < 1200;
        const isDesktop = w >= 1200 && w < 1600;
        const isTV = w >= 1600 || (w >= 1280 && h >= 800 && window.devicePixelRatio <= 1.25 && Math.max(w, h) >= 1920);
        return { w, h, aspect, isPortrait, isLandscapePhone, isMobile, isTablet, isDesktop, isTV };
    }

    applyResponsiveSettings() {
        const p = this.getDeviceProfile();

        // FOV adapts to aspect ratio so the whole board always fits:
        // portrait phones need a wider frustum, TVs a slightly narrower one.
        let fov = 42;
        if (p.aspect < 0.7) fov = 64;
        else if (p.aspect < 0.9) fov = 58;
        else if (p.aspect < 1.1) fov = 50;
        else if (p.aspect < 1.4) fov = 45;
        else fov = 42;
        if (p.isLandscapePhone) fov = Math.max(fov, 48);
        if (p.isTV) fov = 40;

        this.camera.fov = fov;
        this.camera.aspect = p.aspect;
        this.camera.updateProjectionMatrix();

        // Generous max zoom-out distance on every device
        if (p.isTV) this.controls.maxDistance = 30;
        else if (p.isDesktop) this.controls.maxDistance = 26;
        else if (p.isTablet) this.controls.maxDistance = 25;
        else this.controls.maxDistance = 24;

        // Touch devices get slightly slower rotation for precision
        this.controls.rotateSpeed = p.isMobile ? 0.55 : 0.7;
    }

    setInitialView() {
        const p = this.getDeviceProfile();

        if (p.aspect < 0.7) {
            // Portrait phones: high + far so the full board fits
            this.camera.position.set(0, 14, 10.5);
        } else if (p.aspect < 1.1) {
            // Square-ish / tablet portrait
            this.camera.position.set(0, 11.5, 9.5);
        } else if (p.isMobile || p.isLandscapePhone) {
            // Landscape phones
            this.camera.position.set(0, 10, 9);
        } else if (p.isTablet) {
            this.camera.position.set(0, 9.5, 8.5);
        } else if (p.isTV) {
            // TVs: pulled back cinematic view
            this.camera.position.set(3, 9.5, 10);
        } else {
            // Cinematic angle for crystal pieces
            this.camera.position.set(2.5, 8.5, 8.5);
        }

        this.camera.lookAt(0, 0, 0);
        this.controls.target.set(0, 0.2, 0);
        this.controls.update();
        this.userHasMovedCamera = false;
    }

    setViewForColor(color) {
        // Adjust camera for player color, keeping responsive distance
        const dist = this.camera.position.distanceTo(this.controls.target);
        const dir = color === 'black' ? -1 : 1;
        const base = new THREE.Vector3(2.5 * dir, 8.5, 8.5 * dir).normalize();
        this.camera.position.copy(this.controls.target).addScaledVector(base, dist);
        this.camera.lookAt(this.controls.target);
        this.controls.update();
    }

    handleResize() {
        this.applyResponsiveSettings();
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
