import { Controller, OnRender, OnStart } from "@flamework/core";
import {
	Players,
	RunService,
	UserInputService,
	Workspace,
	CollectionService,
	ContextActionService,
} from "@rbxts/services";
import { Events } from "client/network";
import { GlobalEvents } from "shared/network";
import { GAME_CONSTANTS } from "shared/sharedConstants";

@Controller({})
export class NoobDragger implements OnStart, OnRender {
	private localPlayer = Players.LocalPlayer;
	private petFolder = Workspace.WaitForChild("Pets");
	private mouse = this.localPlayer.GetMouse();
	private clickingOnNoob = false;
	private initialNoob: Model | undefined = undefined;
	private targetNoob: Model | undefined = undefined;
	private storedHighlights: Array<Highlight> = [];
	private maxMergeRange = 10; // Define the threshold distance
	private carriedNoob?: Model;
	private isCarrying = false;
	private proximityDistance = 10; // Units for pickup range
	private followHeight = 2; // Height above player to carry noob
	private followDistance = 3; // Distance behind player to carry noob
	private spawnedNoobsFolder = Workspace.WaitForChild("SpawnedNoobs");
	private readonly ACTION_NAME = "ToggleCarryNoob";
	private lastHighlightedNoob: Model | undefined;

	onStart() {
		UserInputService.InputBegan.Connect((input, gameProcessedEvent) => {
			if (gameProcessedEvent) return;
			if (input.UserInputType === Enum.UserInputType.MouseButton1) {
				const mouseTarget = this.mouse.Target;
				if (
					mouseTarget &&
					mouseTarget.Parent?.IsA("Model") &&
					mouseTarget.Parent.PrimaryPart?.HasTag(GAME_CONSTANTS.NOOB_TAG) &&
					mouseTarget.Parent.GetAttribute(GAME_CONSTANTS.OWNER_ATTRIBUTE) === this.localPlayer.UserId
				) {
					this.clearNoobHighlights();
					this.clickingOnNoob = true;
					this.initialNoob = mouseTarget.Parent;
				}
			}
		});

		UserInputService.InputEnded.Connect((input, gameProcessedEvent) => {
			if (gameProcessedEvent) return;
			if (input.UserInputType === Enum.UserInputType.MouseButton1) {
				this.clickingOnNoob = false;

				if (this.initialNoob && this.targetNoob) {
					if (
						this.initialNoob.PrimaryPart?.GetAttribute(GAME_CONSTANTS.NOOB_ID_ATTR) ===
							this.targetNoob.PrimaryPart?.GetAttribute(GAME_CONSTANTS.NOOB_ID_ATTR) &&
						this.targetNoob.GetAttribute(GAME_CONSTANTS.OWNER_ATTRIBUTE) === this.localPlayer.UserId
					) {
						Events.mergeNoobs(this.initialNoob, this.targetNoob);
					}
				}

				this.clearNoobHighlights();
				this.targetNoob = undefined;
			}
		});

		this.setupCarryControls();
	}

	onRender() {
		const mouseTarget = this.mouse.Target;
		const targetParent = mouseTarget?.Parent;

		if (!this.clickingOnNoob && !this.isCarrying) {
			if (
				targetParent &&
				targetParent.IsA("Model") &&
				targetParent.PrimaryPart &&
				targetParent.GetAttribute(GAME_CONSTANTS.OWNER_ATTRIBUTE) === this.localPlayer.UserId
			) {
				if (this.lastHighlightedNoob && this.lastHighlightedNoob !== targetParent) {
					this.highlightNoob(this.lastHighlightedNoob, false);
				}
				this.highlightNoob(targetParent, true);
				this.lastHighlightedNoob = targetParent;
			} else if (this.lastHighlightedNoob) {
				this.highlightNoob(this.lastHighlightedNoob, false);
				this.lastHighlightedNoob = undefined;
			}
		}

		if (this.clickingOnNoob && this.initialNoob) {
			this.findClosestNoob();
			this.clickDragNoob();
		}

		if (!this.clickingOnNoob && this.initialNoob) {
			if (this.initialNoob.PrimaryPart) {
				Events.dragNoob(this.initialNoob, this.initialNoob.PrimaryPart.Position);
			}
			this.anchorCharacter(false);
			this.initialNoob = undefined;
		}

		if (this.isCarrying && this.carriedNoob?.PrimaryPart) {
			this.findClosestNoob();
			this.updateCarriedNoobPosition();
		}
	}

	private setupCarryControls() {
		// Create action binding
		ContextActionService.BindAction(
			this.ACTION_NAME,
			(actionName, inputState, inputObj) => {
				if (inputState === Enum.UserInputState.Begin) {
					this.toggleCarry();
				}
				return Enum.ContextActionResult.Sink;
			},
			true, // Create touch button
			Enum.KeyCode.ButtonX, // Gamepad X button
		);

		// Configure mobile button
		if (UserInputService.TouchEnabled) {
			ContextActionService.SetPosition(
				this.ACTION_NAME,
				new UDim2(0.3, 0, 0.3, 0), // Position near jump button
			);

			ContextActionService.SetImage(
				this.ACTION_NAME,
				"rbxassetid://1", // Replace with pickup icon asset
			);

			ContextActionService.SetTitle(this.ACTION_NAME, "Pick Up");
		}
	}

	private toggleCarry() {
		if (this.isCarrying) {
			ContextActionService.SetTitle(this.ACTION_NAME, "Pick up");
			this.dropNoob();
		} else {
			this.pickupNearestNoob();
		}
	}

	private findNearestNoobTo(
		position: Vector3,
		maxDistance: number,
		excludeNoob?: Model,
	): [Model | undefined, number] {
		let nearestNoob: Model | undefined;
		let nearestDistance = maxDistance;

		const existingNoobs = this.spawnedNoobsFolder.GetChildren();
		for (const noob of existingNoobs) {
			if (!noob.IsA("Model") || noob === excludeNoob || !noob.PrimaryPart) continue;

			const distance = noob.PrimaryPart.Position.sub(position).Magnitude;
			if (distance < nearestDistance) {
				nearestDistance = distance;
				nearestNoob = noob;
			}
		}

		return [nearestNoob, nearestDistance];
	}

	private pickupNearestNoob() {
		if (this.isCarrying || !this.localPlayer.Character?.PrimaryPart) return;

		const characterPos = this.localPlayer.Character.PrimaryPart.Position;
		const [nearestNoob] = this.findNearestNoobTo(characterPos, this.proximityDistance);

		if (nearestNoob && nearestNoob.GetAttribute(GAME_CONSTANTS.OWNER_ATTRIBUTE) === this.localPlayer.UserId) {
			this.carriedNoob = nearestNoob;
			this.isCarrying = true;
			ContextActionService.SetTitle(this.ACTION_NAME, "Drop");
			this.anchorCharacter(true);
		}
	}

	private dropNoob() {
		if (!this.isCarrying || !this.carriedNoob?.PrimaryPart) return;

		const [nearestNoob] = this.findNearestNoobTo(
			this.carriedNoob.PrimaryPart.Position,
			this.maxMergeRange,
			this.carriedNoob,
		);

		if (nearestNoob?.PrimaryPart) {
			const carriedId = this.carriedNoob.PrimaryPart.GetAttribute(GAME_CONSTANTS.NOOB_ID_ATTR);
			const nearestId = nearestNoob.PrimaryPart.GetAttribute(GAME_CONSTANTS.NOOB_ID_ATTR);

			if (carriedId === nearestId) {
				Events.mergeNoobs(this.carriedNoob, nearestNoob);
			}
		}

		this.anchorCharacter(false);
		this.isCarrying = false;
		this.carriedNoob = undefined;
	}

	private updateCarriedNoobPosition() {
		if (!this.carriedNoob?.PrimaryPart || !this.localPlayer.Character?.PrimaryPart) return;

		const character = this.localPlayer.Character;
		if (!character.PrimaryPart) return;
		const lookVector = character.PrimaryPart.CFrame.LookVector;

		// Calculate target position behind and above player
		const targetPosition = character.PrimaryPart.Position.add(new Vector3(0, this.followHeight, 0)).add(
			lookVector.mul(-this.followDistance),
		);

		// Smooth movement
		const smoothFactor = 0.1;
		this.carriedNoob.PivotTo(this.carriedNoob.PrimaryPart.CFrame.Lerp(new CFrame(targetPosition), smoothFactor));

		const [nearestNoob] = this.findNearestNoobTo(
			this.carriedNoob.PrimaryPart.Position,
			this.maxMergeRange,
			this.carriedNoob,
		);

		if (!nearestNoob) {
			this.clearNoobHighlights();
			ContextActionService.SetTitle(this.ACTION_NAME, "Drop");
			return;
		}

		if (nearestNoob?.PrimaryPart) {
			const carriedId = this.carriedNoob.PrimaryPart.GetAttribute(GAME_CONSTANTS.NOOB_ID_ATTR);
			const nearestId = nearestNoob.PrimaryPart.GetAttribute(GAME_CONSTANTS.NOOB_ID_ATTR);

			if (carriedId === nearestId) {
				this.highlightNoob(this.carriedNoob, true);
				this.highlightNoob(nearestNoob, true);
				// Update merge button to show "Merge"
				ContextActionService.SetTitle(this.ACTION_NAME, "Merge");
			} else {
				this.clearNoobHighlights();
			}
		}
	}

	private clickDragNoob() {
		if (!this.initialNoob?.PrimaryPart) return;

		const mouseRay = this.mouse.UnitRay;
		const maxDragDistance = 20;

		const params = new RaycastParams();
		params.FilterType = Enum.RaycastFilterType.Exclude;
		params.FilterDescendantsInstances = [this.initialNoob, this.localPlayer.Character!, this.petFolder];

		const raycastResult = Workspace.Raycast(mouseRay.Origin, mouseRay.Direction.mul(maxDragDistance), params);

		let targetPosition: Vector3;
		if (raycastResult) {
			targetPosition = raycastResult.Position;
		} else {
			targetPosition = mouseRay.Origin.add(mouseRay.Direction.mul(maxDragDistance));
		}

		const smoothFactor = 0.1;
		this.anchorCharacter(true);
		this.initialNoob.PivotTo(this.initialNoob.PrimaryPart.CFrame.Lerp(new CFrame(targetPosition), smoothFactor));
	}

	private findClosestNoob() {
		if (!this.initialNoob) return;

		let closestNoob: BasePart | undefined;
		let closestDistance = this.maxMergeRange;

		for (const noobPrimaryPart of CollectionService.GetTagged(GAME_CONSTANTS.NOOB_TAG)) {
			if (
				noobPrimaryPart === this.initialNoob.PrimaryPart ||
				!noobPrimaryPart.Parent?.IsA("Model") ||
				!noobPrimaryPart ||
				!noobPrimaryPart.IsA("BasePart")
			)
				continue;

			if (this.initialNoob.PrimaryPart) {
				const distance = noobPrimaryPart.Position.sub(this.initialNoob.PrimaryPart.Position).Magnitude;
				if (distance < closestDistance) {
					closestDistance = distance;
					closestNoob = noobPrimaryPart;
				}
			}
		}

		this.targetNoob = closestNoob?.Parent as Model;
		this.clearNoobHighlights();
		if (
			this.targetNoob &&
			closestNoob &&
			this.initialNoob.PrimaryPart?.GetAttribute(GAME_CONSTANTS.NOOB_ID_ATTR) ===
				closestNoob.GetAttribute(GAME_CONSTANTS.NOOB_ID_ATTR)
		) {
			this.highlightNoob(this.initialNoob, true);
			this.highlightNoob(this.targetNoob, true);
		}
	}

	private highlightNoob(noob: Model, active: boolean) {
		if (active) {
			if (noob.FindFirstChildWhichIsA("Highlight")) return;
			const highlight = new Instance("Highlight");
			highlight.Parent = noob;
			this.storedHighlights.push(highlight);
		} else {
			for (const highlight of this.storedHighlights) {
				if (highlight.Parent === noob) {
					this.storedHighlights = this.storedHighlights.filter((h) => h !== highlight);
					highlight.Destroy();
				}
			}
		}
	}

	private anchorCharacter(anchored: boolean) {
		const model = this.carriedNoob || this.initialNoob;
		if (!model) return;

		const head = model.FindFirstChild("Head") as BasePart;
		if (head) {
			head.Anchored = anchored;
		}
	}
	private clearNoobHighlights() {
		for (const highlight of this.storedHighlights) {
			highlight.Destroy();
		}
		this.storedHighlights = [];
	}
}
