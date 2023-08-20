
/** The foundation which powers the game instance/scene. Implemented with Three.js. */
class EngineScene{
    globe;
    renderer;
    scene;
    camera;
    controls;

    #updateCallback;

    init(visualElementParent){
        this.#initGlobe();
        this.#initRenderer(visualElementParent);
        this.#initScene();
        this.#initCamera();
        this.#initControls();
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

    #initRenderer(visualElementParent){
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        visualElementParent.appendChild(this.renderer.domElement);
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


    onLoad(callback){
        this.globe.onGlobeReady(callback);
    }


    start(updateCallback){
        this.#updateCallback = updateCallback;
        this.#updateLoop();
    }

    #updateLoop() {
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
        this.camera.updateProjectionMatrix();

        this.#updateCallback();

        requestAnimationFrame(this.#updateLoop.bind(this));
    };
}

export { EngineScene as default };
