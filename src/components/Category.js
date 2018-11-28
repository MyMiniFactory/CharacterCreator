import React, { Component } from "react";

// Loading Assets (SubComponents & CSS)
import Selector from "./Selector";
import "../css/category.css";

class Category extends Component {
	constructor(props) {
		super(props);
		this.state = {
			isLeft: true
		};
	}

	// Update the state of parent App from child Component
	updateLeft = isLeft => {
		this.setState({ isLeft });
	};

	render() {
		// Passing throught the state from the properties
		const categories = this.props.category;
		const current = this.props.currentCategory;

		const categoryDiv = categories.map( ( category, index ) => {
			const { name, imgPath } = category;

			return ( name === current ) ? (
				<div className="category selected-category" key={index}>
					<img src={process.env.PUBLIC_URL + imgPath} alt={name} />
				</div>
			) : (
				<div
					className="category"
					key={index}
					onClick={() => {
						this.props.updateCategory(category);
						var MeshType = undefined;
						switch (name) {
							case "head":
								MeshType = "Head";
								break;
							case "hand":
								MeshType = this.state.isLeft
									? "HandL"
									: "HandR";
								break;
							case "arm":
								MeshType = this.state.isLeft
									? "ArmL"
									: "ArmR";
								break;
							case "torso":
								MeshType = "Torso";
								break;
							case "foot":
								MeshType = this.state.isLeft
									? "FootL"
									: "FootR";
								break;
							case "leg":
								MeshType = this.state.isLeft
									? "LegL"
									: "LegR";
								break;
							case "pose":
								MeshType = "pose";
								break;
							case "stand":
								MeshType = "mesh-stand";
								break;
							default:
								MeshType = undefined;
						}
						if (MeshType) {
							window.selectedMesh(MeshType);
						}
					}}
				>
					<img src={process.env.PUBLIC_URL + imgPath} alt={name} />
				</div>
			)
		} )

		if (this.props.UIDisplayed) {
			return (
				<div className="abs top right panel">
					<div className="abs top left left-side unselectable">
						{categoryDiv}
					</div>
					<Selector
						currentCategory={this.props.currentCategory}
						isLeft={this.state.isLeft}
						updateLeft={this.updateLeft}
						// updatePose={this.props.updatePose}
						loadedMeshes={this.props.loadedMeshes}
						updateMeshes={this.props.updateMeshes}
						updatePopup={this.props.updatePopup}
						updatePopupMessage={this.props.updatePopupMessage}
						editor={this.props.editor}
						updateLoading={this.props.updateLoading}
					/>
				</div>
			);
		} else {
			return <div />;
		}
	}
}

export default Category;
