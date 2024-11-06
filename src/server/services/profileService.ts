import { Service, OnStart } from "@flamework/core";
import Signal from "@rbxts/goodsignal";
import { GetProfileStore } from "@rbxts/rbx-profileservice-plus";
import { Players } from "@rbxts/services";
import { ProfileTemplate, profileTemplate } from "server/profileTemplate";

@Service({})
export class ProfileService implements OnStart {
	public onProfileLoaded = new Signal<(player: Player, profile: {Data: ProfileTemplate}) => void>();
	public profileChanged = new Signal<(player: Player, profile: {Data: ProfileTemplate}) => void>();

	private profileStore = GetProfileStore("v1", profileTemplate);
	private profileCache = new Map<Player, unknown>();

	onStart() {
		for (const player of Players.GetPlayers()) {
			this.onPlayerAdded(player);
		}

		Players.PlayerAdded.Connect((player) => this.onPlayerAdded(player));
	}

	// Load and cache the profile for the player
	onPlayerAdded(player: Player) {
		this.profileStore
			.LoadProfileAsync(tostring(player.UserId))
			.andThen((profile) => {
				profile?.AddUserId(player.UserId);
				profile?.Reconcile();
				profile?.ListenToRelease(() => {
					this.profileCache.delete(player);
					player.Kick();
				});
				if (player.IsDescendantOf(Players)) {
					this.profileCache.set(player, profile);
					this.onProfileLoaded.Fire(player, profile as { Data: ProfileTemplate });
				} else {
					profile?.Release();
				}
			})
			.catch((e) => {
				player.Kick();
			});
	}

	public getProfile(player: Player): { Data: ProfileTemplate } | undefined {
		if (!this.profileCache.has(player)) {
			return undefined;
		}
		return this.profileCache.get(player) as { Data: ProfileTemplate };
	}

	public setProfile(player: Player, profile: unknown) {
		if (!this.profileCache.has(player)) {
			error("Player profile not loaded, use onProfileLoaded to wait for the profile to load");
		}
		this.profileCache.set(player, profile);
		this.profileChanged.Fire(player, profile as { Data: ProfileTemplate });
	}
}
