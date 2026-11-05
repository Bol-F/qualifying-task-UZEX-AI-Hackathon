"use client";
import { usePreferences } from "@/components/layout/preferences-provider";
import { useState } from "react";
import { ArrowUpRight, Package, FileText } from "lucide-react";
import type { Trade } from "@/types";
import { number } from "@/lib/utils";
import { fieldLabel } from "@/lib/i18n/field-labels";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { EmptyState } from "@/components/layout/resource-state";
export function TradeTable({
  rows,
  compact = false,
}: {
  rows: Trade[];
  compact?: boolean;
}) {
  const { t: tr } = usePreferences();
  const [selected, setSelected] = useState<Trade | null>(null);
  return (
    <>
      {!rows.length ? (
        <EmptyState />
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{tr("COMMODITY")}</th>
                {!compact && <th>{tr("TRANSACTION ID")}</th>}
                <th>{tr("TRADE DATE")}</th>
                <th className="numeric">{tr("QUANTITY")}</th>
                <th className="numeric">{tr("UNIT PRICE")}</th>
                <th>{tr("STATUS")}</th>
                <th>
                  <span className="sr-only">{tr("Details")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}>
                  <td>
                    <button
                      className="commodity-button"
                      onClick={() => setSelected(t)}
                    >
                      <span className="commodity-icon">
                        <Package size={15} />
                      </span>
                      <span>
                        <strong>{t.product_name}</strong>
                        <small>
                          {t.contract_number} · {t.contract_type}
                        </small>
                      </span>
                    </button>
                  </td>
                  {!compact && (
                    <td className="mono muted">{t.external_id ?? t.id}</td>
                  )}
                  <td className="muted">{t.trade_date}</td>
                  <td className="numeric mono">
                    {number(t.quantity)} <span className="muted">{t.unit}</span>
                  </td>
                  <td className="numeric mono">
                    {number(t.price)}
                    <small>
                      {t.currency ?? tr("Unknown currency")} /{tr(" ")}
                      {t.price_unit ?? tr("unknown basis")}
                    </small>
                  </td>
                  <td>
                    <span
                      className={`status-badge ${t.execution_status === "Completed" ? "complete" : "pending"}`}
                    >
                      <i />
                      {t.execution_status}
                    </span>
                  </td>
                  <td>
                    <button
                      aria-label={tr(`View ${t.external_id ?? t.id}`)}
                      className="icon-button"
                      onClick={() => setSelected(t)}
                    >
                      <ArrowUpRight size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Sheet
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <SheetContent className="detail-sheet">
          <SheetHeader>
            <FileText className="mint" />
            <SheetTitle>{tr("Transaction details")}</SheetTitle>
            <SheetDescription>
              {selected?.external_id ?? selected?.id}
              {tr(" \u00B7 Source record ")}
            </SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="detail-body">
              <h2>{selected.product_name}</h2>
              <span
                className={`status-badge ${selected.execution_status === "Completed" ? "complete" : "pending"}`}
              >
                {selected.execution_status}
              </span>
              <dl>
                {Object.entries(selected).map(([key, value]) => (
                  <div key={key}>
                    <dt>{tr(fieldLabel(key))}</dt>
                    <dd>{value ?? tr("Not provided")}</dd>
                  </div>
                ))}
              </dl>
              <p className="muted">
                {tr(
                  " Price \u00D7 quantity is valid only when the price basis matches the quantity unit. Contract numbers may repeat. ",
                )}
              </p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
