type PlatformMatch = {
  platform?: string;
};

export function computePlatformAvailability(matches: PlatformMatch[]): {
  availableOnVS: boolean;
  availableOnTT: boolean;
  availableOnHS: boolean;
} {
  return {
    availableOnVS: matches.some((offer) => offer.platform === "VacationSaga"),
    availableOnTT: matches.some(
      (offer) => offer.platform === "Holidaysera" || offer.platform === "TechTunes",
    ),
    availableOnHS: matches.some((offer) => offer.platform === "HousingSaga"),
  };
}
