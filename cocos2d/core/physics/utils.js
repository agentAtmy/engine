
function getWorldRotation (node) {
    var rot = node.rotation;
    var parent = node.parent;
    while(parent.parent){
        rot += parent.rotation;
        parent = parent.parent;
    }
    return rot;
}

function getWorldScale (node) {
    var scaleX = node.scaleX;
    var scaleY = node.scaleY;

    var parent = node.parent;
    while(parent.parent){
        scaleX *= parent.scaleX;
        scaleY *= parent.scaleY;

        parent = parent.parent;
    }

    return cc.v2(scaleX, scaleY);
}

function convertToNodeRotation (node, rotation) {
    rotation -= node.rotation;
    var parent = node.parent;
    while(parent.parent){
        rotation -= parent.rotation;
        parent = parent.parent;
    }
    return rotation;
}

module.exports = {
    getWorldRotation: getWorldRotation,
    getWorldScale: getWorldScale,
    convertToNodeRotation: convertToNodeRotation
};
