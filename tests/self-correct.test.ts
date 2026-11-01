import { describe, it, expect } from "vitest";
import { firstUsable } from "../src/lib/self-correct";
import { inferCategory } from "../src/lib/routing";
const noReview = () => null;
describe("self-correcting attempts", () => {
  it("stops at the first usable answer", async () => {
    let calls = 0;
    const result = await firstUsable([async () => { calls++; return "good"; }, async () => { calls++; return "unused"; }], noReview);
    expect(result).toEqual({ answer: "good", tries: 1 });
    expect(calls).toBe(1);
  });
  it("falls back when the first attempt fails", async () => {
    const result = await firstUsable([async () => { throw Error("timeout"); }, async () => "backup"], noReview);
    expect(result).toEqual({ answer: "backup", tries: 2 });
  });
  it("passes a rejected answer's problem to the next attempt", async () => {
    const notes: (string | undefined)[] = [];
    const ask = (answer: string) => async (note?: string) => { notes.push(note); return answer; };
    const result = await firstUsable([ask("bad"), ask("good")], (a) => (a === "bad" ? "You cited evidence that does not exist." : null));
    expect(result.answer).toBe("good");
    expect(notes).toEqual([undefined, "You cited evidence that does not exist."]);
  });
  it("fails when every attempt fails", async () => {
    await expect(firstUsable([async () => { throw Error("down"); }], noReview)).rejects.toThrow("down");
  });
});
describe("category without AI", () => {
  it.each([
    ["Open manhole on the footpath", "Road damage"],
    ["The bridge railing is broken", "Road damage"],
    ["Water leaking from a pipe", "Water or drainage"],
    ["Sewage overflowing near the market", "Water or drainage"],
    ["Garbage not collected for days", "Waste"],
    ["Smoke from a factory every night", "Pollution"],
    ["Live wire hanging at the bus stop", "Electrical"],
    ["Street light not working", "Electrical"],
    ["Fallen tree blocking the lane", "Obstruction"],
    ["Something odd happened", "Other"],
  ])("reads %s as %s", (text, category) => expect(inferCategory(text)).toBe(category));
});
