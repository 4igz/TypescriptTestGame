// Define the profile template and let TypeScript infer its type
export const profileTemplate = {
	spawnMergeTier: 0,
	spawnTimerLevel: 0,
	maxSpawnedLevel: 0,

	money: 0,
	currentPlotLevel: 0,

	equippedPets: new Array<string>(),
	petInventory: new Array<string>(),
	// Add other properties as needed
};

// Export the inferred type for use in other files
export type ProfileTemplate = typeof profileTemplate;

export default profileTemplate;
