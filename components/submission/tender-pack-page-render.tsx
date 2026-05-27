"use client";

import {
  formatCurrency,
  formatDate,
  formatPercent,
  formatQuantity,
} from "@/src/lib/format";
import type { TenderPackPreviewData } from "@/src/lib/submission/tender-pack-preview";
import type { TenderPackVirtualPage } from "@/src/lib/submission/tender-pack-pages";
import type { OrganisationCurrency } from "@/src/types/database";

type TenderPackPageRenderProps = {
  page: TenderPackVirtualPage;
  data: TenderPackPreviewData;
  currency: OrganisationCurrency;
};

function PackTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <table className="w-full border-collapse text-[9px] leading-tight">
      <thead>
        <tr className="border-b border-[#0A0E1A]/20">
          {headers.map((header) => (
            <th
              key={header}
              className="px-1.5 py-1 text-left font-semibold uppercase tracking-wide text-[#0A0E1A]/70"
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((cells, rowIndex) => (
          <tr
            key={rowIndex}
            className="border-b border-[#E5E8EE] even:bg-[#F4F6FA]/60"
          >
            {cells.map((cell, cellIndex) => (
              <td key={cellIndex} className="px-1.5 py-1 text-[#0A0E1A]">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function TenderPackPageRender({
  page,
  data,
  currency,
}: TenderPackPageRenderProps) {
  const money = (value: number | null | undefined) =>
    formatCurrency(value, currency);

  if (page.kind === "cover") {
    return (
      <div className="flex h-full flex-col justify-between">
        <div className="flex flex-col gap-8 pt-6">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#0A0E1A]/50">
            Tender submission
          </p>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#0A0E1A]">
              {data.cover.projectName}
            </h1>
            {data.cover.clientName ? (
              <p className="mt-2 text-sm text-[#0A0E1A]/70">
                {data.cover.clientName}
              </p>
            ) : null}
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-[10px]">
            <div>
              <dt className="uppercase tracking-wide text-[#0A0E1A]/50">
                Prepared by
              </dt>
              <dd className="mt-0.5 font-medium text-[#0A0E1A]">
                {data.cover.organisationName}
              </dd>
            </div>
            <div>
              <dt className="uppercase tracking-wide text-[#0A0E1A]/50">
                Issue date
              </dt>
              <dd className="mt-0.5 font-mono tabular-nums text-[#0A0E1A]">
                {formatDate(data.cover.issueDate)}
              </dd>
            </div>
            <div>
              <dt className="uppercase tracking-wide text-[#0A0E1A]/50">
                Revision
              </dt>
              <dd className="mt-0.5 font-mono text-[#0A0E1A]">
                {data.cover.revision}
              </dd>
            </div>
            <div>
              <dt className="uppercase tracking-wide text-[#0A0E1A]/50">
                Tender due
              </dt>
              <dd className="mt-0.5 font-mono tabular-nums text-[#0A0E1A]">
                {formatDate(data.cover.tenderDueDate)}
              </dd>
            </div>
            {data.cover.tradeScope ? (
              <div className="col-span-2">
                <dt className="uppercase tracking-wide text-[#0A0E1A]/50">
                  Trade scope
                </dt>
                <dd className="mt-0.5 text-[#0A0E1A]">{data.cover.tradeScope}</dd>
              </div>
            ) : null}
          </dl>
        </div>
        <p className="font-mono text-lg tabular-nums text-[#0A0E1A]">
          {money(data.cover.tenderValue)}
        </p>
      </div>
    );
  }

  if (page.kind === "commercial") {
    if (page.scheduleSlice) {
      return (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-[#0A0E1A]">Pricing schedule</h2>
          {page.scheduleSlice.length === 0 ? (
            <p className="text-[10px] text-[#0A0E1A]/60">
              No priced lines in this tender yet.
            </p>
          ) : (
            <PackTable
              headers={[
                "Item",
                "Trade",
                "Qty",
                "Unit",
                "Sell rate",
                "Total sell",
              ]}
              rows={page.scheduleSlice.map((row) => [
                row.takeoffItemName,
                row.trade,
                formatQuantity(row.quantity),
                row.unit,
                money(row.sellRate),
                money(row.totalSell),
              ])}
            />
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-[#0A0E1A]">Commercial summary</h2>
        <dl className="grid grid-cols-2 gap-3 text-[10px]">
          <div>
            <dt className="text-[#0A0E1A]/50">Total cost</dt>
            <dd className="mt-0.5 font-mono font-medium tabular-nums">
              {money(data.commercial.totalCost)}
            </dd>
          </div>
          <div>
            <dt className="text-[#0A0E1A]/50">Total sell</dt>
            <dd className="mt-0.5 font-mono font-medium tabular-nums">
              {money(data.commercial.totalSell)}
            </dd>
          </div>
          <div>
            <dt className="text-[#0A0E1A]/50">Gross profit</dt>
            <dd className="mt-0.5 font-mono tabular-nums">
              {money(data.commercial.grossProfit)}
            </dd>
          </div>
          <div>
            <dt className="text-[#0A0E1A]/50">Margin</dt>
            <dd className="mt-0.5 font-mono tabular-nums">
              {formatPercent(data.commercial.marginPercent)}
            </dd>
          </div>
        </dl>

        <h3 className="text-xs font-semibold text-[#0A0E1A]">Trade summaries</h3>
        {data.tradeSummaries.length === 0 ? (
          <p className="text-[10px] text-[#0A0E1A]/60">No trade breakdown yet.</p>
        ) : (
          <PackTable
            headers={["Trade", "Lines", "Total sell", "Margin"]}
            rows={data.tradeSummaries.map((row) => [
              row.trade,
              String(row.lineCount),
              money(row.totalSell),
              formatPercent(row.marginPercent),
            ])}
          />
        )}
      </div>
    );
  }

  if (
    page.kind === "exclusions" ||
    page.kind === "assumptions" ||
    page.kind === "rfis"
  ) {
    const title =
      page.kind === "exclusions"
        ? "Exclusions"
        : page.kind === "assumptions"
          ? "Assumptions"
          : "RFIs & clarifications";
    const items = page.clarificationSlice ?? [];

    return (
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-[#0A0E1A]">{title}</h2>
        {items.length === 0 ? (
          <p className="text-[10px] text-[#0A0E1A]/60">None recorded.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((item, index) => (
              <li
                key={`${item.title}-${index}`}
                className="rounded border border-[#E5E8EE] bg-[#F4F6FA]/40 px-2 py-1.5"
              >
                <p className="text-[10px] font-medium text-[#0A0E1A]">
                  {item.title}
                </p>
                {item.description ? (
                  <p className="mt-0.5 text-[9px] leading-snug text-[#0A0E1A]/70">
                    {item.description}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (page.kind === "methodologies") {
    const rows = page.methodologySlice ?? [];
    return (
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-[#0A0E1A]">Methodologies</h2>
        {rows.length === 0 ? (
          <p className="text-[10px] text-[#0A0E1A]/60">
            No assembly packages applied on this tender.
          </p>
        ) : (
          <PackTable
            headers={["Package", "Unit", "Lines"]}
            rows={rows.map((row) => [
              row.packageName,
              row.unit,
              String(row.usageCount),
            ])}
          />
        )}
      </div>
    );
  }

  if (page.kind === "standards") {
    const rows = page.standardSlice ?? [];
    return (
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-[#0A0E1A]">Standards & references</h2>
        {rows.length === 0 ? (
          <p className="text-[10px] text-[#0A0E1A]/60">
            No standards linked on this tender.
          </p>
        ) : (
          <PackTable
            headers={["Reference", "Name", "Type"]}
            rows={rows.map((row) => [
              row.referenceCode,
              row.name,
              row.standardType,
            ])}
          />
        )}
      </div>
    );
  }

  return null;
}
