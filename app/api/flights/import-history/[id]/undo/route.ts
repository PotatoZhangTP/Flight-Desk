import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return NextResponse.json({ error: "Invalid import batch." }, { status: 400 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  const { data, error } = await supabase.rpc("undo_excel_import_batch", { p_batch_id: id });
  if (error) { console.error("[excel-import] undo failed", { code: error.code, message: error.message }); return NextResponse.json({ error: "This import could not be safely undone." }, { status: 400 }); }
  return NextResponse.json({ result: data?.[0] || null });
}
