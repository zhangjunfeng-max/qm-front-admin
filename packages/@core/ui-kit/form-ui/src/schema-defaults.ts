import type { ZodType } from 'zod';

import {
  ZodArray,
  ZodBoolean,
  ZodIntersection,
  ZodNumber,
  ZodObject,
  ZodString,
  ZodStringFormat,
} from 'zod';

/** Form placeholders, derived from Zod's public schema API.
 * Explicit Zod defaults win; empty scalar fields retain their input types.
 * This project-authored helper replaces the incompletely licensed npm tarball
 * of zod-defaults. No code from that package is used.
 */
export function getSchemaDefaults(schema: ZodType): any {
  try {
    const parsed = schema.safeParse(undefined);
    if (parsed.success && parsed.data !== undefined) return parsed.data;
  } catch {
    // An async transform must not execute as part of synchronous form setup.
  }

  if (schema instanceof ZodObject) {
    return Object.fromEntries(
      Object.entries(schema.shape).map(([key, child]) => [
        key,
        getSchemaDefaults(child as ZodType),
      ]),
    );
  }
  if (schema instanceof ZodIntersection) {
    return {
      ...getSchemaDefaults(schema.def.left as ZodType),
      ...getSchemaDefaults(schema.def.right as ZodType),
    };
  }
  if (schema instanceof ZodString || schema instanceof ZodStringFormat) return '';
  if (schema instanceof ZodNumber) return 0;
  if (schema instanceof ZodBoolean) return false;
  if (schema instanceof ZodArray) return [];

  // Wrappers expose unwrap(); pipe schemas expose their input schema.
  const wrapper = schema as ZodType & {
    in?: ZodType;
    unwrap?: () => ZodType;
  };
  if (wrapper.unwrap) return getSchemaDefaults(wrapper.unwrap());
  if (wrapper.in) return getSchemaDefaults(wrapper.in);
  return undefined;
}
