import { Matrix4, Group, Object3D, Bone } from 'three'

import defaultCategories from './categories'
import Category, { ParentCategory } from './category'

/**
 * 
 */
class GroupManager {
    /**
     * @param { Group } group
     */
    constructor( group, categories = defaultCategories ) {
        
        this.group = group

        /**
         * A mapping from category ID to category data
         * @type { Map< string, Category > }
         */
        this.categoriesMap = categories.reduce(
            ( categoriesMap, category ) => categoriesMap.set( category.id, category ),
            new Map
        )


        /**
         * @type { Map< string, Object3D > }
         * mapping from categoryName to loadedObject (initially filled with null)
         */
        this.loadedObjectsMap = new Map

        /**
         * @type { Map< string, Bone > }
         *  mapping from boneId to loadedObject
         * 
         * Note: assumes bone names are unique
         */
        this.bonesMap = new Map;
    }


    add( categoryId, object3d, metaData = {} ) {
        if ( ! this.categoriesMap.has( categoryId ) ) {
            throw new Error( `Category ${ categoryId } is not defined!` )
        }

        const category = this.categoriesMap.get( categoryId )
        
        // const currentObject = this.loadedObjectsMap.get( categoryId )
        
        const knownBoneNames = new Set( category.attachmentBones )
        const extractedBones = extractKnownBones( object3d, knownBoneNames )

        if ( this.loadedObjectsMap.has( categoryId ) ) {

            this.replace( category, object3d, extractedBones )

        } else {

            this.place( category, object3d, extractedBones )

        }
        
        this.loadedObjectsMap.set( categoryId, object3d )

    }

    /**
     * 
     * @param { Category } category 
     * @param { Object3D } object3d 
     * @param { Map< string, Bone > } extractedBones 
     */
    place( category, object3d, extractedBones ) {
        const { attachmentBones, parent } = category

        attachmentBones.forEach( boneId => {

            const newBone = extractedBones.get( boneId )

            this.bonesMap.set( boneId, newBone )

        } )

        this.getParent( parent ).add( object3d )

    }

    /**
     * 
     * @param { Category } category 
     * @param { Object3D } object3d 
     * @param { Map< string, Bone > } extractedBones 
     */
    replace( category, object3d, extractedBones ) {


        category.attachmentBones.forEach( boneId => {

            const oldBone = this.bonesMap.get( boneId )
            const newBone = extractedBones.get( boneId )

            this.bonesMap.set( boneId, newBone )



            // this will automatically move the children to their new parent
            newBone.add( ...oldBone.children )

        } )
        
        const parent = this.getParent( category.parent )
        // TODO
        // remove current obj from parent
        const currentObject = this.loadedObjectsMap.get( category.id )

        parent.remove( currentObject )

        // then add new object to parent
        parent.add( object3d )
        
    }

    /**
     * 
     * @param { ParentCategory } parentCategory 
     */
    getParent( parentCategory ) {
        if ( parentCategory ) {
            const parentBone = this.bonesMap.get( parentCategory.boneName )
            if ( ! parentBone ) {
                throw new Error( `Bone with name ${ parentCategory.boneName } not found!` )
            } 

            return parentBone

        } else {

            return this.group

        }
    }

    updateBones( newBonesMap ) {
        newBonesMap.forEach(
            ( value, key ) => {
                this.bonesMap.set( key, value )
            }
        )
    }

    getCategoryById( id ) {
        return this.categoriesMap.get( id )
    }

    log( id ) {
        // if ( typeof id === "string" ) {
        //     const found = this.categories.find( c => c.id === id )
        //     console.log( found )
        // } else {
        //     console.log( this.categories )
        // }

        // console.log("categories:", this.categoriesMap )
        // console.log("registeredBones:", this.registeredBonesSet)
        console.log("loadedObjects:", this.loadedObjectsMap )
        console.log("loadedBones:", this.bonesMap )
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
    const map = new Map

    object3d.traverse( element => {
        if ( element.isBone ) {
            if ( knownBoneNames.has( element.name ) ) {
                map.set( element.name, element )
            }
        }
    } )

    return map
}

export default GroupManager 