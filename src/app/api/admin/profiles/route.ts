import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

// GET: List all profiles with user email
export async function GET() {
  try {
    const { data: profiles, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .order("created_at");

    if (error) throw error;

    // Get user emails from auth
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
    const emailMap = new Map(
      authData?.users?.map((u) => [u.id, u.email]) || []
    );

    const result = profiles.map((p) => ({
      ...p,
      email: emailMap.get(p.id) || "",
    }));

    return NextResponse.json({ profiles: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
