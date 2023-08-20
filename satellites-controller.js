
import * as helper from './helper.js'

const SATELLITE_SIZE_KM = 50;

class SatellitesController{
    #satelliteInstancedMesh;
    #lastSatelliteUpdateTime = new Date();
    #tempMatrixHelperObj = new THREE.Object3D();
    #satellitesData = [];

    #state;

    constructor(state){
        this.#state = state;
    }

    async initSatellites(){
        await this.#initSatellitesData();
    }

    async #initSatellitesData(){
        const res = await fetch('https://celestrak.org/pub/TLE/catalog.txt');
        const satelliteTles = await res.text();
        const satelliteTleLines = satelliteTles.split(/\n/);

        const time = new Date();
        const gmst = satellite.gstime(time);

        let totalCount = 0;
        let skippedCount = 0;
        for (let i = 0; i < satelliteTleLines.length; i += 3){
            totalCount++;
            const satelliteName = satelliteTleLines[i + 0];
            const satelliteTleLine1 = satelliteTleLines[i + 1];
            const satelliteTleLine2 = satelliteTleLines[i + 2];

            // Exclude the ISS from satellites since we show it separately:
            if (satelliteName.includes('ISS (ZARYA)')){
                continue;
            }

            if (!satelliteTleLine1 || !satelliteTleLine2){
                skippedCount++;
                continue;
            }
            const satelliteSatrec = satellite.twoline2satrec(satelliteTleLine1, satelliteTleLine2);

            // Skip bad satellite data:
            try {
                helper.getLatLngAlt(time, gmst, satelliteSatrec);
            }
            catch (err){
                skippedCount++;
                continue;
            }

            const satelliteObj = {
                satrec: satelliteSatrec
            };
            this.#satellitesData.push(satelliteObj);
        }

        console.log(`Skipped ${skippedCount} out of ${totalCount} satellites.`);
    }

    makeSatellitesInstancedMesh(){
        const satelliteGeometry = new THREE.OctahedronGeometry(SATELLITE_SIZE_KM * this.#state.getGlobeRadius() / helper.EARTH_RADIUS_KM / 2, 0);
        const satelliteMaterial = new THREE.MeshLambertMaterial({ color: 'grey', transparent: false, opacity: 1 });
        // (Satellites use a single InstancedMesh for performance):
        this.#satelliteInstancedMesh = new THREE.InstancedMesh(satelliteGeometry, satelliteMaterial, 30000);
        this.#satelliteInstancedMesh.frustumCulled = false; // meshes disappear at certain camera rotations/distances with frustrum culling.
        return this.#satelliteInstancedMesh;
    }

    updateSatellites(){
        // only update satellites every second (to improve performance):
        const currentTime = new Date();
        if (currentTime.getTime() - this.#lastSatelliteUpdateTime.getTime() >= 1000){
            this.#updateSatelliteObjs();
            this.#lastSatelliteUpdateTime = currentTime;
        }
    }

    #updateSatelliteObjs(){
        const time = new Date();
        const gmst = satellite.gstime(time);
        
        for (let i = 0; i < this.#satellitesData.length; i++){
            const obj = this.#satellitesData[i];
            const latLngAlt = helper.getLatLngAlt(time, gmst, obj.satrec);
            const coords = this.#state.getCoords(latLngAlt.lat, latLngAlt.lng, latLngAlt.alt);
            this.#tempMatrixHelperObj.position.set(coords.x, coords.y, coords.z);
            this.#tempMatrixHelperObj.updateMatrix();
            this.#satelliteInstancedMesh.setMatrixAt(i, this.#tempMatrixHelperObj.matrix)
        }

        this.#satelliteInstancedMesh.instanceMatrix.needsUpdate = true;
    }
}

export { SatellitesController as default };
