import { isIP } from "node:net";

const MAX_TRUSTED_PROXY_RANGES = 16;

export function parseTrustedProxyCidrs(value: string): string[] {
  const entries = [...new Set(value.split(",").map((entry) => entry.trim()))]
    .filter(Boolean)
    .slice(0, MAX_TRUSTED_PROXY_RANGES + 1);

  if (entries.length > MAX_TRUSTED_PROXY_RANGES) {
    throw new Error(
      `TRUSTED_PROXY_CIDRS accepts at most ${MAX_TRUSTED_PROXY_RANGES} entries.`,
    );
  }

  for (const entry of entries) {
    if (!isValidIpOrCidr(entry)) {
      throw new Error(
        `TRUSTED_PROXY_CIDRS contains an invalid IP address or CIDR: ${entry}`,
      );
    }
  }

  return entries;
}

function isValidIpOrCidr(value: string): boolean {
  const [address, prefix, ...extra] = value.split("/");
  const ipVersion = address ? isIP(address) : 0;
  if (!address || extra.length || !ipVersion) return false;
  if (prefix === undefined) return true;
  if (!/^\d+$/.test(prefix)) return false;

  const maximumPrefix = ipVersion === 4 ? 32 : 128;
  const parsedPrefix = Number(prefix);
  return parsedPrefix > 0 && parsedPrefix <= maximumPrefix;
}
