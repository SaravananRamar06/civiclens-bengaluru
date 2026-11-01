export const reportCategories = [
  "Road damage",
  "Water or drainage",
  "Pollution",
  "Waste",
  "Obstruction",
  "Electrical",
  "Other",
] as const;
export const authorities = {
  roads: "City corporation: roads",
  storm: "City corporation: stormwater drains",
  lights: "City corporation: street lights",
  general: "City corporation: general",
  water: "BWSSB: water and sewerage",
  power: "BESCOM: electricity",
  waste: "BSWML: solid waste",
  pollution: "KSPCB: pollution",
};
/** Keep in step with civic_private.authority_for in the cloud schema. */
export function authorityFor(category: string, text = "") {
  switch (category) {
    case "Road damage":
    case "Obstruction":
      return authorities.roads;
    case "Water or drainage":
      return /\b(storm ?water|storm drains?|rajakaluve)\b/i.test(text)
        ? authorities.storm
        : authorities.water;
    case "Pollution":
      return authorities.pollution;
    case "Waste":
      return authorities.waste;
    case "Electrical":
      return /\bstreet ?lights?\b/i.test(text)
        ? authorities.lights
        : authorities.power;
    default:
      return authorities.general;
  }
}
