import { NextRequest, NextResponse } from "next/server";
import { getAnimeDetails } from "@/services/anilist";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug") || searchParams.get("id");

  if (!slug || !slug.trim()) {
    return NextResponse.json(
      { success: false, error: "Parameter 'slug' atau 'id' diperlukan" },
      { status: 400 }
    );
  }

  try {
    const data = await getAnimeDetails(slug.trim());
    if (data) {
      return NextResponse.json({ success: true, data }, { status: 200 });
    }
    return NextResponse.json(
      { success: false, error: `Anime detail tidak ditemukan untuk slug: ${slug}` },
      { status: 404 }
    );
  } catch (err: any) {
    console.error("API anime details error:", err);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil data detail anime" },
      { status: 500 }
    );
  }
}
