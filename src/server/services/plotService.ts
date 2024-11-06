import { Service, OnStart, OnTick } from "@flamework/core";
import { CollectionService, Players } from "@rbxts/services";
import baseNoobConfig from "shared/configs/noobConfig";
import { GAME_CONSTANTS } from "shared/sharedConstants";
import { ProfileService } from "./profileService";
import { Events } from "server/network";
import { ProfileTemplate } from "server/profileTemplate";
import { PetService } from "./petService";

export interface Plot {
	owner: Player | undefined;
	plotModel: Model;
	spawnedNoobs: Array<Model>;
	currentPlotNum: number | undefined;
	currentPlotBase: BasePart | undefined;
}

@Service({})
export class PlotService implements OnStart, OnTick {
	private plots: Array<Plot> = CollectionService.GetTagged("Plot").map((plot) => {
		assert(plot.IsA("Model"), "Plot must be a Model");
		return {
			owner: undefined,
			plotModel: plot,
			spawnedNoobs: new Array<Model>(),
			currentPlotBase: undefined,
			currentPlotNum: undefined,
		};
	});

	constructor(private readonly profileService: ProfileService, private readonly petService: PetService) {}

	onStart() {
		// For each player we will create a plot for them
		this.profileService.onProfileLoaded.Connect((player, profile) => {
			const plot = this.getAvailablePlot();

			if (plot) {
				plot.owner = player;

				plot.currentPlotNum = profile.Data.currentPlotLevel;
				const playerPlot = plot.plotModel.FindFirstChild(profile.Data.currentPlotLevel + 1);
				assert(playerPlot, `Plot level ${profile.Data.currentPlotLevel} not found for player ${player.Name}`);
				assert(playerPlot.IsA("BasePart"), "Plot level must be a BasePart");
				plot.currentPlotBase = playerPlot as BasePart;

				const spawnLocation = plot.plotModel.FindFirstChild("SpawnLocation") as SpawnLocation | undefined;
				assert(spawnLocation, `SpawnLocation not found in plot model: ${plot.plotModel}`);
				player.RespawnLocation = spawnLocation;

				if (!player.Character) {
					player.CharacterAdded.Wait();
				}
				task.defer(() => {
					player.LoadCharacter();
				});

				this.openGates(player);
			}
		});

		Players.PlayerRemoving.Connect((player) => {
			const plot = this.getPlayersPlot(player);
			if (plot) {
				plot.owner = undefined;
			}
		});
	}

	onTick() {
		// For each noob on every plot, we will make sure it's within the bounds, generating money, walking around randomly, etc
		for (const plot of this.plots) {
			if (!plot.owner || !plot.currentPlotBase) continue;
			const plotPosition = plot.currentPlotBase.Position;
			const plotSize = plot.currentPlotBase.Size;

			const randomPosition = plotPosition.add(
				new Vector3(
					math.random(-plotSize.X / 2, plotSize.X / 2),
					2,
					math.random(-plotSize.Z / 2, plotSize.Z / 2),
				),
			);
			for (const noob of plot.spawnedNoobs) {
				// Check if noob is outside the plot bounds
				this.checkInsideBounds(noob, plot, randomPosition);

				// Make noob walk around the plot randomly
				this.walkAround(noob, plot, randomPosition);

				// Make em generate money
				const profile = this.profileService.getProfile(plot.owner!);

				if (profile) {
					this.generateMoney(noob, plot, profile);
				}
			}
		}
	}

	checkInsideBounds(noob: Model, plot: Plot, failPosition: Vector3) {
		if (!plot.currentPlotBase) return;
		const plotPosition = plot.currentPlotBase.Position;
		const plotSize = plot.currentPlotBase.Size;
		const noobPosition = noob.GetPivot();
		if (
			noobPosition.X < plotPosition.X - plotSize.X / 2 ||
			noobPosition.X > plotPosition.X + plotSize.X / 2 ||
			noobPosition.Z < plotPosition.Z - plotSize.Z / 2 ||
			noobPosition.Z > plotPosition.Z + plotSize.Z / 2
		) {
			// Teleport noob back to a random position within the plot
			noob.PivotTo(new CFrame(failPosition));
		}
	}

	walkAround(noob: Model, plot: Plot, randomPosition: Vector3) {
		if (noob.GetAttribute(GAME_CONSTANTS.NOOB_WALKING_ATTR) !== true) {
			const humanoid = noob.FindFirstChildOfClass("Humanoid");
			if (humanoid) {
				noob.SetAttribute(GAME_CONSTANTS.NOOB_WALKING_ATTR, true);
				humanoid.MoveTo(randomPosition);

				humanoid.MoveToFinished.Once(() => {
					noob.SetAttribute(GAME_CONSTANTS.NOOB_WALKING_ATTR, false);
				});
			}
		}
	}

	openGates(player: Player) {
		const plot = this.getPlayersPlot(player);
		const profile = this.profileService.getProfile(player);
		const plotLevel = profile?.Data.currentPlotLevel;
		if (!plot || !plot.plotModel || !plotLevel) return;

		for (const gate of CollectionService.GetTagged(GAME_CONSTANTS.GATE_TAG)) {
			if (!gate.IsDescendantOf(plot.plotModel)) continue;
			assert(gate.IsA("Model"), "Gate must be a Model");
			assert(gate.FindFirstChild("GatePart"), "Gate must have a GatePart");
			const gatePart = gate.FindFirstChild("GatePart") as BasePart;

			// Extract the number from the gate's name
			const gateNumber = tonumber(gate.Name.match("Gate(%d+)")[0]);

			if (!gateNumber) continue;
			if (type(gateNumber) !== "number") continue;

			if (gateNumber <= plotLevel) {
				gatePart.Transparency = 1;
				gatePart.CanCollide = false;
				assert(gatePart.FindFirstChild("BG"), "Gate must have a BG ScreenGUI");
				const bg = gatePart.FindFirstChild("BG") as ScreenGui;
				bg.Enabled = false;
				// Additional logic to open the gate can go here, e.g., change transparency or unlock the part
			}
		}
	}

	generateMoney(noob: Model, plot: Plot, profile: { Data: ProfileTemplate }) {
		assert(noob.PrimaryPart, "Noob must have a PrimaryPart");
		assert(
			noob.PrimaryPart.GetAttribute(GAME_CONSTANTS.NOOB_ID_ATTR) !== undefined,
			`Noob HRP ${noob.Name} has either not been intialized or has no Noob tag`,
		);
		const noobConfig =
			baseNoobConfig[profile.Data.currentPlotLevel][
				noob.PrimaryPart?.GetAttribute(GAME_CONSTANTS.NOOB_ID_ATTR) as number
			];
		assert(noobConfig, `Noob config not found for noob ${noob.Name}`);
		// Only run once per second
		const lastProductionTime = noob.GetAttribute("LastProductionTime") as number;
		const currentTime = tick();

		if (lastProductionTime === undefined) {
			noob.SetAttribute("LastProductionTime", currentTime);
			return;
		}

		if (lastProductionTime !== undefined && currentTime - lastProductionTime < GAME_CONSTANTS.PRODUCTION_TIMER) {
			return;
		}
		noob.SetAttribute("LastProductionTime", currentTime);

		let multiplier = 1;
		multiplier *= this.petService.getPlayerPetMultiplier(plot.owner!);
		const moneyGain = noobConfig.production * multiplier;

		profile.Data.money += moneyGain;

		Events.displayMoney(plot.owner!, noob, moneyGain);
		this.profileService.setProfile(plot.owner!, profile);
	}

	public registerNoobForPlayer(player: Player, noob: Model) {
		const plot = this.getPlayersPlot(player);
		if (plot) {
			noob.SetAttribute(GAME_CONSTANTS.OWNER_ATTRIBUTE, player.UserId);
			plot.spawnedNoobs.push(noob);
		}
	}

	public removeNoobForPlayer(player: Player, noob: Model) {
		const plot = this.getPlayersPlot(player);
		if (plot) {
			const index = plot.spawnedNoobs.indexOf(noob);
			if (index !== -1) {
				plot.spawnedNoobs.remove(index);
			}
		}
	}

	public getPlayersPlot(player: Player) {
		return this.plots.find((plot) => plot.owner === player);
	}

	getAvailablePlot() {
		// This will return the next available plot for a
		// player to use for merging noobs
		return this.plots.find((plot) => plot.owner === undefined);
	}
}
