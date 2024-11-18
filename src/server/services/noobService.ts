import { Service, OnStart, Flamework, OnTick } from "@flamework/core";
import { CollectionService, Players, RunService, ServerStorage, Workspace } from "@rbxts/services";
import { Events } from "server/network";
import baseNoobConfig, { NoobConfig } from "shared/configs/noobConfig";
import { GAME_CONSTANTS } from "shared/sharedConstants";
import { ProfileService } from "./profileService";
import { Plot, PlotService } from "./plotService";
import { ProfileTemplate } from "server/profileTemplate";

@Service({})
export class NoobService implements OnStart, OnTick {
	private noobFolder = ServerStorage.WaitForChild("Noobs");
	private playerCooldowns = new Map<Player, number>();
	private spawnedNoobContainer = Workspace.WaitForChild("SpawnedNoobs");

	constructor(private profileService: ProfileService, private plotService: PlotService) {}

	onTick(dt: number): void {
		// Randomly spawn noobs on plots for players to merge
		// The noob tier will be based on the player's merge tier level
		for (const player of Players.GetPlayers()) {
			const profile = this.profileService.getProfile(player);
			if (!profile) continue;

			// Handle cooldowns on spawning noobs
			const cooldown = GAME_CONSTANTS.DEFAULT_SPAWN_TIMER - profile.Data.spawnTimerLevel;
			if (!this.playerCooldowns.has(player)) {
				this.playerCooldowns.set(player, 0);
			}
			if (this.playerCooldowns.get(player)! > tick()) continue;
			this.playerCooldowns.set(player, tick() + cooldown);

			// Get the player's plot
			const plot = this.plotService.getPlayersPlot(player);
			if (!plot || !plot.currentPlotBase) continue;

			this.spawnNoobInPlot(plot, profile, player);
		}
	}

	onStart() {
		Events.dragNoob.connect((player, currentNoob, noobPosition) => {
			// Place the noob at the position on the server now
			if (!currentNoob || !currentNoob.IsDescendantOf(Workspace)) return;
			currentNoob.PrimaryPart?.SetNetworkOwner(player);
			currentNoob.PivotTo(new CFrame(noobPosition));
		});

		Events.mergeNoobs.connect((player, initialNoob, targetNoob) => {
			// Merge both noobs into the next noob
			assert(
				initialNoob.GetAttribute(GAME_CONSTANTS.NOOB_ID_ATTR) ===
					targetNoob.GetAttribute(GAME_CONSTANTS.NOOB_ID_ATTR),
				"Noobs must both have the same Id to merge",
			);
			assert(
				initialNoob.GetAttribute(GAME_CONSTANTS.OWNER_ATTRIBUTE) === player.UserId,
				"Player must own noob to merge it",
			);
			assert(
				targetNoob.GetAttribute(GAME_CONSTANTS.OWNER_ATTRIBUTE) === player.UserId,
				"Player must own noob to merge it",
			);
			const profile = this.profileService.getProfile(player);
			const plotLevel = profile?.Data.currentPlotLevel;
			const noobId = initialNoob.PrimaryPart?.GetAttribute(GAME_CONSTANTS.NOOB_ID_ATTR) as number;

			if (plotLevel === undefined || noobId === undefined) {
				return;
			}
			if (plotLevel !== undefined && noobId < baseNoobConfig[plotLevel].size() - 1) {
				const nextNoobConfig = baseNoobConfig[plotLevel][noobId + 1];
				const newNoob = this.noobFolder.FindFirstChild(nextNoobConfig.name);
				assert(newNoob, `Noob ${nextNoobConfig.name} not found in NoobFolder`);

				// Sucessfully merged
				this.plotService.removeNoobForPlayer(player, initialNoob);
				this.plotService.removeNoobForPlayer(player, targetNoob);
				initialNoob.Destroy();
				targetNoob.Destroy();
				if (newNoob) {
					const clonedNoob = newNoob.Clone() as Model;
					assert(clonedNoob.PrimaryPart, `Noob ${nextNoobConfig.name} must have a PrimaryPart`);
					clonedNoob.PivotTo(targetNoob.GetPivot());
					this.plotService.registerNoobForPlayer(player, clonedNoob);
					clonedNoob.Parent = this.spawnedNoobContainer;

					task.defer(() => {
						clonedNoob.PrimaryPart?.SetNetworkOwner(player);
					});
				}
			}
		});

		// Init initial noobs, these are usually for testing
		CollectionService.GetTagged(GAME_CONSTANTS.NOOB_TAG).forEach((noobInstance) => {
			assert(noobInstance.IsA("BasePart"), "Noob tagged parts must be BaseParts");
			this.onNoobAdded(noobInstance);
		});

		CollectionService.GetInstanceAddedSignal(GAME_CONSTANTS.NOOB_TAG).Connect((noobInstance) => {
			assert(noobInstance.IsA("BasePart"), "Noob tagged parts must be BaseParts");
			this.onNoobAdded(noobInstance);
		});
	}

	spawnNoobInPlot(plot: Plot, profile: { Data: ProfileTemplate }, player: Player) {
		// Spawn a noob based on their spawn merge tier randomly on the plot
		if (!plot.currentPlotBase) return;

		if (plot.spawnedNoobs.size() >= GAME_CONSTANTS.DEFAULT_SPAWN_NUM * (profile.Data.maxSpawnedLevel + 1)) return;
		const noobConfig = baseNoobConfig[profile.Data.currentPlotLevel][profile.Data.spawnMergeTier];
		assert(
			noobConfig,
			"Noob config not found, check if the plotLevel or spawnMergeTier is less than the noobConfig size",
		);
		const noob = this.noobFolder.FindFirstChild(noobConfig.name) as Model;
		const randomPosition = plot.currentPlotBase?.Position.add(
			new Vector3(
				math.random(-plot.currentPlotBase.Size.X / 2, plot.currentPlotBase.Size.X / 2),
				3,
				math.random(-plot.currentPlotBase.Size.Z / 2, plot.currentPlotBase.Size.Z / 2),
			),
		);
		assert(noob, `Noob ${noobConfig.name} not found in NoobFolder`);
		const clonedNoob = noob?.Clone() as Model;
		assert(clonedNoob.PrimaryPart, `Noob ${noobConfig.name} must have a PrimaryPart`);
		clonedNoob.PrimaryPart.Position = randomPosition;
		clonedNoob.Parent = this.spawnedNoobContainer;
		this.plotService.registerNoobForPlayer(player, clonedNoob);

		task.defer(() => {
			clonedNoob.PrimaryPart?.SetNetworkOwner(player);
		});
	}

	onNoobAdded(noobInstance: BasePart) {
		const model = noobInstance.Parent as Model;
		assert(
			model !== undefined && typeIs(model, "Instance") && model.IsA("Model"),
			"Noob tagged parts must be parented to a model",
		);

		// Retrieve the config by name
		const result = this.lookupNoob(model.Name);
		assert(result !== undefined, "Noob type not found in noob config");
		noobInstance.SetAttribute(GAME_CONSTANTS.NOOB_ID_ATTR, result.index);
	}

	lookupNoob(name: string): { noob: NoobConfig; index: number } | undefined {
		for (let i = 0; i < baseNoobConfig.size(); i++) {
			for (const noob of baseNoobConfig[i]) {
				if (noob.name === name) {
					return { noob, index: baseNoobConfig[i].indexOf(noob) };
				}
			}
		}
		error(`NoobType not found in noob config: ${name}`);
	}

	getNextNoobConfig(index: number) {
		return baseNoobConfig[index + 1];
	}
}
