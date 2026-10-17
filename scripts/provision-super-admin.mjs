import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://udeirzkfyixhtozmjwra.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkZWlyemtmeWl4aHRvem1qd3JhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjE3MjExMCwiZXhwIjoyMTA3NzQ4MTEwfQ.QEbcN9BJtf-nfGmstO5cVhRtLVZq93kb98AJNOfywBc";

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const adminEmail = process.argv[2] || "superadmin@apexwallet.io";
  const adminPassword = process.argv[3] || "ApexAdmin2026!@#Secure";

  console.log(`[SuperAdmin Provisioning] Processing email: ${adminEmail}...`);

  // 1. Check if user exists in auth.users
  const { data: userList } = await supabase.auth.admin.listUsers();
  let user = userList?.users?.find((u) => u.email === adminEmail);

  if (!user) {
    console.log(`[SuperAdmin Provisioning] Creating identity for ${adminEmail}...`);
    const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        first_name: "Super",
        last_name: "Admin",
        phone_number: "+12025550100",
      },
    });

    if (createErr) {
      console.error("Failed to create super-admin user:", createErr);
      process.exit(1);
    }
    user = newUser.user;
    console.log(`User identity created with ID: ${user.id}`);
  } else {
    console.log(`User identity already exists with ID: ${user.id}`);
  }

  // 2. Ensure user profile exists
  await supabase.from("user_profiles").upsert({
    id: user.id,
    first_name: "Super",
    last_name: "Admin",
    phone_number: "+12025550100",
    kyc_tier: 3,
    preferred_currency: "USD",
  });

  // 3. Grant super_admin role in public.staff_users
  const { error: roleErr } = await supabase.from("staff_users").upsert({
    id: user.id,
    role: "super_admin",
    is_active: true,
    updated_at: new Date().toISOString(),
  });

  if (roleErr) {
    console.error("Failed to grant super_admin role:", roleErr);
    process.exit(1);
  }

  // 4. Record audit entry
  await supabase.from("admin_audit_logs").insert({
    actor_id: user.id,
    actor_email: adminEmail,
    actor_role: "super_admin",
    action_type: "STAFF_ROLE_ASSIGNED",
    target_entity_type: "STAFF_USER",
    target_entity_id: user.id,
    details: { role: "super_admin", reason: "Initial CLI Provisioning" },
    status: "SUCCESS",
  });

  console.log("\n========================================================");
  console.log("SUPER ADMIN PROVISIONED SUCCESSFULLY:");
  console.log(`Email:    ${adminEmail}`);
  console.log(`Password: ${adminPassword}`);
  console.log(`Role:     super_admin`);
  console.log(`User ID:  ${user.id}`);
  console.log("========================================================\n");
}

main().catch(console.error);
