import headElements from "../library/heads.js";
import leftHandElements from "../library/left_hands.js";
import rightHandElements from "../library/right_hands.js";
import leftArmElements from "../library/left_arms.js";
import rightArmElements from "../library/right_arms.js";
import torsoElements from "../library/torso.js";
import leftFootElements from "../library/left_feet.js";
import rightFootElements from "../library/right_feet.js";
import leftLegElements from "../library/left_legs.js";
import rightLegElements from "../library/right_legs.js";
import standElements from "../library/stands.js";
import poseElements from "../library/poses.js";

// import { LibraryItem } from "./libraryData.ts"; // interface for items in the library

/**
 * wrapper around the local library of body parts
 */
const libraryUtils = {
	libraries: {
		head: {
			data: headElements,
			categoryHasLeftAndRightDistinction: false,
			meshType: "Head"
		},
		hand: {
			data: {
				left: leftHandElements,
				right: rightHandElements
			},
			categoryHasLeftAndRightDistinction: true,
			meshType: {
				left: "HandL",
				right: "HandR"
			}
		},
		arm: {
			data: {
				left: leftArmElements,
				right: rightArmElements
			},
			categoryHasLeftAndRightDistinction: true,
			meshType: {
				left: "ArmL",
				right: "ArmR"
			}
		},
		torso: {
			data: torsoElements,
			categoryHasLeftAndRightDistinction: false,
			meshType: "Torso"
		},
		foot: {
			data: {
				left: leftFootElements,
				right: rightFootElements
			},
			categoryHasLeftAndRightDistinction: true,
			meshType: {
				left: "FootL",
				right: "FootR"
			}
		},
		leg: {
			data: {
				left: leftLegElements,
				right: rightLegElements
			},
			categoryHasLeftAndRightDistinction: true,
			meshType: {
				left: "LegL",
				right: "LegR"
			}
		},
		pose: {
			data: poseElements,
			categoryHasLeftAndRightDistinction: false,
			meshType: undefined
		},
		stand: {
			data: standElements,
			categoryHasLeftAndRightDistinction: false,
			meshType: undefined
		}	
	},

	/**
	 * returns the local data about a body part
	 * @param {String} category - the body part (i.e. "head", "leg")
	 * @param {Boolean} isLeft
	 * @returns {Array<LibraryItem>} - a list of Data objects with info about the body part
	 */
	getLibrary(category, isLeft) {
		const currentCategoryInfo = this.libraries[category];
		const {
			categoryHasLeftAndRightDistinction,
			data
		} = currentCategoryInfo;
	
		const side = isLeft ? "left" : "right";
		return categoryHasLeftAndRightDistinction ? data[side] : data;
	},

	hasLeftAndRightDistinction(category) {
		const { categoryHasLeftAndRightDistinction } = this.libraries[category];
		return categoryHasLeftAndRightDistinction;
	},

	getMeshType(category, isLeft) {
		const currentCategoryInfo = this.libraries[category];
		const {
			categoryHasLeftAndRightDistinction,
			meshType
		} = currentCategoryInfo;
	
		const side = isLeft ? "left" : "right";
		return categoryHasLeftAndRightDistinction ? meshType[side] : meshType;
	}
};


export default libraryUtils;