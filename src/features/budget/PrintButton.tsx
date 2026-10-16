"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";

/** Opens the print dialog, where "Save as PDF" downloads the invoice. */
export function PrintButton({ label }: { label: string }) {
  return (
    <Button variant="primary" onClick={() => window.print()}>
      <Printer size={16} aria-hidden="true" />
      {label}
    </Button>
  );
}
