import { z } from "zod";

/**
 * SchemaVer — `MODEL-REVISION-ADDITION` (e.g. "1-0-0"). NOT SemVer. (D3)
 *
 * - MODEL bump    = breaking change (consumers must migrate)
 * - REVISION bump = changes that may alter validation of existing data
 * - ADDITION bump = purely additive, backward compatible
 */
export const SCHEMA_VER_RE = /^\d+-\d+-\d+$/;

export const schemaVer = z
  .string()
  .regex(SCHEMA_VER_RE, "SchemaVer must be MODEL-REVISION-ADDITION, e.g. 1-0-0");

export type SchemaVer = z.infer<typeof schemaVer>;

export interface ParsedSchemaVer {
  model: number;
  revision: number;
  addition: number;
}

export function parseSchemaVer(v: string): ParsedSchemaVer {
  if (!SCHEMA_VER_RE.test(v)) throw new Error(`Invalid SchemaVer: ${v}`);
  const parts = v.split("-").map(Number);
  return { model: parts[0]!, revision: parts[1]!, addition: parts[2]! };
}

/** A change is breaking iff MODEL increases. Drives the additive-only CI guard. */
export function isBreaking(from: string, to: string): boolean {
  return parseSchemaVer(to).model > parseSchemaVer(from).model;
}
