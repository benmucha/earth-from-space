
class EventHandler{
    #engine;
    #raycastTargets = [];

    #targetGroups = [];

    #hoverTargetId = null;
    #hoverTargetIntersection = null;

    constructor(engine){
        this.#engine = engine;
    }



    updateHoverTarget(){
        const targetIntersections = this.#engine.raycaster.intersectObjects(this.#raycastTargets);
        if (targetIntersections.length > 0){
            const hoverTarget = targetIntersections[0];

            // If the target is close enough then hover it:
            if (hoverTarget.distance < 300){
                this.#setHoverTarget(hoverTarget.object.userData.targetId, hoverTarget);
            }
        }
        else{
            this.#setHoverTarget(null, null);
        }
    }
    
    #setHoverTarget(newHoverTargetId, newHoverTargetIntersection){
        const lastHoverTargetId = this.#hoverTargetId;
        if (lastHoverTargetId == newHoverTargetId){
            return;
        }

        const lastHoverTargetIntersection = this.#hoverTargetIntersection;
        this.#hoverTargetId = newHoverTargetId;
        this.#hoverTargetIntersection = newHoverTargetIntersection;

        if (lastHoverTargetId != null){
            const lastHoverTargetGroup = this.#getTargetGroup(lastHoverTargetIntersection);
            lastHoverTargetGroup.onUnhover(lastHoverTargetIntersection);
        }

        if (newHoverTargetId != null){
            const newHoverTargetGroup = this.#getTargetGroup(newHoverTargetIntersection);
            newHoverTargetGroup.onHover(newHoverTargetIntersection);

            this.#setCursorStyle('pointer');
        }
        else{
            this.#setCursorStyle('initial');
        }
    }

    #getTargetGroup(targetIntersectInstance){
        const targetGroupId = targetIntersectInstance.object.userData.targetGroupId;
        const targetGroup = this.#targetGroups[targetGroupId];
        return targetGroup;
    }

    subscribeRaycastTargets(onHover, onUnhover, ...targetObjs){
        const targetGroupId = this.#targetGroups.length;
        this.#targetGroups.push({ onHover, onUnhover });

        for (const targetObj of targetObjs){
            console.log(targetObj)
            targetObj.userData.targetGroupId = targetGroupId;
            targetObj.userData.targetId = this.#raycastTargets.length;
            this.#raycastTargets.push(targetObj); 
        }
    }

    #setCursorStyle(cursorStyle){
        this.#engine.visualElementParent.style.cursor = cursorStyle;
    }
}

export { EventHandler as default };
