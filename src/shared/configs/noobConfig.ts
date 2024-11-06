export interface NoobConfig {
	readonly name: string;
	readonly production: number;
}

const baseNoobConfig: Array<Array<NoobConfig>> = [
	// First tier of noobs, spawned on the first baseplate.
	[
		{ name: "BabyNoob", production: 10 },
		{ name: "Noob", production: 25 },
		{ name: "AngryNoob", production: 60 },
		{ name: "TrollNoob", production: 150 },
		{ name: "CookNoob", production: 350 },
		{ name: "RichNoob", production: 800 },
		{ name: "KingNoob", production: 2000 },
		{ name: "BigNoob", production: 5000 },
	],
	// Following baseplates are defined here
	[{ name: "GhostNoob", production: 10000 }],
];

export default baseNoobConfig;
