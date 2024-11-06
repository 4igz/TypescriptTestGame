import React from "@rbxts/react";
import ReactRoblox from "@rbxts/react-roblox";
import { Events } from "client/network";
import { MoneyDisplay } from "client/reactComponents/moneyDisplayBillboard";

const MONEY_DISPLAY_TIMER = 1

const MoneyDisplayController = (container: BasePart, moneyAmt: number) => {
    if (!container) {
        throw 'Container not found.';
    }

    const root = ReactRoblox.createRoot(new Instance("Folder"))
    root.render(ReactRoblox.createPortal(<MoneyDisplay money={moneyAmt} />, container));

    return {
        unmount: () => {
            root.unmount();
        },
    };
};

Events.displayMoney.connect((noob: Model, money: number) => {
    if (noob.PrimaryPart) {
        const component = MoneyDisplayController(noob.PrimaryPart, money);

        task.delay(MONEY_DISPLAY_TIMER, () => {
            component.unmount();
        })
    }
});

export default MoneyDisplayController;
