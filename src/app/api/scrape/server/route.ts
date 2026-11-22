import { NextRequest, NextResponse } from "next/server";
import { resolveServerMirror, SubIndoProvider } from "@/lib/scraper";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const serverId = searchParams.get("serverId") || searchParams.get("id");
  const provider = (searchParams.get("provider") as SubIndoProvider) || "otakudesu";

  if (!serverId || !serverId.trim()) {
    return NextResponse.json(
      {
        success: false,
        error: "Parameter query 'serverId' diperlukan",
      },
      { status: 400 }
    );
  }

  const url = await resolveServerMirror(serverId, provider);

  if (!url) {
    return NextResponse.json(
      {
        success: false,
        error: "Gagal me-resolve URL server mirror dari SankaVollereii",
      },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    serverId,
    provider,
    url,
  });
}
