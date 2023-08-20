// import { TrackballControls } from 'https://unpkg.com/three/examples/jsm/controls/TrackballControls.js';
import { OrbitControls } from 'https://unpkg.com/three/examples/jsm/controls/OrbitControls.js';
Object.assign(THREE, { OrbitControls });


const EARTH_RADIUS_KM = 6371;
const ISS_SIZE_KM = 100;
const SATELLITE_SIZE_KM = 50;

let nextId = 1;

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
camera.position.z = 300;
camera.near = 0.1;
camera.far = 10000;
camera.updateProjectionMatrix();

// Add camera controls:
const controls = new THREE.OrbitControls(camera, renderer.domElement);

// Add ISS mesh:
const issGeometry = new THREE.OctahedronGeometry(ISS_SIZE_KM * globe.getGlobeRadius() / EARTH_RADIUS_KM / 2, 0);
const issMaterial = new THREE.MeshLambertMaterial({ color: 'black', transparent: false, opacity: 1 });

// Add Satellite mesh:
const satelliteGeometry = new THREE.OctahedronGeometry(SATELLITE_SIZE_KM * globe.getGlobeRadius() / EARTH_RADIUS_KM / 2, 0);
const satelliteMaterial = new THREE.MeshLambertMaterial({ color: 'grey', transparent: false, opacity: 1 });
// (Satellites use a single InstancedMesh for performance):
const satelliteMesh = new THREE.InstancedMesh(satelliteGeometry, satelliteMaterial, 30000);
satelliteMesh.frustumCulled = false; // meshes disappear at certain camera rotations/distances with frustrum culling.
scene.add(satelliteMesh);

// Add object meshes:
globe.objectThreeObject((obj) => {
    switch (obj.typeId){
        case ISS_TYPE_ID:
            return new THREE.Mesh(issGeometry, issMaterial);
    }
});

// Set altitude accessors, as these aren't set automatically:
globe
.objectAltitude(obj => {
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

let satelliteObjs = [];

var tempMatrixHelperObj = new THREE.Object3D();

axios.get('https://celestrak.org/pub/TLE/catalog.txt')
.then((res) => {
    const satelliteTles = res.data;
    const satelliteTleLines = satelliteTles.split(/\n/);

    const time = new Date();
    const gmst = satellite.gstime(time);

    let i = 0;
    while (i < satelliteTleLines.length){
        const satelliteName = satelliteTleLines[i++];
        const satelliteTleLine1 = satelliteTleLines[i++]
        const satelliteTleLine2 = satelliteTleLines[i++]
        if (!satelliteTleLine1 || !satelliteTleLine2){
            continue;
        }
        const satelliteSatrec = satellite.twoline2satrec(satelliteTleLine1, satelliteTleLine2);

        // Skip bad satellite data:
        try {
            getLatLngAlt(time, gmst, satelliteSatrec);
        }
        catch (err){
            continue;
        }

        const satelliteObj = {
            id: nextId++,
            satrec: satelliteSatrec
        };
        satelliteObjs.push(satelliteObj);
    }
});

axios.get('https://live.ariss.org/iss.txt')
.then((res) => {
    const issTle = res.data;
    const tleLines = issTle.split(/\n/);
    const tleLine1 = tleLines[1];
    const tleLine2 = tleLines[2];    

    issSatrec = satellite.twoline2satrec(tleLine1, tleLine2);

    const issObj = {
        typeId: ISS_TYPE_ID,
        id: nextId++,
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

function updateSatelliteObjs(){
    const time = new Date();
    const gmst = satellite.gstime(time);
    
    for (let i = 0; i < satelliteObjs.length; i++){
        const obj = satelliteObjs[i];
        const latLngAlt = getLatLngAlt(time, gmst, obj.satrec);
        const coords = globe.getCoords(latLngAlt.lat, latLngAlt.lng, latLngAlt.alt);
        tempMatrixHelperObj.position.set(coords.x, coords.y, coords.z);
        tempMatrixHelperObj.updateMatrix();
        satelliteMesh.setMatrixAt(i, tempMatrixHelperObj.matrix)
    }

    satelliteMesh.instanceMatrix.needsUpdate = true;
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

let lastSatelliteUpdateTime = new Date();

// Start update/render loop:
(function update() {
    controls.update();
    renderer.render(scene, camera);
    camera.updateProjectionMatrix();

    updateThreeGlobeObjs();
    updateIssPath();

    // only update satellites every second (to improve performance):
    const currentTime = new Date();
    if (currentTime.getTime() - lastSatelliteUpdateTime.getTime() >= 1000){
        updateSatelliteObjs();
        lastSatelliteUpdateTime = currentTime;
    }

    console.log(threeGlobeObjs.length)
    requestAnimationFrame(update);
})();
