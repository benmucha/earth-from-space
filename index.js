// import { TrackballControls } from 'https://unpkg.com/three/examples/jsm/controls/TrackballControls.js';
import { OrbitControls } from 'https://unpkg.com/three/examples/jsm/controls/OrbitControls.js';
Object.assign(THREE, { OrbitControls });

const globe = new ThreeGlobe()
.globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
.objectFacesSurface(false);

// Add renderer:
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('rendererContainer').appendChild(renderer.domElement);

// Add scene:
const scene = new THREE.Scene();
scene.add(globe);
scene.add(new THREE.AmbientLight(0xcccccc, Math.PI));

// Add camera:
const camera = new THREE.PerspectiveCamera();
camera.aspect = window.innerWidth / window.innerHeight;
camera.updateProjectionMatrix();
camera.position.z = 300;

// Add camera controls:
const controls = new THREE.OrbitControls(camera, renderer.domElement);

// Start update/render loop:
(function update() {
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(update);
})();