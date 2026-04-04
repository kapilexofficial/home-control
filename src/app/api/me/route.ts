import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Get user from Authorization header (Supabase token)
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "No auth" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Get profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profile) {
      // Create profile if it doesn't exist
      const { data: newProfile } = await supabaseAdmin
        .from("profiles")
        .insert({ id: user.id, name: user.email?.split("@")[0] || "", role: "user" })
        .select()
        .single();

      return NextResponse.json({
        ...newProfile,
        email: user.email,
      });
    }

    return NextResponse.json({
      ...profile,
      email: user.email,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
