import { readFileSync } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function readBuildId(): string {
  try {
    return readFileSync(path.join(process.cwd(), ".next", "BUILD_ID"), "utf8").trim();
  } catch {
    return process.env.NODE_ENV === "development" ? "dev" : "unknown";
  }
}

export async function GET() {
  const build = readBuildId();

  return NextResponse.json(
    { build },
    {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
      },
    },
  );
}
