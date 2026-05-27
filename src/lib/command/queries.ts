import { getActiveAssemblyPackagesForOrganisation } from "@/src/lib/assemblies/queries";
import { createClient } from "@/src/lib/supabase/server";
import {
  queryLabourRates,
  queryMaterialRates,
  querySupplierRates,
} from "@/src/lib/rates/rates-query-schema";
import { getProjectsForOrganisation } from "@/src/lib/projects/queries";
import { getStandardsForOrganisation } from "@/src/lib/standards/queries";
import type { CommandIndexEntry } from "@/src/lib/command/types";

function joinSearch(parts: Array<string | null | undefined>): string {
  return parts
    .filter((part) => part && String(part).trim())
    .map((part) => String(part).trim())
    .join(" ");
}

export async function getOrganisationCommandIndex(
  organisationId: string
): Promise<CommandIndexEntry[]> {
  const supabase = await createClient();
  const [projects, packages, standards, labourRates, materialRates, supplierRates] =
    await Promise.all([
      getProjectsForOrganisation(organisationId, 80),
      getActiveAssemblyPackagesForOrganisation(organisationId),
      getStandardsForOrganisation(organisationId, { activeOnly: true }),
      queryLabourRates(supabase, organisationId),
      queryMaterialRates(supabase, organisationId),
      querySupplierRates(supabase, organisationId),
    ]);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .eq("organisation_id", organisationId)
    .limit(40);

  const entries: CommandIndexEntry[] = [];

  for (const project of projects) {
    entries.push({
      id: `project-${project.id}`,
      kind: "project",
      label: project.name,
      subtitle: project.client_name ?? project.project_type ?? undefined,
      projectId: project.id,
      entityId: project.id,
      href: `/projects/${project.id}`,
      searchText: joinSearch([
        project.name,
        project.client_name,
        project.project_type,
        project.trade_scope,
        project.site_address,
        project.notes,
      ]),
    });
  }

  for (const pkg of packages) {
    entries.push({
      id: `package-${pkg.id}`,
      kind: "package",
      label: pkg.name,
      subtitle: pkg.trade ?? pkg.unit,
      entityId: pkg.id,
      href: `/templates/${pkg.id}`,
      searchText: joinSearch([
        pkg.name,
        pkg.description,
        pkg.trade,
        pkg.unit,
        pkg.standard_reference,
        pkg.specification_reference,
        pkg.notes,
      ]),
    });
  }

  for (const standard of standards) {
    entries.push({
      id: `standard-${standard.id}`,
      kind: "standard",
      label: `${standard.reference_code} · ${standard.name}`,
      subtitle: standard.trade ?? undefined,
      entityId: standard.id,
      href: "/standards",
      searchText: joinSearch([
        standard.reference_code,
        standard.name,
        standard.description,
        standard.trade,
        standard.jurisdiction,
        standard.notes,
      ]),
    });
  }

  for (const rate of labourRates) {
    entries.push({
      id: `labour-rate-${rate.id}`,
      kind: "labour_rate",
      label: rate.name,
      subtitle: rate.role ?? rate.unit,
      entityId: rate.id,
      href: "/rates",
      searchText: joinSearch([rate.name, rate.role, rate.unit, rate.notes]),
    });
  }

  for (const rate of materialRates) {
    entries.push({
      id: `material-rate-${rate.id}`,
      kind: "material_rate",
      label: rate.name,
      subtitle: rate.category ?? rate.supplier ?? rate.unit,
      entityId: rate.id,
      href: "/rates",
      searchText: joinSearch([
        rate.name,
        rate.category,
        rate.supplier,
        rate.unit,
        rate.notes,
      ]),
    });
  }

  for (const rate of supplierRates) {
    entries.push({
      id: `supplier-rate-${rate.id}`,
      kind: "supplier_rate",
      label: `${rate.supplier} · ${rate.item}`,
      subtitle: rate.unit,
      entityId: rate.id,
      href: "/rates",
      searchText: joinSearch([
        rate.supplier,
        rate.item,
        rate.unit,
        rate.notes,
      ]),
    });
  }

  for (const profile of profiles ?? []) {
    entries.push({
      id: `user-${profile.id}`,
      kind: "user",
      label: profile.full_name?.trim() || profile.email,
      subtitle: profile.email,
      entityId: String(profile.id),
      href: "/settings/team",
      searchText: joinSearch([
        profile.full_name,
        profile.email,
      ]),
    });
  }

  return entries;
}
