
import * as THREE from 'three';
import * as helper from './helper.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as satellite from 'satellite.js';

const ISS_PAST_PATH_ID = 'ISS_PAST_PATH';
const ISS_FUTURE_PATH_ID = 'ISS_FUTURE_PATH';

const ISS_MARKER_TYPE_ID = 'ISS_MARKER';
const ISS_MODEL_TYPE_ID = 'ISS_MODEL';

const ISS_SIZE_KM = 100;

const markerNormalOpacity = 0.5;
const markerHoveredOpacity = 0.3;
const markerFocusedOpacity = 0.0;

class IssController{
    #issMarkerMesh;
    #issModelMesh;

    #$issInfoWrapper;

    #issSatrec;

    #state;
    #eventHandler;

    #hasLoadedIssText;
    #isHovered;
    #isFocused;

    constructor(state, eventHandler){
        this.#state = state;
        this.#eventHandler = eventHandler;
    }

    getIssPathColors(pathId){
        switch (pathId){
            case ISS_PAST_PATH_ID:
                return ['rgba(70,70,70,0.0)', 'rgba(255,255,255,0.6)'];
            case ISS_FUTURE_PATH_ID:
                return ['rgba(255,255,255,0.6)', 'rgba(255,255,255,0.0)'];
        }
    }

    getIssThreeObject(){
        return this.#issMarkerMesh;
    }

    getIssPaths(){
        if (!this.#issSatrec) return;
    
        const issPastPath = helper.makeOrbitPath(this.#issSatrec, -5, 0);
        issPastPath.id = ISS_PAST_PATH_ID;
    
        const issFuturePath = helper.makeOrbitPath(this.#issSatrec, 0, 5);
        issFuturePath.id = ISS_FUTURE_PATH_ID;
    
        return [issPastPath, issFuturePath];
    }

    async initIss(){
        await this.#initIssData();
        this.#initIssMarkerMesh();
        this.#loadIssModel();

        this.#$issInfoWrapper = $('#iss-info-wrapper');
    }

    async #loadIssModel(){
        this.#issModelMesh = await new Promise(resolve => {
            var loader = new GLTFLoader();
            loader.load('./resources/ISS_stationary.glb', (gltf) => {
                const issModel = gltf.scene;

                const box = new THREE.Box3().setFromObject(issModel); 
                const size = box.getSize(new THREE.Vector3());
                console.log('iss', issModel, size);

                const originalModelLength = size.x;
                const issScale = (originalModelLength / this.#state.getGlobeRadius()) * (ISS_SIZE_KM / helper.EARTH_RADIUS_KM);
                issModel.scale.set(issScale, issScale, issScale);

                resolve(issModel);
            });
        });

        this.#issMarkerMesh.add(this.#issModelMesh);
    }

    #initIssMarkerMesh(){
        const issMarkerGeometry = new THREE.OctahedronGeometry(2 * ISS_SIZE_KM * this.#state.getGlobeRadius() / helper.EARTH_RADIUS_KM / 2, 0);
        const issMarkerMaterial = new THREE.MeshLambertMaterial({ color: 'black', transparent: true, opacity: markerNormalOpacity });
        this.#issMarkerMesh = new THREE.Mesh(issMarkerGeometry, issMarkerMaterial);

        this.#eventHandler.subscribeRaycastTargets(this.#onHover.bind(this), this.#onUnhover.bind(this), this.#onFocus.bind(this), this.#onUnfocus.bind(this), this.#issMarkerMesh);
    }

    async #initIssData(){
        const res = await fetch('https://live.ariss.org/iss.txt')
        const issTle = await res.text();
        const tleLines = issTle.split(/\n/);
        const tleLine1 = tleLines[1];
        const tleLine2 = tleLines[2];    

        this.#issSatrec = satellite.twoline2satrec(tleLine1, tleLine2);
    }

    getIssObjectData(){
        return {
            satrec: this.#issSatrec
        };
    }



    updateIss(){
        // The position is currently updated through ThreeGlobe.
        this.#updateFocusedVisuals();
    }

    #onHover(_){
        this.#isHovered = true;
        this.#updateMarkerStateVisual();
    }

    #onUnhover(_){
        this.#isHovered = false;
        this.#updateMarkerStateVisual();
    }

    #onFocus(_){
        this.#isFocused = true;
        this.#updateMarkerStateVisual();
        this.#updateFocusedVisuals();
        this.#$issInfoWrapper.show();

        if (this.hasLoadedIssText == null){
            this.#setIssInfoText();
        }
    }

    async #setIssInfoText(){
        // TODO
        this.hasLoadedIssText = true;
    }

    #onUnfocus(_){
        this.#isFocused = false;
        this.#updateMarkerStateVisual();
        this.#$issInfoWrapper.hide();
    }

    #updateMarkerStateVisual(){
        let markerOpacity;
        if (this.#isFocused){
            markerOpacity = markerFocusedOpacity;
        }
        else if (this.#isHovered){
            markerOpacity = markerHoveredOpacity;
        }
        else{
            markerOpacity = markerNormalOpacity;
        }
        this.#issMarkerMesh.material.opacity = markerOpacity;
    }
    
    #updateFocusedVisuals(){
        if (this.#isFocused){
            const time = new Date();
            const gmst = satellite.gstime(time);
            const latLngAlt = helper.getLatLngAlt(time, gmst, this.#issSatrec);
            this.#$issInfoWrapper.find('.lat').text(latLngAlt.lat.toFixed(2));
            this.#$issInfoWrapper.find('.lon').text(latLngAlt.lng.toFixed(2));
            this.#$issInfoWrapper.find('.alt').text(latLngAlt.alt.toFixed(2) + ' km');
            const speed = helper.eciVelocityToSpeed(latLngAlt.eci.velocity);
            this.#$issInfoWrapper.find('.speed').text(speed.toFixed(2) + ' km/hr');
        }
    }
}

export { IssController as default };
