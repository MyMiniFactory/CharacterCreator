import {
    Scene, PerspectiveCamera, WebGLRenderer, Color,
    MeshStandardMaterial, Mesh, Group, Raycaster, Vector3
} from 'three'
import OrbitControls from 'three-orbitcontrols'
import { sphereFactory } from '../../../../util/three-helpers'
import lights from './lights'

const objectContainer = new Group

let mesh = null

const sphere = sphereFactory.buildSphere()

const scene = new Scene
scene.background = new Color( 0xeeeeee )
scene.add( objectContainer, sphere, ...lights )

const camera = new PerspectiveCamera(
    75,
    1,
    0.001,
    1000
)
camera.position.set( 0, .5, -1 )
camera.lookAt( 0, 3, 0 )


const renderer = new WebGLRenderer({
    antialias: true
})

const canvas = renderer.domElement

function renderScene() {
    renderer.render( scene, camera )
}

const orbitControls = new OrbitControls( camera, canvas )
orbitControls.addEventListener( 'change', renderScene )
orbitControls.enableKeys = false

export default {
    renderScene,

    getCanvas() {
        return canvas
    },

    addObject( geometry, options ) {
        const {
            position: { x: posX, y: posY, z: posZ },
            rotation: { x: rotX, y: rotY, z: rotZ },
            scale
        } = options

        mesh = new Mesh(
            geometry,
            new MeshStandardMaterial({
                color: 0xffffff,
                opacity: .8,
                transparent: true
            })
        )

        mesh.position.set( posX, posY, posZ )
        objectContainer.rotation.set( rotX, rotY, rotZ )
        objectContainer.scale.setScalar( scale )

        objectContainer.add( mesh )
    },

    clearObjects() {
        objectContainer.remove( ...objectContainer.children )
        mesh = null
    },

    setPosition({ x, y, z }) {
        // TODO - mesh variable
        mesh.position.set( x, y, z )
    },

    setRotation({ x, y, z }) {
        objectContainer.rotation.set( x, y, z )
    },

    setScale( scale ) {
        objectContainer.scale.setScalar( scale )
    },

    setSpherePosition({ x, y, z }) {
        sphere.position.set( x, y, z )
    },

    resetRendererSize() {
        const { width, height } = canvas.getBoundingClientRect()

        renderer.setSize( width, height, false )
        renderer.setPixelRatio( width / height )
    },

    rayCast( mouseCoords ) {

        const raycaster = new Raycaster
        raycaster.setFromCamera( mouseCoords, camera )

        const intersects = raycaster.intersectObject( objectContainer, true )

        const intersection = intersects.find( intersect => intersect.object.isMesh )

        if( intersection ) {
            const { point, face } = intersection

            const { x, y, z } = point
            
            return { x, y, z }

        }

        return null
    },

    getPositionRelativeToObject({ x, y, z }) {
        return mesh.worldToLocal( new Vector3( x, y, z ) )
    },
}