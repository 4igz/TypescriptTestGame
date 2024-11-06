import React from "@rbxts/react";
import ReactRoblox from "@rbxts/react-roblox";
import { CollectionService } from "@rbxts/services";
import { GateUi } from "client/reactComponents/gateUi";
import { GAME_CONSTANTS } from "shared/sharedConstants";

const GateUiController = (gatePart: BasePart, price: number) => {
	if (!gatePart) {
		throw "Container not found.";
	}

	const root = ReactRoblox.createRoot(gatePart);
	root.render(<GateUi price={price} gateName={gatePart.Name} />);

	return {
		unmount: () => {
			root.unmount();
		},
	};
};

for (const gate of CollectionService.GetTagged(GAME_CONSTANTS.GATE_TAG) || []) {
	const gatePart = gate.FindFirstChild("GatePart") as BasePart;
	if (gatePart) {
		const component = GateUiController(gatePart, 100);
	}
}
