import "server-only";

import {
  parseServerEnvironment,
  type ServerEnvironment,
} from "@/lib/env/validation";

let cachedEnvironment: ServerEnvironment | undefined;

export function getServerEnvironment(): ServerEnvironment {
  if (!cachedEnvironment) {
    cachedEnvironment = parseServerEnvironment(process.env);
  }

  return cachedEnvironment;
}
