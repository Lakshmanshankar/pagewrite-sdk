import { defineCollection, createReference } from "astro/content/runtime";

export { defineCollection };
export const reference = createReference({ lookupMap: new Map() });
