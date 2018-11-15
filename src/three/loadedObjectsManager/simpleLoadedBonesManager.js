import { ANCHORS } from './boneRelationships';

class GroupManager {
    /**
     * 
     * @param {THREE.Group} group 
     */
    constructor( group ) {
        this.group = group;
    }

    add( bodyPartName, objectToAdd ) {
        objectToAdd.name = bodyPartName; // give name to identify it later on

        const anchor = ANCHORS[ bodyPartName ];
        
        const {
            attachPoint,
            childrenAttachPoints
        } = anchor;


        const attachPointBone = attachPoint ? this.group.getObjectByName( attachPoint.parentAttachment ) : this.group;

        childrenAttachPoints.forEach( ({ childAttachment, parentAttachment }) => {
            // const currentParent = this.group.getObjectByName( parentAttachment );
            const newParent = objectToAdd.getObjectByName( parentAttachment ); // parent Bone

            const currentChild = attachPointBone.getObjectByName( childAttachment );

            if ( currentChild ) {
                // adding an object will automatically remove it from it's current parent
                newParent.add( currentChild );
            }
        } );

        const currentObject = attachPointBone.getObjectByName( bodyPartName );

        if ( currentObject ) {
            attachPointBone.remove( currentObject );
        }

        attachPointBone.add( objectToAdd );
    }
}

export default GroupManager;