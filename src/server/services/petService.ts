import { Service, OnStart, OnTick } from "@flamework/core";
import { CollectionService, Players, RunService, ServerStorage, Workspace } from "@rbxts/services";
import { GAME_CONSTANTS } from "shared/sharedConstants";
import { ProfileService } from "./profileService";
import { petConfig } from "shared/configs/petConfig";

@Service({})
export class PetService implements OnStart, OnTick {
	private workspaceStorageContainer = Workspace.WaitForChild("Pets");
	private petFolder = ServerStorage.WaitForChild("Pets");

	private pets = new Array<BasePart>();

	constructor(private readonly profileService: ProfileService) {}

	onStart() {
		Players.PlayerAdded.Connect((player) => {});

		this.profileService.onProfileLoaded.Connect((player) => {
			// Add the basic pet to the player's equipped pets
			const petName = "GrayBlockPet";
			const pet = this.petFolder.FindFirstChild(petName) as BasePart;
			if (pet) {
				const newPet = pet.Clone();
				newPet.SetAttribute(GAME_CONSTANTS.OWNER_ATTRIBUTE, player.UserId);
				this.equipPet(player, petName, true);
				newPet.Parent = this.workspaceStorageContainer;
			}
		});

		Players.PlayerRemoving.Connect((player) => {
			const playerPets = this.workspaceStorageContainer.GetChildren().filter((child) => {
				return child.IsA("BasePart") && child.GetAttribute(GAME_CONSTANTS.OWNER_ATTRIBUTE) === player.UserId;
			});
			playerPets.forEach((pet) => {
				pet.Destroy();
				const index = this.pets.indexOf(pet as BasePart);
				if (index > -1) {
					this.pets.remove(index);
				}
			});
		});

		CollectionService.GetInstanceAddedSignal("Pet").Connect((pet) => {
			this.onPetAdded(pet);
		});

		RunService.Heartbeat.Connect((dt) => {
			this.onTick(dt);
		});
	}

	onTick(dt: number): void {
		// Update pets here
		this.pets.forEach((pet) => {
			const ownerId = pet.GetAttribute(GAME_CONSTANTS.OWNER_ATTRIBUTE) as number;
			const owner = Players.GetPlayerByUserId(ownerId);
			if (owner && owner.Character) {
				const humanoidRootPart = owner.Character.FindFirstChild("HumanoidRootPart") as BasePart;
				if (humanoidRootPart) {
					pet.CFrame = pet.CFrame.Lerp(
						humanoidRootPart.CFrame.mul(new CFrame(4, 2, 0)),
						GAME_CONSTANTS.PET_SMOOTHING,
					);
				}
			}
		});
	}

	public equipPet(player: Player, petName: string, bypassInventory: boolean = false) {
		const profile = this.profileService.getProfile(player);
		if (!profile) return;
		if (bypassInventory || profile.Data.petInventory.includes(petName)) {
			profile.Data.equippedPets.push(petName);
			this.profileService.setProfile(player, profile);
		}
	}

	public getPlayerPetMultiplier(player: Player): number {
		const profile = this.profileService.getProfile(player);
		let totalMult = 1;
		for (const pet of profile?.Data.equippedPets || []) {
			const cfg = petConfig[pet];
			if (cfg) {
				return (totalMult *= cfg.incomeMultiplier);
			}
		}
		return totalMult;
	}

	private onPetAdded(pet: Instance) {
		assert(pet.IsA("BasePart"), "Pet must be a BasePart");
		this.pets.push(pet as BasePart);
	}
}
