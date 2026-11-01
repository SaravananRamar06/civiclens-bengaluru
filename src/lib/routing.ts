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
/** Reads the type of issue from the words used, so reports still get the right assignment without AI. */
export function inferCategory(text: string) {
  const rules: [(typeof reportCategories)[number], RegExp][] = [
    ["Electrical", /\b(live wires?|hanging wires?|exposed wires?|electric(al|ity)?|power cut|transformer|street ?lights?)\b/i],
    ["Water or drainage", /\b(water|leak(s|ing)?|pipes?|sewage|drains?|flood(s|ed|ing)?|waterlogg(ed|ing)|storm ?water)\b/i],
    ["Waste", /\b(garbage|waste|trash|rubbish|debris)\b/i],
    ["Pollution", /\b(pollution|smoke|fumes|dust|noise|chemical|effluent)\b/i],
    ["Road damage", /\b(potholes?|man ?holes?|roads?|bridges?|footpaths?|pavement|flyover)\b/i],
    ["Obstruction", /\b(fallen tree|blocking|blocked|encroach(ment|ing)?|obstruct(ion|ing)?)\b/i],
  ];
  return rules.find(([, pattern]) => pattern.test(text))?.[0] ?? "Other";
}
