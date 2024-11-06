import { Networking } from "@flamework/networking";

interface ClientToServerEvents {
	dragNoob(currentNoob: Model, noobPosition: Vector3): void;
	mergeNoobs(initialNoob: Model, targetNoob: Model): void;
}

interface ServerToClientEvents {
	displayMoney(noob: Model, money: number): void;
}

interface ClientToServerFunctions {}

interface ServerToClientFunctions {}

export const GlobalEvents = Networking.createEvent<ClientToServerEvents, ServerToClientEvents>();
export const GlobalFunctions = Networking.createFunction<ClientToServerFunctions, ServerToClientFunctions>();
