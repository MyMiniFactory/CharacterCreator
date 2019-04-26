import React, { Component } from 'react'

import ContextMenu from './ContextMenu'
import ImportButton from '../ImportButton'

import { ACCEPTED_OBJECT_FILE_EXTENSIONS } from '../../constants'

import './Selector.css'

class Selector extends Component {
    constructor( props ) {
        super( props )
    }

    handleClick = object => {
        const {
            onObjectSelected,
            data
        } = this.props

        onObjectSelected( data.currentCategory, object )
    }

    handleUpload = ( fileName, objectURL ) => {
        const { data, onUpload } = this.props

        if ( typeof onUpload === 'function' ) {
            onUpload( data.currentCategory, fileName, objectURL )
        }
    }

    handleDelete = ( object, isLastElement ) => {
        const { onDelete } = this.props

        const messages = [ `Are you sure you want to delete ${object.name}?` ]

        if ( isLastElement ) {
            messages.push(
                'This is the only part left for this part type.',
                'If you delete this part, your model might not load next time!'
            )
        }

        const answer = window.confirm( messages.join('\n') )

        if ( answer && typeof onDelete === 'function' ) {
            onDelete( object.id )
        }
    }

    render() {
        const { data } = this.props

        if ( !data ) {
            return (
                <div className = "selector">
                    <p>Select a category!</p>
                </div>
            )
        }

        const { objects, currentCategory } = data

        const elementDiv = objects.map( ( object, index, objectsArray ) => {
            const menuItems = (
                <div
                    className = "selector-item-menu"
                    onMouseDown = { () => this.handleDelete( object, objectsArray.length === 1 ) }
                >
                    Delete Part
                </div>
            )

            return (
                <ContextMenu
                    className = "selector-item"
                    onClick = { () => this.handleClick( object ) }

                    menuItems = { menuItems }
                    key = { object.id || object.name }
                >
                    <div
                        className = "img"
                        style = {{ backgroundImage: `url(${object.img})` }}
                    />
                    <div className = "unselectable item-name">
                        { object.name }
                    </div>
                </ContextMenu>
            )
        })


        return <>
            <div className = "selector">
                { elementDiv }
            </div>


            <ImportButton
                className = "import-button"
                key = "__add__button__"
                onFileLoaded = { this.handleUpload }
                accept = { ACCEPTED_OBJECT_FILE_EXTENSIONS.map( extension => `.${extension}` ).join(',') }
            >
                Add new { currentCategory }
            </ImportButton>
        </>
    }
}

export default Selector