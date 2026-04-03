import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

// GET: List all users
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();
    if (error) throw error;

    const users = data.users.map((u) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      confirmed: !!u.email_confirmed_at,
    }));

    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to list users" },
      { status: 500 }
    );
  }
}

// POST: Create new user
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email e senha são obrigatórios" },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) throw error;

    return NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        created_at: data.user.created_at,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create user" },
      { status: 500 }
    );
  }
}
