import "server-only";
import { cache } from "react";
import { getStore } from "@/lib/store";

export type { Contact } from "@/lib/store/types";

export const listContacts = cache(async () => (await getStore()).listContacts());
