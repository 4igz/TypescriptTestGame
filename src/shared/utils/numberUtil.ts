const units = [
    { value: 1e12, suffix: "T" },
    { value: 1e9, suffix: "B" },
    { value: 1e6, suffix: "M" },
    { value: 1e3, suffix: "K" },
];

function formatOneDecimal(num: number): string {
    return string.format("%.1f", num);
}

export function simplifyNumber(num: number): string {
    for (const unit of units) {
        if (num >= unit.value) {
            return formatOneDecimal(num / unit.value) + unit.suffix;
        }
    }
    return tostring(num);
}
