import { supabase } from "./supabase";

export async function getCurrentAdmin() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return null;
  }

  if (profile.role !== "admin") {
    return null;
  }

  return {
    user,
    profile,
  };
}