import React from "@rbxts/react";
import { useEffect } from "@rbxts/react";
import { useMotion } from "client/hooks/useMotion";
import { springs } from "client/utils/springs";

interface MoneyDisplayProps {
	money: number;
}

export function MoneyDisplay(props: MoneyDisplayProps) {
	const [offset, offsetMotion] = useMotion(new Vector3(0, 1, 0));

	useEffect(() => {
		offsetMotion.spring(new Vector3(0, 5, 0), springs.bubbly);
	});

	return (
		<billboardgui
			key={"BillboardGui"}
			Active={true}
			ClipsDescendants={true}
			LightInfluence={1}
			Size={UDim2.fromScale(4, 1)}
			StudsOffsetWorldSpace={offset}
			ZIndexBehavior={Enum.ZIndexBehavior.Sibling}
		>
			<textlabel
				key={"TextLabel"}
				BackgroundColor3={Color3.fromRGB(255, 255, 255)}
				BackgroundTransparency={1}
				BorderColor3={Color3.fromRGB(0, 0, 0)}
				// TextTransparency={to.getValue().transparency}
				BorderSizePixel={2}
				FontFace={new Font("rbxasset://fonts/families/FredokaOne.json")}
				Size={UDim2.fromScale(1, 1)}
				Text={`+$${math.floor(props.money)}`}
				TextColor3={Color3.fromRGB(40, 250, 3)}
				TextScaled={true}
				TextSize={14}
				TextStrokeColor3={Color3.fromRGB(255, 255, 255)}
				TextStrokeTransparency={0}
				TextWrapped={true}
			/>
		</billboardgui>
	);
}
