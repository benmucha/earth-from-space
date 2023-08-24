
import * as THREE from 'three';
import * as helper from './helper.js'
import * as satellite from 'satellite.js';

const SATELLITE_SIZE_KM = 50;
const normalColor = new THREE.Color().setHex(0xffffff);
const hoveredColor = new THREE.Color().setHex(0xaaaaff);
const focusedColor = new THREE.Color().setHex(0x0000ff);

class SatellitesController{
    #satelliteInstancedMesh;
    #lastSatelliteUpdateTime = new Date();
    #tempMatrix = new THREE.Matrix4();
    #satellitesData = [];

    #$satelliteInfoWrapper;

    #hoveredSatelliteId;
    #focusedSatelliteId;
    #focusedSatelliteData;

    #state;
    #eventHandler;

    constructor(state, eventHandler){
        this.#state = state;
        this.#eventHandler = eventHandler;
    }

    async initSatellites(){
        await this.#initSatellitesData();

        this.#$satelliteInfoWrapper = $('#satellite-info-wrapper');
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

            const satelliteData = {
                id: this.#satellitesData.length,
                name: satelliteName,
                satrec: satelliteSatrec
            };
            this.#satellitesData.push(satelliteData);
        }

        console.log(`Skipped ${skippedCount} out of ${totalCount} satellites.`);
    }

    makeSatellitesInstancedMesh(){
        const geometryRadius = SATELLITE_SIZE_KM * this.#state.getGlobeRadius() / helper.EARTH_RADIUS_KM / 2;
        const satelliteGeometry =  new THREE.IcosahedronGeometry(geometryRadius, 1);
        const satelliteMaterial = new THREE.MeshLambertMaterial({ color: 'grey', transparent: false, opacity: 1 });
        // (Satellites use a single InstancedMesh for performance):
        this.#satelliteInstancedMesh = new THREE.InstancedMesh(satelliteGeometry, satelliteMaterial, 30000);
        this.#satelliteInstancedMesh.frustumCulled = false; // meshes disappear at certain camera rotations/distances with frustrum culling.

        for (let satelliteId = 0; satelliteId < this.#satellitesData.length; satelliteId++){
            this.#satelliteInstancedMesh.setColorAt(satelliteId, normalColor);
        }
        this.#satelliteInstancedMesh.instanceColor.needsUpdate = true;

        this.#eventHandler.subscribeRaycastTargets(this.#onSatelliteHover.bind(this), this.#onSatelliteUnhover.bind(this), this.#onSatelliteFocus.bind(this), this.#onSatelliteUnfocus.bind(this), this.#satelliteInstancedMesh);

        return this.#satelliteInstancedMesh;
    }

    updateSatellites(){
        // Only update satellites every second (to improve performance):
        const currentTime = new Date();
        if (currentTime.getTime() - this.#lastSatelliteUpdateTime.getTime() >= 1000){
            this.#updatePositions();
            this.#lastSatelliteUpdateTime = currentTime;
        }

        this.#updateFocusedVisuals();
    }

    #updatePositions(){
        const time = new Date();
        const gmst = satellite.gstime(time);
        
        for (let satelliteId = 0; satelliteId < this.#satellitesData.length; satelliteId++){
            const obj = this.#satellitesData[satelliteId];
            const latLngAlt = helper.getRenderingLatLngAlt(time, gmst, obj.satrec);
            const coords = this.#state.getCoords(latLngAlt.lat, latLngAlt.lng, latLngAlt.alt);
            this.#tempMatrix.setPosition(coords.x, coords.y, coords.z);
            this.#satelliteInstancedMesh.setMatrixAt(satelliteId, this.#tempMatrix)
        }

        this.#satelliteInstancedMesh.instanceMatrix.needsUpdate = true; // Signals actual matrix update.
        this.#satelliteInstancedMesh.computeBoundingSphere(); // Updates bounding spheres so that raycast works.
    }

    #onSatelliteHover(intersectionInstance){
        const satelliteId = intersectionInstance.instanceId;
        this.#hoveredSatelliteId = satelliteId;
        this.#updateSatelliteColor(satelliteId);
    }

    #onSatelliteUnhover(_){
        const lastHoveredId = this.#hoveredSatelliteId;
        this.#hoveredSatelliteId = null;
        this.#updateSatelliteColor(lastHoveredId);
    }

    #onSatelliteFocus(_){
        const lastFocusedSatelliteId = this.#focusedSatelliteId;

        const focusedSatelliteId = this.#hoveredSatelliteId;
        this.#focusedSatelliteId = focusedSatelliteId;
        this.#focusedSatelliteData = this.#satellitesData[focusedSatelliteId];

        if (lastFocusedSatelliteId != null){
            this.#updateSatelliteColor(lastFocusedSatelliteId);
        }

        if (this.#focusedSatelliteId != null){
            this.#updateSatelliteColor(focusedSatelliteId);

            this.#$satelliteInfoWrapper.find('.name').text(this.#focusedSatelliteData.name);
            this.#updateFocusedVisuals();
            this.#$satelliteInfoWrapper.show();
        }
    }

    #onSatelliteUnfocus(_){
        const unfocusedSatelliteId = this.#focusedSatelliteId;
        this.#focusedSatelliteId = null;
        this.#focusedSatelliteData = null;

        this.#$satelliteInfoWrapper.hide();
        this.#updateSatelliteColor(unfocusedSatelliteId);
    }

    #updateSatelliteColor(satelliteId){
        let satelliteColor;
        if (this.#focusedSatelliteId == satelliteId){
            satelliteColor = focusedColor;
        }
        else if (this.#hoveredSatelliteId == satelliteId){
            satelliteColor = hoveredColor;
        }
        else{
            satelliteColor = normalColor;
        }
        this.#satelliteInstancedMesh.setColorAt(satelliteId, satelliteColor);
        this.#satelliteInstancedMesh.instanceColor.needsUpdate = true;
    }

    #updateFocusedVisuals(){
        if (this.#focusedSatelliteData){
            const time = new Date();
            const gmst = satellite.gstime(time);
            const latLngAlt = helper.getLatLngAlt(time, gmst, this.#focusedSatelliteData.satrec);
            this.#$satelliteInfoWrapper.find('.lat').text(latLngAlt.lat.toFixed(2));
            this.#$satelliteInfoWrapper.find('.lon').text(latLngAlt.lng.toFixed(2));
            this.#$satelliteInfoWrapper.find('.alt').text(latLngAlt.alt.toFixed(2) + ' km');
            const speed = helper.eciVelocityToSpeed(latLngAlt.eci.velocity);
            this.#$satelliteInfoWrapper.find('.speed').text(speed.toFixed(2) + ' km/hr');
        }
    }
}

export { SatellitesController as default };
