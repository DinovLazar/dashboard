/**
 * B.03 seed — insert ONE throwaway test client, its ENCRYPTED dummy token, and
 * the test user's mapping, using the server-side service-role client.
 *
 * Usage (the operator runs this; see docs/runbooks/registry-apply.md):
 *
 *   npm run seed:test-client -- <TEST_USER_UUID>
 *   # or set TEST_USER_ID in .env.local and run without the argument:
 *   npm run seed:test-client
 *
 * Requires (in .env.local — never committed): NEXT_PUBLIC_SUPABASE_URL,
 * SUPABASE_SERVICE_ROLE_KEY, SANITY_TOKEN_ENC_KEY.
 *
 * It is idempotent: re-running it reuses the user's existing mapping (if any)
 * instead of creating a second client, so the registry always converges to
 * exactly one test client for the test user. The dummy token is re-encrypted
 * (fresh IV) on every run. NO real secret is ever read, printed, or committed.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { encryptToken } from '@/lib/crypto/tokens'

import { DUMMY_TOKEN, TEST_CLIENT } from './test-fixtures'

// Load .env.local if present. Harmless when the vars are already in the
// environment (e.g. CI) — that's why it's wrapped.
try {
  process.loadEnvFile('.env.local')
} catch {
  // No .env.local file: rely on whatever is already in process.env.
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function fail(message: string): never {
  console.error(`\n❌  ${message}\n`)
  process.exit(1)
}

async function main() {
  const userId = (process.argv[2] ?? process.env.TEST_USER_ID ?? '').trim()
  if (!userId) {
    fail(
      'Missing test user id. Pass it as an argument:\n' +
        '    npm run seed:test-client -- <TEST_USER_UUID>\n' +
        '  or set TEST_USER_ID in .env.local. Find the UUID in Supabase →\n' +
        '  Authentication → Users (the "UID" column).',
    )
  }
  if (!UUID_RE.test(userId)) {
    fail(`"${userId}" is not a valid user UUID.`)
  }

  const admin = createAdminClient()

  // 1. Reuse the user's existing client mapping if there is one (idempotency),
  //    otherwise create a fresh client row.
  const { data: existing, error: lookupError } = await admin
    .from('client_users')
    .select('client_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (lookupError) fail(`Looking up existing mapping failed: ${lookupError.message}`)

  let clientId: string

  if (existing) {
    clientId = existing.client_id
    const { error } = await admin
      .from('clients')
      .update(TEST_CLIENT)
      .eq('id', clientId)
    if (error) fail(`Updating the existing test client failed: ${error.message}`)
    console.log(`• Reused existing client ${clientId} (updated its config).`)
  } else {
    const { data: inserted, error } = await admin
      .from('clients')
      .insert(TEST_CLIENT)
      .select('id')
      .single()
    if (error) fail(`Inserting the test client failed: ${error.message}`)
    clientId = inserted.id
    console.log(`• Created client ${clientId} ("${TEST_CLIENT.label}").`)
  }

  // 2. Encrypt the DUMMY token and upsert the secret row. The plaintext token
  //    never touches the database — only the base64 ciphertext/iv/auth_tag do.
  const sealed = encryptToken(DUMMY_TOKEN)
  const { error: secretError } = await admin.from('client_secrets').upsert(
    {
      client_id: clientId,
      token_ciphertext: sealed.ciphertext,
      token_iv: sealed.iv,
      token_auth_tag: sealed.authTag,
    },
    { onConflict: 'client_id' },
  )
  if (secretError) fail(`Storing the encrypted token failed: ${secretError.message}`)
  console.log('• Stored the encrypted dummy token (ciphertext not shown).')

  // 3. Upsert the user -> client mapping (no-op if it already existed).
  const { error: mapError } = await admin
    .from('client_users')
    .upsert({ user_id: userId, client_id: clientId }, { onConflict: 'user_id' })
  if (mapError) fail(`Mapping the user to the client failed: ${mapError.message}`)
  console.log(`• Mapped user ${userId} -> client ${clientId}.`)

  console.log('\n✅  Seed complete. Now run:  npm run verify:registry\n')
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)))
