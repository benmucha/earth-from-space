
import * as helper from './helper.js'
import { GLTFLoader } from 'https://unpkg.com/three/examples/jsm/loaders/GLTFLoader.js';

const ISS_PAST_PATH_ID = 'ISS_PAST_PATH';
const ISS_FUTURE_PATH_ID = 'ISS_FUTURE_PATH';

const ISS_MARKER_TYPE_ID = 'ISS_MARKER';
const ISS_MODEL_TYPE_ID = 'ISS_MODEL';

const ISS_SIZE_KM = 100;

class IssController{
    #issMarkerMesh;
    #issModelMesh;

    #issSatrec;

    #state;

    constructor(state){
        this.#state = state;
    }

    getIssPathColors(pathId){
        switch (pathId){
            case ISS_PAST_PATH_ID:
                return ['rgba(70,70,70,0.0)', 'rgba(255,255,255,0.6)'];
            case ISS_FUTURE_PATH_ID:
                return ['rgba(255,255,255,0.6)', 'rgba(255,255,255,0.0)'];
        }
    }

    getIssThreeObject(objTypeId){
        switch (objTypeId){
            case ISS_MARKER_TYPE_ID:
                return this.#issMarkerMesh;
            case ISS_MODEL_TYPE_ID:
                return this.#issModelMesh;
        }
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
        this.#issModelMesh = await this.#loadIssModel();
    }

    async #loadIssModel(){
        return await new Promise(resolve => {
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
    }

    #initIssMarkerMesh(){
        const issMarkerGeometry = new THREE.OctahedronGeometry(2 * ISS_SIZE_KM * this.#state.getGlobeRadius() / helper.EARTH_RADIUS_KM / 2, 0);
        const issMarkerMaterial = new THREE.MeshLambertMaterial({ color: 'black', transparent: true, opacity: 0.5 });
        this.#issMarkerMesh = new THREE.Mesh(issMarkerGeometry, issMarkerMaterial);
    }

    async #initIssData(){
        const res = await fetch('https://live.ariss.org/iss.txt')
        const issTle = await res.text();
        const tleLines = issTle.split(/\n/);
        const tleLine1 = tleLines[1];
        const tleLine2 = tleLines[2];    

        this.#issSatrec = satellite.twoline2satrec(tleLine1, tleLine2);
    }

    getIssObjectsData(){
        const issMarkerObjData = {
            typeId: ISS_MARKER_TYPE_ID,
            satrec: this.#issSatrec
        };
        const issModelObjData = {
            typeId: ISS_MODEL_TYPE_ID,
            satrec: this.#issSatrec
        };
        return [issMarkerObjData, issModelObjData];
    }
}

export { IssController as default };
