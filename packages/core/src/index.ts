// @site-spec/core — the public API. Treat exported schemas as contracts.

// Versioning + content fields
export * from "./version";
export * from "./fields";

// Schemas
export * from "./schema/asset";
export * from "./schema/theme";
export * from "./schema/brief";
export * from "./schema/policy";
export * from "./schema/section";
export * from "./schema/pack";
export * from "./schema/site-spec";
export * from "./schema/validation-result";
export * from "./schema/foundation";

// UI primitives + escaping + a11y
export * from "./ui/escape";
export * from "./ui/primitives";
export * from "./ui/a11y";

// Site context + SEO / structured data
export * from "./schema/site";
export * from "./seo/jsonld";
export * from "./seo/head";

// Rendering
export * from "./render/context";
export * from "./render/render";
export * from "./render/base-css";

// Build (deployable site: html + sitemap + robots + llms.txt)
export * from "./build/build-site";

// Validation
export { validateSiteSpec } from "./validate/validate";
export type { ValidateInput } from "./validate/validate";
export * from "./policies";

// Packs
export * from "./packs/restaurant";
// catering exports only its pack object — its section names overlap restaurant's
export { cateringPack } from "./packs/catering";

// Build entry — compile a SiteSpec to its output files
export { buildSite } from "./build/build-site";
export type { BuildSiteInput } from "./build/build-site";

// Pack registry (configs reference packs by id — pure-data configs)
export { packRegistry, getPack } from "./packs/registry";

// Audit (inspect any static output dir: file map in, findings out)
export { auditFiles } from "./audit/audit";
export type { AuditInput, AuditFinding, AuditReport } from "./audit/audit";
export { renderAuditMarkdown } from "./audit/report-md";
export type { AuditMarkdownOptions } from "./audit/report-md";

// Fix (repair the mechanical findings; scaffold/flag the rest)
export { fixFiles } from "./fix/fix";
export type { FixStatus, FixAction, FixResult, FixInput } from "./fix/fix";

// Frontend handoff contract (what a design agent receives)
export { buildHandoff, COMPILER_OWNED } from "./handoff/handoff";

// Themes — interchangeable building blocks; any theme renders any pack
export * from "./themes/catering";
