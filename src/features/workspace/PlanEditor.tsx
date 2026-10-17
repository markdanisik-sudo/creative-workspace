"use client";

import { SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { useI18n } from "@/lib/i18n/client";
import { ModulePicker } from "./ModulePicker";
import { customModuleChoices, PLAN_MODULE_IDS, type Medium, type PlanModuleId } from "./plan";
import { savePlanModules } from "./plan-actions";

/** "Edit plan": which boxes this project's Plan shows. */
export function PlanEditor({
  projectId,
  medium,
  modules,
}: {
  projectId: string;
  medium: Medium;
  modules: PlanModuleId[];
}) {
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<PlanModuleId[]>(modules);
  const [pending, startTransition] = useTransition();
  const choices = PLAN_MODULE_IDS.filter(
    (id) => customModuleChoices(medium).includes(id) || modules.includes(id),
  );

  const save = () =>
    startTransition(async () => {
      const result = await savePlanModules(projectId, chosen);
      if (!result.ok) return toast.show({ title: result.error, tone: "error" });
      setOpen(false);
      router.refresh();
    });

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          setChosen(modules);
          setOpen(true);
        }}
      >
        <SlidersHorizontal size={14} aria-hidden="true" />
        {t("boxes.editPlan")}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t("boxes.editPlanTitle")}
        description={t("boxes.editPlanBody")}
        className="max-w-[560px]"
      >
        <div className="flex flex-col gap-6">
          <ModulePicker choices={choices} value={chosen} onChange={setChosen} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="primary"
              onClick={save}
              loading={pending}
              disabled={chosen.length === 0}
            >
              {t("boxes.save")}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
