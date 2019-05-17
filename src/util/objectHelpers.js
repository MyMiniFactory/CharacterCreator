import {
    Object3D, Bone, Vector3, Group,
    Mesh, MeshStandardMaterial
} from 'three'

import { gltfLoader, stlLoader } from './loaders'


/**
 * @param {{ [key: string]: ObjectData }} objectsData - dictionary with values
 * containing the name, download url and extension type of 3d objects
 */
export const fetchObjects = async objectsData => {
    /** @type {{ [key: string]: Object3D }} */
    const objectsToReturn = {}

    const keys = Object.keys( objectsData )

    const promises = keys.map( async key => {

        const object = await get3DObject( objectsData[ key ] )
        
        objectsToReturn[ key ] = object

    })

    await Promise.all( promises )

    return objectsToReturn
}

/**
 * @param { ObjectData } objectData
 * @param {{ [key: string]: Rotation }} poseData
 * @returns { Promise<Object3D> }
 */
export const get3DObject = async ( objectData, poseData ) => {
    switch ( objectData.extension ) {

        case 'stl': {
            const { download_url, metadata } = objectData

            const geometry = await stlLoader.load( download_url )
            return getObjectFromGeometry( geometry, metadata, poseData )
        }

        case 'gltf': 
        case 'glb': {
            const resource = await gltfLoader.load( objectData.download_url )
            const root = resource.scene.children[ 0 ]

            if ( poseData ) {
                root.traverse( bone => {
                    if ( bone.isBone ) {
                        const rotation = poseData[ bone.name ]

                        if ( rotation ) {
                            const { x, y, z } = rotation
                            bone.rotation.set( x, y, z )
                        }
                    }
                } )

            }

            return root
        }

        default: {
            throw new Error( `Extension '${objectData.extension}' not recognized.` )
        }
    }
}

export const getObjectFromGeometry = ( geometry, metadata, poseData ) => {
    const material = new MeshStandardMaterial({
        color: 0x808080
    })

    const mesh = new Mesh( geometry, material )

    const objectContainer = new Group
    objectContainer.add( mesh )
    
    const root = new Group
    root.add( objectContainer )

    if ( metadata ) {
        const { position, rotation, scale, attachPoints } = metadata
    
        if ( position ) {
            const { x, y, z } = position
            mesh.position.set( x, y, z )
        }
    
    
        // TODO rotation and scale set to parent !!!!
        if ( rotation ) {
            const { x, y, z } = rotation
            objectContainer.rotation.set( x, y, z )
        }
    
        if ( scale ) {
            // scale is number; applies on all axis
            objectContainer.scale.setScalar( scale )
        }

        if ( attachPoints ) {
            for ( let [ attachPointName, position ] of Object.entries( attachPoints ) ) {
                const rotation = poseData && poseData[ attachPointName ]
                root.add( createBone( attachPointName, position, rotation ) )
            }
        }

        root.userData.metadata = metadata
        objectContainer.userData.metadata = metadata
    }

    return root
}

function createBone( name, position, rotation ) {
    const { x, y, z } = position

    const bone = new Bone
    bone.name = name
    bone.position.set( x, y, z )

    if ( rotation ) {
        const { x, y, z } = rotation
        bone.rotation.set( x, y, z )
    }
    
    return bone
}

/**
 * @typedef {{ name: string, download_url: string, extension: string }} ObjectData
 * object with the name, download url and extension type of a 3d object
 * 
 * @typedef {{ x: number, y: number, z: number }} Rotation
 */