import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://udeirzkfyixhtozmjwra.supabase.co";
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVkZWlyemtmeWl4aHRvem1qd3JhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjE3MjExMCwiZXhwIjoyMTA3NzQ4MTEwfQ.QEbcN9BJtf-nfGmstO5cVhRtLVZq93kb98AJNOfywBc";

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const email = "tester@apexwallet.io";
  const password = "TestPassword123!";
  const pin = "7002";

  console.log(`Checking if user ${email} already exists...`);
  const { data: userList } = await supabase.auth.admin.listUsers();
  let user = userList?.users?.find((u) => u.email === email);

  if (!user) {
    console.log(`Creating user ${email}...`);
    const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: "Test",
        last_name: "User",
        phone_number: "+12025550199",
        payment_pin: pin,
      },
    });

    if (createErr) {
      console.error("Error creating user:", createErr);
      process.exit(1);
    }
    user = newUser.user;
    console.log(`User created with ID: ${user.id}`);
  } else {
    console.log(`User exists with ID: ${user.id}. Updating password and metadata...`);
    await supabase.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: {
        first_name: "Test",
        last_name: "User",
        phone_number: "+12025550199",
        payment_pin: pin,
      },
    });
  }

  // Ensure user profile exists
  console.log("Upserting user profile...");
  await supabase.from("user_profiles").upsert({
    id: user.id,
    first_name: "Test",
    last_name: "User",
    phone_number: "+12025550199",
    kyc_tier: 2,
    preferred_currency: "USD",
  });

  // Credit 2.5311 BTC (~$234,000 USD at $92,450/BTC)
  const btcAmount = 2.5311;
  console.log(`Crediting ${btcAmount} BTC (~$234,000 USD) via double-entry ledger...`);

  const { data: txId, error: creditErr } = await supabase.rpc("credit_crypto_deposit", {
    p_user_id: user.id,
    p_asset: "BTC",
    p_amount: btcAmount,
    p_tx_hash: "0x_sandbox_seed_btc_deposit_" + Date.now(),
    p_idempotency_key: "seed-btc-deposit-" + user.id + "-" + Date.now(),
    p_metadata: { note: "Initial dev sandbox funding" },
  });

  if (creditErr) {
    console.error("Error crediting deposit:", creditErr);
  } else {
    console.log(`Deposit transaction posted successfully. Tx ID: ${txId}`);
  }

  console.log("\n=================================");
  console.log("TEST USER CREDENTIALS:");
  console.log(`Email:    ${email}`);
  console.log(`Password: ${password}`);
  console.log(`PIN:      ${pin}`);
  console.log(`Balance:  ${btcAmount} BTC (~$234,000 USD)`);
  console.log("=================================\n");
}

main().catch(console.error);
