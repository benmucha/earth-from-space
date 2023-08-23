
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
}

export { SharedState as default };
