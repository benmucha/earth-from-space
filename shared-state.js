
class SharedState{
    #engine;

    constructor(engine){
        this.#engine = engine;
    }

    getGlobeRadius(){
        return this.#engine.globe.getGlobeRadius();
    }

    getCoords(lat, lng, alt){
        return this.#engine.globe.getCoords(lat, lng, alt);
    }

    raycastIntersectObject(obj){
        return this.#engine.raycaster.intersectObject(obj);
    }
}

export { SharedState as default };
