import React, { Component } from 'react'
import { connect } from 'react-redux'
import { Object3D, Group } from 'three'

import ThreeContainer from '../ThreeContainer'
import UploadWizard from '../UploadWizard'
import Header from '../Header';
import Selector from '../Selector';
import { CategoriesView, GroupsView } from '../Categories'

// import { apiEndpoint, accessToken, requestConfig, userName, customizerName } from '../../config'
import SceneManager from '../ThreeContainer/sceneManager'

import { fetchObjects, get3DObject } from '../../util/objectHelpers';
import {
    getCategories, objectMap, getNameAndExtension,
    Dict
} from '../../util/helpers'

import './App.css'


class App extends Component {

    constructor( props ) {
        super( props )

        this.state = {
            /**
             * Mapping from part type to object Id
             * @type { Dict<string> }
             */
            loadedObjectIds: {},

            showUploadWizard: false,
            uploadedObjectData: null,
            
            editMode: false
        }

        /**
         * Mapping from object id to object
         * @type { Dict<Object3D> }
         */
        this.loadedObjectsById = {}

        /** @type { Object3D } */
        this.uploadedObject = null

        
        const container = new Group
        const categories = getCategories( props.worldData.groups )

        this.sceneManager = new SceneManager( container, categories )
        
        if ( process.env.NODE_ENV === 'development' ) {
            window.x = this
        }
    }

    async componentDidMount() {
        const { objects } = this.props

        const loadedObjectIds = {}

        const fetchedObjects = await fetchObjects( objects.oneOfEach )

        for ( let key of Object.keys( fetchedObjects ) ) {
            const curr = fetchedObjects[key]

            this.loadedObjectsById[curr.id] = curr
            loadedObjectIds[key] = curr.id
        }

        this.setState({
            loadedObjectIds
        })
    }

    componentDidUpdate( prevProps ) {
        if ( prevProps.worldData !== this.props.worldData ) {
            // // need to reset sceneManager
            // const categories = getCategories( this.props.worldData.groups )
            // this.sceneManager.reset( this.props.categories )
        }
    }

    onObjectSelected = async ( category, objectData ) => {
        let newObject
        
        try {
            newObject = await get3DObject( objectData )
        } catch ( err ) {
            console.error(
                `Something went wrong while loading object of type ${category}:\n`
                + err )
            return
        }
        
        const { loadedObjectIds } = this.state
        const currentObjectId = loadedObjectIds[category]

        // delete previous object to make sure it is garbage collected
        delete this.loadedObjectsById[currentObjectId]

        // store new object
        this.loadedObjectsById[newObject.id] = newObject
        
        // now update the id at the key of the current category
        this.setState( state => ({
            loadedObjectIds: {
                ...state.loadedObjectIds,
                [category]: newObject.id
            }
        }))
    }

    onUpload = async ( objectURL, filename ) => {
        const { name, extension } = getNameAndExtension( filename )

        let object

        try {

            object = await get3DObject({
                download_url: objectURL,
                name,
                extension
            })

        } catch ( err ) {

            console.error( err )
            return

        } finally {

            // cleanup to prevent memory leaks
            URL.revokeObjectURL( objectURL )

        }
        
        // store object to current class instance
        this.uploadedObject = object

        this.setState({
            showUploadWizard: true,
            uploadedObjectData: {
                name,
                filename,
                extension
            }
        })
    }


    getSelectedGroup = () => this.props.worldData.groups[ this.props.selectedGroupIndex ]
    getSelectedCategory = () => {
        const selectedGroup = this.getSelectedGroup()
        return selectedGroup && selectedGroup.categories[ this.props.selectedCategoryIndex ]
    }


    render() {
        const {
            worldData: { name, groups },
            objects,
            poseData
        } = this.props
        const {
            loadedObjectIds,
            showUploadWizard, uploadedObjectData
        } = this.state

        const selectedGroup = this.getSelectedGroup()
        const selectedCategory = this.getSelectedCategory()

        const selectorData = ( selectedCategory ?
            {
                objects:  objects.byCategory[ selectedCategory.name ],
                currentCategory: selectedCategory.name
            } : null
        )

        const loadedObjects = objectMap(
            loadedObjectIds,
            id => this.loadedObjectsById[id]
        )

        const wizardData = uploadedObjectData ? {
            ...uploadedObjectData,
            uploadedObject: this.uploadedObject
        } : null

        return <div className = "app">

            <ThreeContainer
                sceneManager = { this.sceneManager }
                loadedObjects = { loadedObjects }
                poseData = { poseData }
            />

            <Header>
                <h1>{ name }</h1>
            </Header>

            <div className = "editor-panel">

                <div className = "groups-container">
                    <GroupsView groups = { groups } />
                </div>
                
                <div className = "selector-container">
                    <CategoriesView categories = { selectedGroup.categories } />
                    <Selector
                        data = { selectorData }
                        onObjectSelected = { this.onObjectSelected }

                        onUpload = { this.onUpload }
                    />
                </div>
            </div>

            { showUploadWizard && (
                <UploadWizard
                    sceneManager = { this.sceneManager }

                    currentCategory = { selectedCategory }
                    
                    data = { wizardData }
                />
            )}

        </div>
    }

}

export default connect(
    state => ({
        selectedGroupIndex: state.selectedCategoryPath.groupIndex,
        selectedCategoryIndex: state.selectedCategoryPath.categoryIndex
    })
)( App )