
import './index.css';

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import * as helper from './helper.js';
import EngineScene from './engine.js';
import EventHandler from './event-handler.js';
import SharedState from './shared-state.js';
import SatellitesController from './satellites-controller.js';
import IssController from './iss-controller.js';
import * as satellite from 'satellite.js'; 

Object.assign(THREE, { OrbitControls });


const engine = new EngineScene();
const eventHandler = new EventHandler(engine);
const state = new SharedState(engine);
const satellitesController = new SatellitesController(state, eventHandler);
const issController = new IssController(state, eventHandler);

let threeGlobeObjs;

/** Entry point. */
function onPageLoad(){
    engine.init(document.getElementById('rendererContainer'));
    engine.onLoad(start);
    eventHandler.init();
}

window.addEventListener('load', onPageLoad);


async function start(){
    await init();
    engine.start(update);
}

async function init(){
    // Subscribe the globe as a raycast target just so that it blocks raycasts from going through the globe:
    eventHandler.subscribeRaycastTargets(null, null, null, null, engine.globe);

    await issController.initIss();
    const issThreeGlobeObjs = issController.getIssObjectsData();

    await satellitesController.initSatellites();
    const satellitesInstancedMesh = satellitesController.makeSatellitesInstancedMesh();

    // TODO refactor - scary coupling.
    threeGlobeObjs = issThreeGlobeObjs;
    integratePathVisuals();
    integrateThreeGlobeObjectVisuals();
    integrateRawThreeJsObjectVisuals(satellitesInstancedMesh);
}

function integratePathVisuals(){
    engine.globe.pathColor((pathData) => {
        // Currently the ISS path is the only ThreeGlobe path:
        return issController.getIssPathColors(pathData.id);
    });
}

function integrateThreeGlobeObjectVisuals(){
    engine.globe.objectThreeObject((obj) => {
        // Currently the ISS is the only ThreeGlobe object:
        return issController.getIssThreeObject(obj.typeId);
    });
}

function integrateRawThreeJsObjectVisuals(satellitesInstancedMesh){
    engine.scene.add(satellitesInstancedMesh);
}


function update(){
    updatePaths();
    updateThreeGlobeObjs();
    issController.updateIss();
    satellitesController.updateSatellites();
    eventHandler.updateHoverTarget();
}

function updatePaths(){
    const issPaths = issController.getIssPaths();
    engine.globe.pathsData(issPaths);
}

function updateThreeGlobeObjs(){
    const time = new Date();
    const gmst = satellite.gstime(time);

    for (const obj of threeGlobeObjs){
        const latLngAlt = helper.getRenderingLatLngAlt(time, gmst, obj.satrec);
        obj.lat = latLngAlt.lat;
        obj.lng = latLngAlt.lng;
        obj.alt = latLngAlt.alt;
    }

    engine.globe.objectsData(threeGlobeObjs);
}
