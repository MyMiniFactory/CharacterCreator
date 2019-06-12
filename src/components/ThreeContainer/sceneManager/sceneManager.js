import { Matrix4, Vector3, Object3D, Group, Bone, Mesh, Material, Color, Box3 } from 'three'
import topologicalSort from 'toposort'
import findMinGeometry from '../util/findMinGeometry'

/**
 * An object that holds a reference to a group of 3D objects (_container_).
 * It also needs the categories that define the structure of the objects
 * that need to be added.
 * 
 * It provides methods to place and replace objects for a given category.
 * 
 * 3D objects can be added as children of other 3D objects; therefore it is
 * possible to form a tree structure of 3D objects. The structure is defined
 * by the second argument (_categories_). Each category has a parent category
 * that can be followed until the root category is reached.
 * 
 * When objects from a category are loaded, it is placed as a child of the
 * object from the parent category.
 */
class SceneManager {
    /**
     * @param { Object3D } container
     * @param { Category[] } categories
     */
    constructor( container, categories ) {
        
        this.container = container
        this.stand = null


        const categoriesWithParent = categories.filter( cat => cat.parent )
        const edges = categoriesWithParent.map(
            ({ id, parent }) => [ parent.id, id ]
        )

        /**
         * this will sort the categories in the correct order they have to be added;
         * since the categories are defined by the designer, they will be loaded via an api call
         * and thus could be sorted when uploading them instead of sorting them here
         */
        this.sortedCategoryIds = topologicalSort( edges )


        /**
         * could also be identified when uploading the categories
         */
        this.rootCategory = categories.find( category => category.parent === null )

        /**
         * A mapping from category ID to category data
         * @type { Map<string, Category> }
         */
        this.categoriesMap = categories.reduce(
            ( categoriesMap, category ) => categoriesMap.set( category.id, category ),
            new Map
        )

        /**
         * @type { Map<string, Object3D> }
         * used to keep track of loaded objects
         */
        this.loadedObjectsMap = new Map

        /**
         * @type { Map<string, Bone> }
         *  used to keep track of Bone objects within each loaded object
         * 
         * Note: assumes bone names are unique
         */
        this.bonesMap = new Map;
    }

    getContainer() {
        return this.container
    }

    /**
     * @param { Object3D } container
     */
    setContainer( container ) {
        this.container = container
    }

    rescaleContainerToFitObjects( fitOffset = 2 ) {
        const boundingBox = new Box3().setFromObject( this.container )

        const size = boundingBox.getSize( new Vector3 )
        const maxDimension = Math.max( size.x, size.y, size.z )

        this.container.scale.divideScalar( maxDimension / fitOffset )
    }

    getObject( key ) {
        return this.loadedObjectsMap.get( key )
    }

    getObjectByAttachPoint( attachPointName ) {
        const attachPoint = this.bonesMap.get( attachPointName )

        return attachPoint ? attachPoint.children[ 0 ] : null
    }

    getParentObject( key ) {
        const { parent } = this.categoriesMap.get( key )

        if ( !parent ) return null

        return this.loadedObjectsMap.get( parent.id ) || null
    }

    placeStand( newStand, options = {} ) {
        
        const rootCategoryId = this.rootCategory.id        
        
        if ( this.stand ) {
            this.container.remove( this.stand )
        }
        
        this.container.add( newStand )
        
        this.stand = newStand
        
        const rootObj = this.loadedObjectsMap.get( rootCategoryId )
        
        if ( rootObj ) {

            // adding an object will remove it from the previous parent
            newStand.add( rootObj )

            // TODO only calculate minGeometry after loading all objects (in addAll)
            
            const minGeometry = findMinGeometry( rootObj )
            const currentY = rootObj.position.y
            rootObj.position.setY( currentY - minGeometry )

        }
    }


    add( categoryKey, objectToAdd, options = {} ) {

        if ( ! this.categoriesMap.has( categoryKey ) ) {

            throw new Error( `Category ${ categoryKey } is not defined!` )
            // TODO handle this case (or make sure it can't happen)

        }


        const category = this.categoriesMap.get( categoryKey )

        if ( this.loadedObjectsMap.has( categoryKey ) ) {

            const currentObject = this.loadedObjectsMap.get( categoryKey )

            this.replace( category, currentObject, objectToAdd )

        } else {

            this.place( category, objectToAdd )

        }
        
        this.loadedObjectsMap.set( categoryKey, objectToAdd )

    }

    /**
     * @param { Category } category 
     * @param { Object3D } objectToAdd 
     */
    place( category, objectToAdd ) {
        const { attachPoints, parent } = category

        const extractedBones = extractKnownBones( objectToAdd, attachPoints )

        for ( let boneId of attachPoints ) {

            const newBone = extractedBones.get( boneId )

            this.bonesMap.set( boneId, newBone )

        }

        this.getParent( parent ).add( objectToAdd )

    }

    /**
     * @param { Category } category 
     * @param { Object3D } objectToAdd 
     */
    replace( category, currentObject, objectToAdd ) {
        const { attachPoints, parent } = category

        const extractedBones = extractKnownBones( objectToAdd, attachPoints )

        for ( let boneId of attachPoints ) {

            const oldBone = this.bonesMap.get( boneId )
            const newBone = extractedBones.get( boneId )

            // update bonesMap to reference new bone
            this.bonesMap.set( boneId, newBone )

            // this will automatically move the children to their new bone parent
            newBone.add( ...oldBone.children )

        }
        
        const parentObject = this.getParent( parent )

        parentObject.remove( currentObject )
        parentObject.add( objectToAdd )
        
    }

    /**
     * @param { Category } parentCategory 
     * @returns - the parent bone of the category or the group if the category is the root
     */
    getParent( parentCategory ) {
        if ( parentCategory ) {
            const parentBone = this.bonesMap.get( parentCategory.attachPoint )
            if ( ! parentBone ) {
                throw new Error( `Bone with name ${ parentCategory.attachPoint } not found!` )
            } 

            return parentBone

        } else {

            // if ( ! this.stand ) {
            //     throw new Error( `You first need to place a stand before adding objects` )
            // }

            return this.container

        }
    }

    applyPose( poseData ) {
        this.container.traverse( bone => {
            if ( bone.isBone ) {
                const rotation = poseData[ bone.name ]

                if ( rotation ) {
                    const { x, y, z } = rotation
                    bone.rotation.set( x, y, z )
                }
            }
        } )
    }

    computeGlobalRotation( category, poseData ) {
        const finalRotation = new Vector3 // default to (0, 0, 0)

        if ( !category || !poseData ) {
            return finalRotation
        }

        let cat = this.categoriesMap.get( category.name )

        while( cat && cat.parent ) {
            const attachPointRotation = poseData[ cat.parent.attachPoint ]

            if ( attachPointRotation ) {
                const { x, y, z } = attachPointRotation
                finalRotation.add( new Vector3( x, y, z ))
            }

            cat = this.categoriesMap.get( cat.parent.name )
        }

        return finalRotation
    }

    resetStand() {

        const rootCategoryId = this.rootCategory.id

        const rootObj = this.loadedObjectsMap.get( rootCategoryId )
        
        if ( rootObj ) {
            
            const minGeometry = findMinGeometry( rootObj )
            const currentY = rootObj.position.y
            rootObj.position.setY( currentY - minGeometry )

        }

    }

    /**
     * @param { Object3D } object3d
     * @param { Color } newColour
     */
    _setColour( object3d, newColour ) {

        object3d.traverse( child  => {

            if ( child instanceof Mesh ) {
                const { material } = child
                if (
                    material instanceof Material &&
                    material.color instanceof Color
                ) {
                    material.color.set( newColour )
                }
            }

        } )

    }

    /**
     * @param { string } categoryId
     * @param { Color } newColour
     */
    changeColour( categoryId, newColour ) {
        
        if ( ! this.loadedObjectsMap.has( categoryId ) ) { return }

        const object3d = this.loadedObjectsMap.get( categoryId )

        this._setColour( object3d, newColour )

    }

    changeStandColour( newColour ) {

        if ( ! this.stand ) { return }

        this._setColour( this.stand, newColour )

    }

    changePoseColour( newColour ) {

        this._setColour( this.container, newColour )

    }
}

/** 
 * this is not used, but might be needed when adding an object to the scene
 * https://github.com/mrdoob/three.js/blob/master/examples/js/utils/SceneUtils.js#L29
 */
function getChildWithCorrectMatrixWorld( child, parent ) {

    child.applyMatrix( new Matrix4().getInverse( parent.matrixWorld ) )

    return child
}


/**
 * returns a map from boneId to Bone containing only the registered bones
 * @param { Object3D } object3d
 * @param { Set< string > } knownBoneNames
 */
function extractKnownBones( object3d, knownBoneNames ) {

    const knownBoneNamesSet = knownBoneNames instanceof Set ? knownBoneNames : new Set( knownBoneNames )

    /** @type { Map< string, Bone > } */
    const extractedBones = new Map

    object3d.traverse( element => {
        if ( element.isBone && knownBoneNamesSet.has( element.name ) ) {
            extractedBones.set( element.name, element )
        }
    } )

    return extractedBones
}

export default SceneManager


/**
 * JS object representing the parent of a category;
 * needs a category name and an attachpoint name from within that category
 * @typedef { Object } Parent
 * @property { string } name
 * @property { string } attachPoint
*/
/**
 * Category object
 * @typedef { Object } Category
 * @property { string } name
 * @property { string[] } attachPoints
 * @property { Parent } [parent]
 */
