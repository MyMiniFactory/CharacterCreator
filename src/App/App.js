import React, { useState, useEffect } from 'react';
import cn from 'classnames';

import SettingsPopup from '../components/SettingsPopup';
import UploadWizard from '../components/UploadWizard';
import Header from '../components/Header';
import Selector from '../components/Selector';
import PartTypesView from '../components/PartTypes';
import LoadingIndicator from '../components/LoadingIndicator';
import ButtonsContainer from '../components/ButtonsContainer';
import LikeIcon from '../components/LikeIcon/LikeIcon';

import { ACCEPTED_OBJECT_FILE_EXTENSIONS, OBJECT_STATUS } from '../constants';
import { get3DObject, getObjectFromGeometry } from '../util/objectHelpers';
import {
    getNameAndExtension,
    triggerDownloadFromUrl,
    getSelectionFromHash,
    getShareUrl,
} from '../util/helpers';

import useBooleanState from '../hooks/useBooleanState';
import useMmfApi from '../hooks/useMmfApi';
import useCustomizerState from '../hooks/useCustomizerState';
import useSceneManager from '../hooks/useSceneManager';
import useLikeState from '../hooks/useLikeState';
import useCommentsState from '../hooks/useCommentsState';
import useFollowState from '../hooks/useFollowState';

import styles from './App.module.scss';
import sharedStyles from '../shared-styles/basic-button.module.scss';

import SharePopup from '../components/SharePopup';
/**
 * @type {import('react').FunctionComponent<import('../types').AppProps>}
 */
const App = props => {
    const {
        partTypes,
        partTypesArray,
        objects,
        addObject,
        setObjectStatus,

        customizerName,
        tags,
        price,
        description,
        isPrivate,
        imageUrl,
        updateSettings,

        selectedPartTypeId,
        setSelectedPartTypeId,
        selectedPartType,
        selectedParts,
        setSelectedParts,
        selectedPartsIds,
        saveSelection,
        getSavedSelection,

        addCustomizedMeshToCart,
        isSelectionInCart,
        userMustBuySelection,

        getObjectsByPartTypeId,

        computeGlobalPosition,
        getParentAttachPointPosition,
        getChildPartTypeByAttachPoint,
    } = useCustomizerState(props);

    const [uploadedObjectData, setUploadedObjectData] = useState(null);

    const [isLoading, setIsLoading] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    const [isSharePopupOpen, openSharePopup, closeSharePopup] = useBooleanState(
        false,
    );

    const api = useMmfApi(props.api);

    const likesState = useLikeState(api, props.currentUser);
    const commentsState = useCommentsState(api);
    const followState = useFollowState(api, props.currentUser);

    const { canvasContainerRef, sceneManager } = useSceneManager(
        partTypes.byId,
        props.worldData.container_rotation,
    );

    useEffect(() => {
        sceneManager.setPanEnabled(props.edit_mode);
    }, [props.edit_mode]);

    useEffect(() => {
        sceneManager.renderScene();
    }, []);

    useEffect(() => {
        async function loadParts() {
            /** @type {Record<number, number>} */
            const partMap = {};
            for (const partId of getSelectionFromHash()) {
                const part = objects.byId[partId];
                if (part) {
                    partMap[part.partTypeId] = part.id;
                }
            }

            for (const partTypeId of partTypes.allIds) {
                if (!(partTypeId in partMap)) {
                    // selection for this part type not found in hash, so use default
                    const objectsInThisPartType = getObjectsByPartTypeId(
                        partTypeId,
                    );
                    if (objectsInThisPartType.length > 0) {
                        const part = objectsInThisPartType[0];
                        partMap[part.partTypeId] = part.id;
                    }
                }
            }

            const partTypesThatCanBeLoadedIds = partTypes.sortedIds.filter(
                partTypeId => {
                    const hasParts = partTypeId in partMap;
                    if (!hasParts) {
                        return false;
                    }

                    const partType = partTypes.byId[partTypeId];
                    if (partType.parent) {
                        const parentHasParts = partType.parent.id in partMap;
                        if (!parentHasParts) {
                            return false;
                        }
                    }

                    return true;
                },
            );

            if (partTypesThatCanBeLoadedIds.length === 0) {
                return;
            }

            setIsLoading(true);

            /** @type {Record<number, import('three').Object3D} */
            const objects3DMap = {};
            const promises = partTypesThatCanBeLoadedIds.map(
                async partTypeId => {
                    const partId = partMap[partTypeId];
                    objects3DMap[partTypeId] = await get3DObject(
                        objects.byId[partId],
                    );
                },
            );

            try {
                await Promise.all(promises);

                for (const partTypeId of partTypesThatCanBeLoadedIds) {
                    sceneManager.add(partTypeId, objects3DMap[partTypeId]);
                }

                sceneManager.rescaleContainerToFitObjects(4);
                sceneManager.renderScene();
                sceneManager.saveCamera();

                setSelectedParts(partMap);
                saveSelection(partMap);
            } catch (e) {
                console.error(e);
            }

            setIsLoading(false);
        }

        loadParts();
    }, []);

    useEffect(() => {
        if (props.comments_enabled) {
            window.customEventDispatcher.dispatchEvent('CUSTOMIZER_LOADED');
        }
    }, [props.comments_enabled]);

    const showUploadWizard = Boolean(uploadedObjectData);

    const selectorData = (selectedPartType
        ? {
              selectedParts,
              objects: getObjectsByPartTypeId(selectedPartType.id),
              currentPartType: selectedPartType,
          }
        : null);

    const setSelected3dObject = (partTypeId, newObject) => {
        sceneManager.add(partTypeId, newObject);
        sceneManager.rescaleContainerToFitObjects(4);
        sceneManager.renderScene();
    };

    const setSelectedObjectId = (partTypeId, objectId) => {
        setSelectedParts(currentSelectedParts => ({
            ...currentSelectedParts,
            [partTypeId]: objectId,
        }));
    };

    const handleObjectSelected = async (partTypeId, objectData) => {
        setIsLoading(true);

        try {
            const newObject = await get3DObject(objectData);
            setSelected3dObject(partTypeId, newObject);
            setSelectedObjectId(partTypeId, objectData.id);
        } catch (err) {
            const partType = partTypes.byId[partTypeId];
            console.error(
                `Something went wrong while loading object of type ${partType.name}:\n` +
                    err,
            );
        }

        setIsLoading(false);
    };

    const handleResetSelection = async () => {
        const partMap = getSavedSelection();

        const partTypesThatCanBeLoadedIds = partTypes.sortedIds.filter(
            partTypeId => {
                const hasParts = partTypeId in partMap;
                if (!hasParts) {
                    return false;
                }

                const partType = partTypes.byId[partTypeId];
                if (partType.parent) {
                    const parentHasParts = partType.parent.id in partMap;
                    if (!parentHasParts) {
                        return false;
                    }
                }

                return true;
            },
        );

        if (partTypesThatCanBeLoadedIds.length === 0) {
            return;
        }

        setIsLoading(true);

        /** @type {Record<number, import('three').Object3D} */
        const objects3DMap = {};
        const promises = partTypesThatCanBeLoadedIds.map(async partTypeId => {
            const partId = partMap[partTypeId];
            objects3DMap[partTypeId] = await get3DObject(objects.byId[partId]);
        });

        try {
            await Promise.all(promises);

            for (const partTypeId of partTypesThatCanBeLoadedIds) {
                sceneManager.add(partTypeId, objects3DMap[partTypeId]);
            }

            sceneManager.rescaleContainerToFitObjects(4);
            sceneManager.renderScene();
            sceneManager.saveCamera();

            setSelectedParts(partMap);
        } catch (e) {
            console.error(e);
        }

        setIsLoading(false);
    };

    const handleResetCamera = () => {
        sceneManager.resetCamera();
    };

    const handleDeleteObject = async objectId => {
        const oldStatus = objects.byId[objectId].status;

        setObjectStatus(objectId, OBJECT_STATUS.LOADING);

        try {
            await api.deletePart(objectId);
            setObjectStatus(objectId, OBJECT_STATUS.DELETED);
        } catch {
            setObjectStatus(objectId, oldStatus);
            console.error(`Failed to delete object with id ${objectId}`);
        }
    };

    const handleUpload = (partTypeId, filename, objectURL) => {
        const partType = partTypes.byId[partTypeId];

        const { name, extension } = getNameAndExtension(filename);

        if (!ACCEPTED_OBJECT_FILE_EXTENSIONS.includes(extension)) {
            console.error(`Unrecognized extension '${extension}'`);
            return;
        }

        setUploadedObjectData({
            partType,
            name,
            filename,
            extension,
            objectURL,
        });
    };

    const currencySymbol =
        props.worldData.currency === 'USD' ? '$' : props.worldData.currency;
    const addToCartButtonMessage = isSelectionInCart
        ? 'Added to cart'
        : `Add To Cart (${currencySymbol} ${price})`;
    const downloadButtonMessage = 'Download';

    const handleAddToCart = async () => {
        try {
            const customizedMeshData = await api.generateCustomizedMesh(
                selectedPartsIds,
            );
            const data = await api.addToCart(customizedMeshData.id);
            addCustomizedMeshToCart(customizedMeshData);

            window.customEventDispatcher.dispatchEvent('REFRESH_CART_AMOUNT');
            window.customEventDispatcher.dispatchEvent(
                'ITEM_ADDED_TO_CART',
                data,
            );
        } catch (e) {
            window.customEventDispatcher.dispatchEvent('SHOW_LOGIN');
        }
    };

    const handleDownload = async () => {
        if (isSelectionInCart) {
            window.alert('item added to cart');
            return;
        }

        try {
            const customizedMeshData = await api.generateCustomizedMesh(
                selectedPartsIds,
            );
            const fullCustomizedMeshData = await api.getCustomizedMesh(
                customizedMeshData.id,
            );

            if (fullCustomizedMeshData.status === 1) {
                // ready for download
                triggerDownloadFromUrl(fullCustomizedMeshData.file_url);
            } else {
                // TODO add popup component

                const message = `You will receive an email when the mesh has finished processing.`;
                window.alert(message);
            }
        } catch (err) {
            console.error(err);

            if (err.response.data.error === 'access_denied') {
                window.customEventDispatcher.dispatchEvent('SHOW_LOGIN');
            }
        }
    };

    const uploadImage = async image => {
        return api.uploadImage(image);
    };

    const handleSaveChanges = async fields => {
        try {
            const updatedCustomizer = await api.patchCustomizer(fields);
            updateSettings(updatedCustomizer);
        } catch (err) {
            console.error(err);
        }
    };

    const handleCloseSettings = () => {
        setShowSettings(false);
    };

    const handleWizardCompleted = async (
        partType,
        { name, extension, objectURL, imageSrc, geometry, metadata },
    ) => {
        setIsLoading(true);
        setUploadedObjectData(null);

        const partTypeId = partType.id;

        const object = getObjectFromGeometry(geometry, metadata);

        const objectData = {
            name,
            files: {
                default: {
                    extension,
                    url: objectURL,
                },
            },
            img: imageSrc,
            extension: 'stl',
            metadata,
            partTypeId,
        };

        try {
            const id = await api.postPart(objectData);

            const objectToAdd = {
                ...objectData,
                id,
                status: OBJECT_STATUS.IN_SYNC,
            };

            setSelected3dObject(partTypeId, object);
            setSelectedObjectId(partTypeId, id);
            addObject(objectToAdd);
        } catch {
            console.error(`Failed to upload object '${name}'`);
        }

        setIsLoading(false);
    };

    const partTypesToShow = props.edit_mode
        ? partTypesArray
        : partTypesArray.filter(pt => {
              const objectsInThisPartType = getObjectsByPartTypeId(pt.id);
              return objectsInThisPartType.length > 1;
          });

    let downloadButton;
    if (userMustBuySelection) {
        downloadButton = (
            <button
                title={addToCartButtonMessage}
                className={cn(
                    sharedStyles.button,
                    styles.actionButton,
                    styles.downloadButton2,
                )}
                onClick={!isSelectionInCart ? handleAddToCart : null}
            >
                <div className={styles.word}>
                    {isSelectionInCart ? (
                        'Added to cart'
                    ) : (
                        <>
                            Add To Cart
                            <br />({currencySymbol} {price})
                        </>
                    )}
                </div>
                <span className={styles.icon}>
                    <i className="fa fa-arrow-down" aria-hidden="true"></i>
                </span>
            </button>
        );
    } else {
        downloadButton = (
            <button
                title="Download"
                className={cn(
                    sharedStyles.button,
                    styles.downloadButton2,
                    styles.actionButton,
                )}
                onClick={handleDownload}
            >
                <div className={styles.word}>Download</div>
                <span className={styles.icon}>
                    <i className="fa fa-arrow-down" aria-hidden="true"></i>
                </span>
            </button>
        );
    }

    return (
        <div className={styles.app}>
            <div
                className={styles.canvasContainer}
                ref={canvasContainerRef}
            ></div>

            {isLoading && (
                <div className={styles.canvasOverlay}>
                    <LoadingIndicator />
                </div>
            )}

            <div className={styles.gridContainer}>
                <Header
                    className={styles.header}
                    title={customizerName}
                    user={props.worldData.user}
                    currentUser={props.currentUser}
                    isFollowing={followState.isFollowing}
                    handleFollow={followState.handleFollow}
                    comments_enabled={props.comments_enabled}
                />

                <div className={styles.partTypes}>
                    <PartTypesView
                        partTypes={partTypesToShow.map(pt => {
                            const parent = pt.parent;
                            const isDisabled = !parent
                                ? false
                                : getObjectsByPartTypeId(parent.id).length ===
                                  0;

                            return {
                                id: pt.id,
                                name: pt.name,
                                selected: pt.id === selectedPartTypeId,
                                disabled: isDisabled,
                            };
                        })}
                        onPartTypeSelected={id => setSelectedPartTypeId(id)}
                    />
                </div>

                <div className={styles.selectorContainer}>
                    <Selector
                        data={selectorData}
                        onObjectSelected={handleObjectSelected}
                        onDelete={handleDeleteObject}
                        onUpload={handleUpload}
                        edit_mode={props.edit_mode}
                    />
                </div>

                {props.comments_enabled && (
                    <div className={styles.buttonsContainer2}>
                        <button
                            title="Like"
                            className={cn(
                                sharedStyles.button,
                                styles.actionButton,
                                styles.like,
                            )}
                            onClick={likesState.handleLike}
                        >
                            <LikeIcon liked={likesState.isLiked} />
                            <span className={styles.count}>
                                {likesState.isLoading ? (
                                    <i
                                        className="fa fa-spinner fa-spin"
                                        aria-hidden="true"
                                    ></i>
                                ) : (
                                    likesState.likeCount
                                )}
                            </span>
                        </button>
                        <button
                            title="Comment"
                            className={cn(
                                sharedStyles.button,
                                styles.actionButton,
                                styles.comment,
                            )}
                            onClick={() => {
                                window.customEventDispatcher.dispatchEvent(
                                    'CUSTOMIZER_COMMENTS_CLICKED',
                                );
                            }}
                        >
                            <i className="fa fa-comment" aria-hidden="true"></i>
                            <span className={styles.count}>
                                {commentsState.isLoading ? (
                                    <i
                                        className="fa fa-spinner fa-spin"
                                        aria-hidden="true"
                                    ></i>
                                ) : (
                                    commentsState.commentsCount
                                )}
                            </span>
                        </button>
                        <button
                            title="Share"
                            className={cn(
                                sharedStyles.button,
                                styles.actionButton,
                                styles.share,
                            )}
                            onClick={openSharePopup}
                        >
                            <i
                                className="fa fa-share-alt"
                                aria-hidden="true"
                            ></i>
                        </button>
                        {downloadButton}
                    </div>
                )}

                <div className={styles.buttonsContainer}>
                    <ButtonsContainer
                        addToCartButtonMessage={addToCartButtonMessage}
                        downloadButtonMessage={downloadButtonMessage}
                        userMustBuySelection={userMustBuySelection}
                        isSelectionInCart={isSelectionInCart}
                        onDownload={handleDownload}
                        onAddToCart={handleAddToCart}
                        partTypes={partTypesArray}
                        onUpload={handleUpload}
                        onShowSettings={() => setShowSettings(true)}
                        edit_mode={props.edit_mode}
                        comments_enabled={props.comments_enabled}
                    />
                </div>

                {!props.edit_mode && (
                    <a
                        className={styles.createYourOwn}
                        href={props.api.routes.createCustomizer}
                    >
                        <span className={styles.emphasised}>
                            Are you a designer?&nbsp;
                        </span>
                        <br />
                        Make your own customizer here!
                    </a>
                )}
            </div>

            {showUploadWizard && (
                <UploadWizard
                    getGlobalPosition={computeGlobalPosition}
                    getParentAttachPointPosition={getParentAttachPointPosition}
                    getChildPartTypeByAttachPoint={
                        getChildPartTypeByAttachPoint
                    }
                    data={uploadedObjectData}
                    showLoader={() => setIsLoading(true)}
                    hideLoader={() => setIsLoading(false)}
                    onWizardCanceled={() => setUploadedObjectData(null)}
                    onWizardCompleted={handleWizardCompleted}
                />
            )}

            {showSettings && (
                <div className={styles.settingsBackdrop}>
                    <SettingsPopup
                        className={styles.settingsPopup}
                        name={customizerName}
                        price={price}
                        currency={props.worldData.currency}
                        tags={tags}
                        description={description}
                        isPrivate={isPrivate}
                        imageUrl={imageUrl}
                        onSave={handleSaveChanges}
                        onClose={handleCloseSettings}
                        userCanSetPrice={props.canPublishToStore}
                        uploadImage={uploadImage}
                    />
                </div>
            )}

            <SharePopup
                url={getShareUrl(props.worldData.url, selectedPartsIds)}
                title={props.worldData.name}
                description={props.worldData.description}
                open={isSharePopupOpen}
                onClose={closeSharePopup}
            />
        </div>
    );
};

export default App;
