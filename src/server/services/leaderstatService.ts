import { Service, OnStart } from "@flamework/core";
import { ProfileService } from "./profileService";

@Service({})
export class LeaderstatService implements OnStart {
	constructor(private readonly profileService: ProfileService) {}

    onStart() {
        this.profileService.onProfileLoaded.Connect((player, profile) => {
            const leaderstats = new Instance("Folder");
            leaderstats.Name = "leaderstats";
            leaderstats.Parent = player;

            const money = new Instance("IntValue");
            money.Name = "Money";
            money.Value = profile.Data.money;
            money.Parent = leaderstats;
        });

        this.profileService.profileChanged.Connect((player, profile) => {
            const leaderstats = player.FindFirstChild("leaderstats");
            if (leaderstats) {
                const money = leaderstats.FindFirstChild("Money") as IntValue;
                if (money) {
                    money.Value = profile.Data.money;
                }
            }
        });
    }
}