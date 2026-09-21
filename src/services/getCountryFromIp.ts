import type { Request } from "express";
import path from "path";
import { Reader } from "@maxmind/geoip2-node";

const databasePath = path.resolve(
  process.cwd(),
  "src/data/ipAddress.mmdb"
);

let readerPromise: ReturnType<typeof Reader.open> | null = null;

function getReader() {
  if (!readerPromise) {
    readerPromise = Reader.open(databasePath);
  }

  return readerPromise;
}

export async function getCountryFromIp(
  req: Request
): Promise<{} | null> {
  try {
    const ip = req.ip;

    if (!ip) {
      return null;
    }

    const reader = await getReader();

    const result = reader.country(ip);


    return result?.country?.isoCode ?? null;
  } catch (error) {
    console.error("Failed to determine country from IP:", error);
    return null;
  }
}