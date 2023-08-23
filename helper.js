
function makeOrbitPath(satrec, startMinutes, endMinutes){
    const currentTime = new Date();
    const path = [];
    for (var minute = startMinutes; minute <= endMinutes; minute++){
        const time = new Date(currentTime.getTime() + minute * 60000);
        const gmst = satellite.gstime(time);
        const latLngAlt = getRenderingLatLngAlt(time, gmst, satrec);
        path.push([latLngAlt.lat, latLngAlt.lng, latLngAlt.alt]);
    }
    return path;
}

function getRenderingLatLngAlt(time, gmst, satrec){
    const latLngAlt = getLatLngAlt(time, gmst, satrec);
    latLngAlt.alt /= EARTH_RADIUS_KM;
    return latLngAlt;
}

function getLatLngAlt(time, gmst, satrec){
    const eci = satellite.propagate(satrec, time);
    const gdPos = satellite.eciToGeodetic(eci.position, gmst);
    return {
        lat: satellite.radiansToDegrees(gdPos.latitude),
        lng: satellite.radiansToDegrees(gdPos.longitude),
        alt: gdPos.height
    } 
}

const EARTH_RADIUS_KM = 6371;

export { EARTH_RADIUS_KM, makeOrbitPath, getRenderingLatLngAlt, getLatLngAlt }
