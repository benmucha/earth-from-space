// import { TrackballControls } from 'https://unpkg.com/three/examples/jsm/controls/TrackballControls.js';
import { OrbitControls } from 'https://unpkg.com/three/examples/jsm/controls/OrbitControls.js';
Object.assign(THREE, { OrbitControls });


const EARTH_RADIUS_KM = 6371;
const ISS_SIZE_KM = 100;

const globe = new ThreeGlobe()
.globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
.objectFacesSurface(false);


const ISS_PAST_PATH_ID = 'ISS_PAST_PATH';
const ISS_FUTURE_PATH_ID = 'ISS_FUTURE_PATH';
const ISS_TYPE_ID = 'ISS';

// Set ISS path colors:
globe
.pathColor((pathData) => {
    switch (pathData.id){
        case ISS_PAST_PATH_ID:
            return ['rgba(70,70,70,0.0)', 'rgba(255,255,255,0.6)'];
        case ISS_FUTURE_PATH_ID:
            return ['rgba(255,255,255,0.6)', 'rgba(255,255,255,0.0)'];
    }
});

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

// Add ISS:
const issGeometry = new THREE.OctahedronGeometry(ISS_SIZE_KM * globe.getGlobeRadius() / EARTH_RADIUS_KM / 2, 0);
const issMaterial = new THREE.MeshLambertMaterial({ color: 'black', transparent: false, opacity: 1 });
globe.objectThreeObject((p) => {
    console.log("three obj: ", p);
globe.objectThreeObject((obj) => {
    console.log('three obj: ', obj);
    return new THREE.Mesh(issGeometry, issMaterial);
});

// Set altitude accessors, as these aren't set automatically:
globe.objectAltitude(obj => {
    return obj.alt;
})
.pathPointAlt(pnt => {
    return pnt[2];
})
.pathTransitionDuration(0); // transition duration needs to be 0 in order to show when paths are set every frame.


let issSatrec;
let issFuturePath = [];
let issPastPath = [];
let threeGlobeObjs = [];

axios.get('https://live.ariss.org/iss.txt')
.then((res) => {
    const issTle = res.data;
    const tleLines = issTle.split(/\n/);
    const tleLine1 = tleLines[1];
    const tleLine2 = tleLines[2];    

    issSatrec = satellite.twoline2satrec(tleLine1, tleLine2);

    const issObj = {
        typeId: ISS_TYPE_ID,
        satrec: issSatrec
    }

    threeGlobeObjs.push(issObj);
});


function updateThreeGlobeObjs(){
    const time = new Date();
    const gmst = satellite.gstime(time);

    for (const obj of threeGlobeObjs){
        const latLngAlt = getLatLngAlt(time, gmst, obj.satrec);
        obj.lat = latLngAlt.lat;
        obj.lng = latLngAlt.lng;
        obj.alt = latLngAlt.alt;
    }

    globe.objectsData(threeGlobeObjs);
}

function updateIssPath(){
    if (!issSatrec) return;

    issPastPath = makeOrbitPath(issSatrec, -5, 0);
    issPastPath.id = ISS_PAST_PATH_ID;

    issFuturePath = makeOrbitPath(issSatrec, 0, 5);
    issFuturePath.id = ISS_FUTURE_PATH_ID;

    const threeGlobePaths = [issPastPath, issFuturePath];
    globe.pathsData(threeGlobePaths);
}

function makeOrbitPath(satrec, startMinutes, endMinutes){
    const currentTime = new Date();
    const path = [];
    for (var minute = startMinutes; minute <= endMinutes; minute++){
        const time = new Date(currentTime.getTime() + minute * 60000);
        const gmst = satellite.gstime(time);
        const latLngAlt = getLatLngAlt(time, gmst, satrec);
        path.push([latLngAlt.lat, latLngAlt.lng, latLngAlt.alt]);
    }
    return path;
}

function getLatLngAlt(time, gmst, satrec){
    const eci = satellite.propagate(satrec, time);
    const gdPos = satellite.eciToGeodetic(eci.position, gmst);
    return {
        lat: satellite.radiansToDegrees(gdPos.latitude),
        lng: satellite.radiansToDegrees(gdPos.longitude),
        alt: gdPos.height / EARTH_RADIUS_KM
    } 
}


// Start update/render loop:
(function update() {
    controls.update();
    renderer.render(scene, camera);

    updateThreeGlobeObjs();
    updateIssPath();

    requestAnimationFrame(update);
})();
