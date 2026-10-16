"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";

/** Replaces all data with a backup file (moving to a new Mac, or undoing a mistake). */
export function RestoreBackup() {
  const toast = useToast();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);

  const restore = async () => {
    if (!file) return;
    setPending(true);
    const body = new FormData();
    body.set("file", file);
    const response = await fetch("/zaloha", { method: "POST", body });
    setPending(false);
    if (!response.ok) {
      const { error } = (await response.json().catch(() => ({}))) as { error?: string };
      toast.show({ title: error ?? "Zálohu se nepodařilo obnovit.", tone: "error" });
      return;
    }
    setFile(null);
    toast.show({ title: "Data obnovena ze zálohy" });
    router.push("/");
    router.refresh();
  };

  return (
    <div>
      <Button onClick={() => input.current?.click()}>Obnovit ze zálohy…</Button>
      <input
        ref={input}
        type="file"
        accept=".sqlite,.db,application/octet-stream"
        className="hidden"
        onChange={(event) => {
          setFile(event.target.files?.[0] ?? null);
          event.target.value = "";
        }}
      />
      <Dialog
        open={file !== null}
        onClose={() => setFile(null)}
        title="Obnovit ze zálohy?"
        description={`Všechna současná data nahradí obsah souboru ${file?.name ?? ""}. Pokud si nejsi jistý, nejdřív udělej zálohu toho, co je teď.`}
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setFile(null)}>
            Zrušit
          </Button>
          <Button variant="primary" loading={pending} onClick={restore}>
            Obnovit
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
