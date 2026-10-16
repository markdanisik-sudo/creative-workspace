"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import type { Party } from "@/lib/invoice/types";

/** Looks a company up in ARES by IČO. */
export function useAres() {
  const toast = useToast();
  const [pending, setPending] = useState(false);

  const lookup = async (ico: string): Promise<Partial<Party> | null> => {
    setPending(true);
    try {
      const response = await fetch(`/api/ares?ico=${encodeURIComponent(ico.replace(/\s/g, ""))}`);
      if (response.status === 404) {
        toast.show({ title: "Firma s tímto IČO v ARES není.", tone: "error" });
        return null;
      }
      if (!response.ok) {
        toast.show({ title: "ARES teď neodpovídá. Vyplň údaje ručně.", tone: "error" });
        return null;
      }
      const data = (await response.json()) as Partial<Party>;
      toast.show({ title: "Údaje načtené z ARES" });
      return data;
    } catch {
      toast.show({ title: "ARES teď neodpovídá. Vyplň údaje ručně.", tone: "error" });
      return null;
    } finally {
      setPending(false);
    }
  };

  return { lookup, pending };
}
