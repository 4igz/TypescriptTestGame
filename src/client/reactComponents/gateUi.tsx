import React from "@rbxts/react";
import { simplifyNumber } from "shared/utils/numberUtil";

export interface GateUiProps {
	price: number;
	gateName: string;
}

export function GateUi(props: GateUiProps) {
	return (
		<surfacegui
			ClipsDescendants={true}
			Face={Enum.NormalId.Right}
			LightInfluence={1}
			MaxDistance={300}
			key={"BG"}
			SizingMode={Enum.SurfaceGuiSizingMode.PixelsPerStud}
			ZIndexBehavior={Enum.ZIndexBehavior.Sibling}
		>
			<textlabel
				AnchorPoint={new Vector2(0.5, 0.5)}
				AutomaticSize={Enum.AutomaticSize.XY}
				BackgroundColor3={Color3.fromRGB(255, 255, 255)}
				BackgroundTransparency={1}
				BorderColor3={Color3.fromRGB(0, 0, 0)}
				BorderSizePixel={4}
				FontFace={new Font("rbxasset://fonts/families/FredokaOne.json")}
				key={"Name"}
				Position={UDim2.fromScale(0.5, 0.3)}
				RichText={true}
				Size={new UDim2(0.3, 0, 0.2, -15)}
				SizeConstraint={Enum.SizeConstraint.RelativeYY}
				Text={props.gateName}
				TextColor3={Color3.fromRGB(255, 255, 255)}
				TextScaled={true}
				TextSize={100}
				TextStrokeTransparency={0}
				TextWrapped={true}
			>
				<uiaspectratioconstraint
					key={"UIAspectRatioConstraint"}
					AspectRatio={3}
					AspectType={Enum.AspectType.ScaleWithParentSize}
				/>
			</textlabel>

			<textlabel
				AnchorPoint={new Vector2(0.5, 0.5)}
				AutomaticSize={Enum.AutomaticSize.XY}
				BackgroundColor3={Color3.fromRGB(255, 255, 255)}
				BackgroundTransparency={1}
				BorderColor3={Color3.fromRGB(0, 0, 0)}
				BorderSizePixel={4}
				FontFace={new Font("rbxasset://fonts/families/FredokaOne.json")}
				Interactable={false}
				key={"Price"}
				Position={UDim2.fromScale(0.5, 0.4)}
				RichText={true}
				Size={UDim2.fromScale(0.4, 0.4)}
				Text={`$${simplifyNumber(props.price)}`}
				TextColor3={Color3.fromRGB(255, 255, 255)}
				TextScaled={true}
				TextSize={100}
				TextStrokeColor3={Color3.fromRGB(0, 255, 42)}
				TextStrokeTransparency={0}
				TextWrapped={true}
			>
				<uisizeconstraint key={"UISizeConstraint"} MaxSize={new Vector2(2e4, 200)} />
			</textlabel>

			<imagebutton
				AnchorPoint={new Vector2(0.5, 0.5)}
				BackgroundColor3={Color3.fromRGB(255, 255, 255)}
				BackgroundTransparency={1}
				BorderColor3={Color3.fromRGB(0, 0, 0)}
				BorderSizePixel={0}
				Image={"rbxassetid://87539997558543"}
				ImageColor3={Color3.fromRGB(159, 159, 159)}
				key={"Buy"}
				Position={UDim2.fromScale(0.5, 0.5)}
				Size={UDim2.fromScale(0.2, 0.2)}
			/>
		</surfacegui>
	);
}
