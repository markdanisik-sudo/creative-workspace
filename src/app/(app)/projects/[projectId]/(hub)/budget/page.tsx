import type { Metadata } from "next";
import QRCode from "qrcode";
import { requireViewer } from "@/features/auth/session";
import { BudgetView, type QrPayment } from "@/features/budget/BudgetView";
import { payableIban, spaydString } from "@/features/budget/payment";
import { getBudget, getStudioBilling } from "@/features/budget/queries";
import { budgetTotals } from "@/features/budget/totals";
import { getProjectDetails, listRequests, listServices } from "@/features/hub/queries";
import { RequestsView } from "@/features/hub/RequestsView";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("budget.title") };
}

export default async function BudgetPage({ params }: PageProps<"/projects/[projectId]/budget">) {
  const { projectId } = await params;
  const [viewer, budget, requests, services, studio, project] = await Promise.all([
    requireViewer(),
    getBudget(projectId),
    listRequests(projectId),
    listServices({ activeOnly: true }),
    getStudioBilling(),
    getProjectDetails(projectId),
  ]);
  const totals = budgetTotals(budget.lines, requests, {
    payer: studio.vatPayer,
    rate: studio.vatRate,
  });

  // QR Platba for the current total, with the latest unpaid invoice's reference.
  const iban = payableIban(studio.iban, studio.bankAccount);
  const openInvoice = budget.invoices.find((invoice) => !invoice.paidAt);
  let qr: QrPayment | null = null;
  if (iban && totals.total > 0) {
    const amount = openInvoice?.total ?? totals.total;
    const variableSymbol = openInvoice?.number ?? null;
    const payload = spaydString({
      iban,
      amount,
      currency: budget.currency,
      variableSymbol,
      message: project?.name ?? null,
      recipient: studio.name || null,
    });
    const svg = await QRCode.toString(payload, {
      type: "svg",
      margin: 0,
      errorCorrectionLevel: "M",
    });
    qr = { svg, iban, amount, variableSymbol };
  }

  return (
    <BudgetView
      projectId={projectId}
      projectName={project?.name ?? ""}
      budget={budget}
      totals={totals}
      qr={qr}
      isStudio={viewer.isStudio}
      addons={
        <RequestsView
          projectId={projectId}
          services={services}
          requests={requests}
          viewerId={viewer.id}
          isStudio={viewer.isStudio}
          firstIndex={2}
        />
      }
    />
  );
}
