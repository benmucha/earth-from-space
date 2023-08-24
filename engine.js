
import * as THREE from 'three';
import ThreeGlobe from 'three-globe';

/** The foundation which powers the game instance/scene. Implemented with Three.js. */
class EngineScene{
    globe;
    renderer;
    scene;
    camera;
    controls;
    pointer = new THREE.Vector2();
    raycaster = new THREE.Raycaster();
    visualElementParent
    earthCenterPos = new THREE.Vector3().set(0,0,0);

    #updateCallback;

    init(visualElementParent){
        this.visualElementParent = visualElementParent;
        this.#initGlobe();
        this.#initRenderer();
        this.#initScene();
        this.#initCamera();
        this.#initControls();
        this.#initRaycasting();
    }

    #initGlobe(){
        this.globe = new ThreeGlobe()
        .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
        .objectFacesSurface(false);
        
        this.#fixThreeGlobeRenderingSettings();
    }
    
    #fixThreeGlobeRenderingSettings(){
        // Set altitude accessors, as these aren't set automatically:
        this.globe
        .objectAltitude(obj => {
            return obj.alt;
        })
        .pathPointAlt(pnt => {
            return pnt[2];
        })
        .pathTransitionDuration(0); // transition duration needs to be 0 in order to show when paths are set every frame.
    }

    #initRenderer(){
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.visualElementParent.appendChild(this.renderer.domElement);
    }

    #initScene(){
        this.scene = new THREE.Scene();
        this.scene.add(this.globe);
        this.scene.add(new THREE.AmbientLight(0xcccccc, Math.PI));
    }

    #initCamera(){
        this.camera = new THREE.PerspectiveCamera();
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.position.z = 300;
        this.camera.near = 0.1;
        this.camera.far = 10000;
        this.camera.updateProjectionMatrix();
    }

    #initControls(){
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    }

    #initRaycasting(){
        window.addEventListener('mousemove', this.#updateRaycastPointer.bind(this));
    }

    /** CODE TAKEN DIRECTLY from https://www.youtube.com/watch?v=CbUhot3K-gc */
    #updateRaycastPointer(mouseEvent) {
        this.pointer.x = (mouseEvent.clientX / window.innerWidth) * 2 - 1;
        this.pointer.y = -(mouseEvent.clientY / window.innerHeight) * 2 + 1;
    }

    onLoad(callback){
        this.globe.onGlobeReady(callback);
    }


    start(updateCallback){
        this.#updateCallback = updateCallback;
        this.#updateLoop();
    }

    #updateLoop() {
        this.controls.update();
        this.camera.updateProjectionMatrix();
        this.#correctCameraPos();

        this.raycaster.setFromCamera(this.pointer, this.camera);

        this.#updateCallback();

        this.renderer.render(this.scene, this.camera);
        requestAnimationFrame(this.#updateLoop.bind(this));
    };

    /** Repositions the camera if needed to keep it from going inside the Earth */
    #correctCameraPos(){
        // Calculate the camera's distance from the Earth's center:
        const newCameraPos = this.camera.position;
        const distance = newCameraPos.distanceTo(this.earthCenterPos);

        // Calculate the minimum distance that the camera should be from the Earth's center:
        const cameraDistanceFromSurfaceMargin = 0.5;
        const minDistance = this.globe.getGlobeRadius() + cameraDistanceFromSurfaceMargin;

        // If the camera is inside the earth, then reposition to be on the surface:
        if (distance < minDistance){
            // Calculate the vector to "push back" the camera by:
            const pushBackDirection = new THREE.Vector3().subVectors(newCameraPos, this.earthCenterPos).normalize();
            const distanceToPushBack = minDistance - distance;
            const pushBackDelta = pushBackDirection.multiplyScalar(distanceToPushBack);

            // Adjust the camera position by the "push back" vector:
            const adjustedCameraPos = newCameraPos.add(pushBackDelta);
            this.camera.position.set(adjustedCameraPos.x, adjustedCameraPos.y, adjustedCameraPos.z);
            this.camera.updateProjectionMatrix();
        }
    }
}

export { EngineScene as default };
