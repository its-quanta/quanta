import type { ImportTypeDefinition } from "@/src/lib/imports/types";

export const IMPORT_TYPE_DEFINITIONS: ImportTypeDefinition[] = [
  {
    id: "labour_rates",
    title: "Labour rates",
    description: "Organisation labour cost and charge rates.",
    fields: [
      { key: "name", label: "Name", required: true, example: "Ceiling fixer", aliases: ["rate name", "labour name"] },
      { key: "role", label: "Role", required: false, example: "Ceiling", aliases: ["trade"] },
      { key: "unit", label: "Unit", required: false, example: "hour" },
      { key: "cost_rate", label: "Cost rate", required: true, example: "65", aliases: ["hourly cost", "cost"] },
      { key: "charge_rate", label: "Charge rate", required: false, example: "95", aliases: ["charge", "sell rate"] },
      { key: "notes", label: "Notes", required: false, example: "Standard crew rate" },
    ],
  },
  {
    id: "material_rates",
    title: "Material rates",
    description: "Standard material unit costs for estimating.",
    fields: [
      { key: "name", label: "Name", required: true, example: "13mm GIB A", aliases: ["material", "item"] },
      { key: "supplier", label: "Supplier", required: false, example: "PlaceMakers" },
      { key: "category", label: "Category", required: false, example: "Linings" },
      { key: "unit", label: "Unit", required: false, example: "sheet" },
      { key: "cost_rate", label: "Cost rate", required: true, example: "24.50" },
      { key: "waste_percent", label: "Waste %", required: false, example: "10", aliases: ["wastage", "waste"] },
      { key: "notes", label: "Notes", required: false, example: "" },
    ],
  },
  {
    id: "supplier_rates",
    title: "Supplier rates",
    description: "Supplier price list lines.",
    fields: [
      { key: "supplier", label: "Supplier", required: true, example: "PlaceMakers" },
      { key: "item", label: "Item", required: true, example: "90x45 H1.2", aliases: ["item name", "product"] },
      { key: "unit", label: "Unit", required: false, example: "lm" },
      { key: "rate", label: "Rate", required: true, example: "12.40", aliases: ["price", "cost"] },
      { key: "category", label: "Category", required: false, example: "Timber" },
      { key: "notes", label: "Notes", required: false, example: "" },
    ],
  },
  {
    id: "subcontractor_rates",
    title: "Subcontractor rates",
    description: "Subcontractor trade rates and basis.",
    fields: [
      { key: "trade", label: "Trade", required: true, example: "Electrical" },
      { key: "supplier", label: "Supplier", required: false, example: "ABC Sparky Ltd", aliases: ["subcontractor"] },
      { key: "rate_basis", label: "Rate basis", required: false, example: "item", aliases: ["unit", "basis"] },
      { key: "rate", label: "Rate", required: true, example: "4500" },
      { key: "notes", label: "Notes", required: false, example: "" },
    ],
  },
  {
    id: "packages",
    title: "Methodologies (packages)",
    description: "Assembly packages — one row per methodology.",
    fields: [
      { key: "name", label: "Name", required: true, example: "90x45 framed wall / m²" },
      { key: "trade", label: "Trade", required: false, example: "Partitions" },
      { key: "unit", label: "Unit", required: false, example: "m2", aliases: ["uom"] },
      { key: "margin", label: "Margin %", required: false, example: "25", aliases: ["default_margin_percentage"] },
      { key: "markup", label: "Markup %", required: false, example: "30", aliases: ["default_markup_percentage"] },
      { key: "standard_reference", label: "Standard reference", required: false, example: "NZS 3604" },
      { key: "notes", label: "Notes", required: false, example: "" },
    ],
  },
  {
    id: "package_components",
    title: "Package components",
    description: "Components linked to a package by package name.",
    fields: [
      { key: "package", label: "Package", required: true, example: "90x45 framed wall / m²", aliases: ["package name", "methodology"] },
      { key: "component_type", label: "Component type", required: true, example: "material", aliases: ["type", "item_type"] },
      { key: "item_name", label: "Item name", required: true, example: "90x45 H1.2", aliases: ["name", "material"] },
      { key: "quantity_per_unit", label: "Qty per unit", required: true, example: "3.2", aliases: ["quantity"] },
      { key: "unit", label: "Unit", required: false, example: "lm" },
      { key: "cost_rate", label: "Cost rate", required: false, example: "8.50" },
      { key: "wastage", label: "Wastage %", required: false, example: "10", aliases: ["wastage_percentage", "waste"] },
    ],
  },
  {
    id: "standards",
    title: "Standards library",
    description: "Reference standards and specifications.",
    fields: [
      { key: "reference_code", label: "Reference code", required: true, example: "NZS 3604", aliases: ["code", "ref"] },
      { key: "reference_name", label: "Reference name", required: true, example: "Timber-framed buildings", aliases: ["name", "title"] },
      { key: "trade", label: "Trade", required: false, example: "Structure" },
      { key: "description", label: "Description", required: false, example: "Timber frame standard" },
    ],
  },
  {
    id: "clarification_templates",
    title: "Tender clarification templates",
    description: "Company exclusion and assumption templates.",
    fields: [
      { key: "type", label: "Type", required: true, example: "exclusion", aliases: ["clarification type"] },
      { key: "title", label: "Title", required: true, example: "Electrical by others" },
      { key: "description", label: "Description", required: false, example: "All electrical by others." },
      { key: "priority", label: "Priority", required: false, example: "medium", aliases: ["rfi priority"] },
      { key: "category", label: "Category", required: false, example: "trade" },
    ],
  },
];

export const PLACEHOLDER_IMPORT_DEFINITIONS: ImportTypeDefinition[] = [
  {
    id: "historical_tenders",
    title: "Historical tender data",
    description: "Import past tender benchmarks — planned for a future release.",
    placeholder: true,
    fields: [],
  },
];

export const ALL_IMPORT_CARDS = [
  ...IMPORT_TYPE_DEFINITIONS,
  ...PLACEHOLDER_IMPORT_DEFINITIONS,
];

export const ACTIVE_IMPORT_DEFINITIONS = IMPORT_TYPE_DEFINITIONS;

export function getImportDefinition(importType: string): ImportTypeDefinition | undefined {
  return IMPORT_TYPE_DEFINITIONS.find((definition) => definition.id === importType);
}
