
class EventHandler{
    #engine;
    #raycastTargets = [];

    #targetGroups = [];

    #hoverTargetId = null;
    #hoverTargetIntersection = null;

    #selectedTargetId = null;
    #selectedTargetIntersection = null;

    constructor(engine){
        this.#engine = engine;
    }

    init(){
        this.#engine.visualElementParent.addEventListener('click', this.#onClick.bind(this));
    }

    #onClick(){
        const lastSelectedId = this.#selectedTargetId;
        const newSelectedId = this.#hoverTargetId;
        if (lastSelectedId == newSelectedId){
            return;
        }

        const lastSelectedTargetIntersection = this.#selectedTargetIntersection;
        const newSelectedTargetIntersection = this.#hoverTargetIntersection;
        this.#selectedTargetId = newSelectedId;
        this.#selectedTargetIntersection = newSelectedTargetIntersection;

        if (lastSelectedId != null){
            const hoverTargetGroup = this.#getTargetGroup(lastSelectedTargetIntersection);
            hoverTargetGroup.onDeselect(lastSelectedTargetIntersection);
        }

        if (newSelectedId != null){
            const hoverTargetGroup = this.#getTargetGroup(newSelectedTargetIntersection);
            hoverTargetGroup.onSelect(newSelectedTargetIntersection);
        }
    }

    updateHoverTarget(){
        const targetIntersections = this.#engine.raycaster.intersectObjects(this.#raycastTargets, true);
        if (targetIntersections.length > 0){
            const hoverTarget = targetIntersections[0];

            // If the target is close enough then hover it:
            if (hoverTarget.distance < 300){
                
                if (hoverTarget.object.userData.targetId){
                    let hoverTargetId = hoverTarget.object.userData.targetId.toString();
                    if (hoverTarget.instanceId){
                        hoverTargetId += '-' + hoverTarget.instanceId;
                    }
                    this.#setHoverTarget(hoverTargetId, hoverTarget);
                }
                else{
                    // If there is no specified user data on this target object, then this is not a real target (and it's just meant to block interactions):
                    this.#setHoverTarget(null, null);
                }
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
            // console.log('hover:', newHoverTargetIntersection);
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

    subscribeRaycastTargets(onHover, onUnhover, onSelect, onDeselect, ...targetObjs){
        const targetGroupId = this.#targetGroups.length;
        this.#targetGroups.push({ onHover, onUnhover, onSelect, onDeselect });

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
