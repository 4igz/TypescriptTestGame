// petConfig.ts

export interface PetConfig {
	displayName: string;
	incomeMultiplier: number;
	rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
}

type PetModelName = string;

export const petConfig: Record<PetModelName, PetConfig> = {
	["GrayBlockPet"]: {
		displayName: "Basic Block",
		incomeMultiplier: 1.1,
		rarity: "common",
	},
};

export const DEFAULT_PET_ID = 1;
