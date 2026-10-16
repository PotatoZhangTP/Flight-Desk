import { NextResponse } from "next/server";
import { publishedOverrides } from "@/lib/i18n/server";
export const dynamic = "force-dynamic";
export async function GET() { return NextResponse.json(await publishedOverrides(), { headers: { "Cache-Control": "no-store" } }); }
