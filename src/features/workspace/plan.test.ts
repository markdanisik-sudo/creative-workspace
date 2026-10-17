import { describe, expect, it } from "vitest";
import { en } from "@/lib/i18n/dictionaries/en";
import { cs } from "@/lib/i18n/dictionaries/cs";
import {
  CLASSIC_MODULES,
  customDefaults,
  customModuleChoices,
  LIST_MODULES,
  LIST_MODULE_IDS,
  localizeSeed,
  OPTION_SETS,
  PLAN_MODULE_IDS,
  PLAN_TEMPLATES,
  RAW_OPTIONS,
  resolveModules,
  stepsFor,
  TEMPLATE_IDS,
} from "./plan";

function lookup(dictionary: unknown, key: string): unknown {
  return key
    .split(".")
    .reduce<unknown>((node, part) => (node as Record<string, unknown>)?.[part], dictionary);
}

describe("plan modules", () => {
  it("shows the classic set for older projects and keeps the display order", () => {
    expect(resolveModules(null)).toEqual(CLASSIC_MODULES);
    expect(resolveModules(["tasks", "brief", "nonsense", "photos"])).toEqual([
      "brief",
      "photos",
      "tasks",
    ]);
  });

  it("offers boxes that fit the medium", () => {
    expect(customModuleChoices("photo")).not.toContain("shots");
    expect(customModuleChoices("video")).not.toContain("photos");
    expect(customModuleChoices("both")).toEqual([...PLAN_MODULE_IDS]);
    expect(customDefaults("photo")).toContain("photos");
    expect(customDefaults("video")).toContain("shots");
  });
});

describe("templates", () => {
  it("every template exists in both languages", () => {
    for (const id of TEMPLATE_IDS) {
      for (const dictionary of [en, cs]) {
        expect(lookup(dictionary, `boxes.templates.${id}.name`), id).toBeTypeOf("string");
      }
    }
  });

  it.each(PLAN_TEMPLATES.map((template) => [template.id, template] as const))(
    "%s: boxes, steps and starter rows are valid",
    (_, template) => {
      for (const id of template.modules) expect(PLAN_MODULE_IDS).toContain(id);
      for (const step of stepsFor(template.medium, template)) {
        expect(lookup(cs, step.key), step.key).toBeTypeOf("string");
        expect(lookup(en, step.key), step.key).toBeTypeOf("string");
      }
      for (const [moduleId, seeds] of Object.entries(template.seeds)) {
        expect(LIST_MODULE_IDS).toContain(moduleId);
        // Starter rows only go to boxes the template shows.
        expect(template.modules).toContain(moduleId);
        const definition = LIST_MODULES[moduleId as keyof typeof LIST_MODULES];
        for (const seed of seeds!) {
          const data = localizeSeed(seed, "cs");
          expect(data[definition.title], `${moduleId} title`).toBeTruthy();
          for (const [key, value] of Object.entries(data)) {
            const field = definition.fields.find((item) => item.key === key);
            expect(field, `${moduleId}.${key}`).toBeDefined();
            if (field?.kind === "select") {
              expect(OPTION_SETS[field.options] as readonly string[]).toContain(value);
            }
            if (field?.kind === "raw") {
              expect(RAW_OPTIONS[field.options] as readonly string[]).toContain(value);
            }
            if (field?.kind === "number") expect(value).toBeTypeOf("number");
          }
        }
      }
    },
  );

  it("labels every field and option in both languages", () => {
    for (const dictionary of [en, cs]) {
      for (const id of LIST_MODULE_IDS) {
        expect(lookup(dictionary, `workspace.modules.${id}`)).toBeTypeOf("string");
        expect(lookup(dictionary, `boxes.doneLabel.${id}`)).toBeTypeOf("string");
        for (const field of LIST_MODULES[id].fields) {
          expect(
            lookup(dictionary, `boxes.fields.${id}.${field.key}`),
            `${id}.${field.key}`,
          ).toBeTypeOf("string");
        }
      }
      for (const [set, values] of Object.entries(OPTION_SETS)) {
        for (const value of values) {
          expect(lookup(dictionary, `boxes.options.${set}.${value}`), `${set}.${value}`).toBeTypeOf(
            "string",
          );
        }
      }
    }
  });
});

describe("gear catalogue", () => {
  it("uses the gear list's categories and has no duplicates", async () => {
    const { GEAR_BRANDS, gearName } = await import("./gear-catalog");
    const names = new Set<string>();
    for (const brand of GEAR_BRANDS) {
      expect(brand.items.length).toBeGreaterThan(3);
      for (const item of brand.items) {
        expect(OPTION_SETS.gearCategory as readonly string[]).toContain(item.category);
        const name = gearName(brand, item.model);
        expect(names.has(name), name).toBe(false);
        names.add(name);
      }
    }
    expect([...GEAR_BRANDS.map((brand) => brand.id)]).toEqual([
      "arri",
      "red",
      "sony",
      "canon",
      "nikon",
    ]);
  });
});
