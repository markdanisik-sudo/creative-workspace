import { describe, expect, it } from "vitest";
import { scriptCharacters, toBlocks } from "./types";

describe("toBlocks", () => {
  it("keeps scene, action and dialogue blocks", () => {
    expect(
      toBlocks([
        { id: "1", type: "scene", text: "INT. KUCHYNĚ – DEN" },
        { id: "2", type: "dialogue", character: "Mari", parenthetical: "šeptem", text: "Jsme tu." },
      ]),
    ).toEqual([
      { id: "1", type: "scene", text: "INT. KUCHYNĚ – DEN" },
      { id: "2", type: "dialogue", character: "Mari", parenthetical: "šeptem", text: "Jsme tu." },
    ]);
  });

  it("drops unknown types, duplicates and junk", () => {
    expect(
      toBlocks([
        null,
        "x",
        { id: "1", type: "song", text: "?" },
        { id: "2", type: "action", text: "Prší.", character: "Ignored" },
        { id: "2", type: "action", text: "Duplicate" },
        { type: "action", text: "No id" },
      ]),
    ).toEqual([{ id: "2", type: "action", text: "Prší." }]);
    expect(toBlocks("not a list")).toEqual([]);
  });
});

describe("scriptCharacters", () => {
  it("lists each speaker once, in order", () => {
    expect(
      scriptCharacters([
        { id: "1", type: "dialogue", character: "Mari", text: "" },
        { id: "2", type: "action", text: "" },
        { id: "3", type: "dialogue", character: "Petr", text: "" },
        { id: "4", type: "dialogue", character: "MARI", text: "" },
        { id: "5", type: "dialogue", character: " ", text: "" },
      ]),
    ).toEqual(["Mari", "Petr"]);
  });
});
