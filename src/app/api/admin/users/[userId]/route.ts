import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// DELETE: Remove user
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete user" },
      { status: 500 }
    );
  }
}
