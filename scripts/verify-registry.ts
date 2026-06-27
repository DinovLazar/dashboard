/**
 * B.03 verify — prove the registry's isolation, the way the real app reads it.
 *
 * Signed in AS THE TEST USER (publishable key + signInWithPassword), assert:
 *   1. `clients`        returns exactly ONE row  (the test client).
 *   2. `client_users`   returns exactly ONE row  (the user's own mapping).
 *   3. `client_secrets` returns ZERO rows        (the token is unreachable).
 * Then, as the SERVICE-ROLE client, fetch the seeded secret and confirm it
 * decrypts back to the original dummy token.
 *
 * Usage (the operator runs this; see docs/runbooks/registry-apply.md):
 *
 *   npm run verify:registry
 *
 * Requires (in .env.local — never committed): NEXT_PUBLIC_SUPABASE_URL,
 * NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY,
 * SANITY_TOKEN_ENC_KEY, TEST_USER_EMAIL, TEST_USER_PASSWORD.
 *
 * Prints a PASS/FAIL line per assertion and exits non-zero if any FAIL.
 */
import { createClient } from '@supabase/supabase-js'

import { createAdminClient } from '@/lib/supabase/admin'
import { decryptToken } from '@/lib/crypto/tokens'
import { requireEnv } from '@/lib/supabase/env'

import { DUMMY_TOKEN } from './test-fixtures'

try {
  process.loadEnvFile('.env.local')
} catch {
  // No .env.local file: rely on whatever is already in process.env.
}

let failures = 0

function check(label: string, passed: boolean, detail = '') {
  const tag = passed ? 'PASS' : 'FAIL'
  if (!passed) failures += 1
  console.log(`  [${tag}] ${label}${detail ? ` — ${detail}` : ''}`)
}

function die(message: string): never {
  console.error(`\n❌  ${message}\n`)
  process.exit(1)
}

async function main() {
  const url = requireEnv(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    'NEXT_PUBLIC_SUPABASE_URL',
  )
  const publishableKey = requireEnv(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  )
  const email = requireEnv(process.env.TEST_USER_EMAIL, 'TEST_USER_EMAIL')
  const password = requireEnv(process.env.TEST_USER_PASSWORD, 'TEST_USER_PASSWORD')

  // --- Sign in as the test user, exactly how the real app authenticates. -----
  const userClient = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: signIn, error: signInError } =
    await userClient.auth.signInWithPassword({ email, password })
  if (signInError || !signIn.user) {
    die(
      `Could not sign in as the test user (${email}): ` +
        `${signInError?.message ?? 'no user returned'}. ` +
        'Confirm the user exists and is auto-confirmed in Supabase → ' +
        'Authentication → Users, and that TEST_USER_EMAIL / TEST_USER_PASSWORD ' +
        'in .env.local are correct.',
    )
  }
  const userId = signIn.user.id
  console.log(`\nSigned in as test user ${userId} (${email}).\n`)

  console.log('As the signed-in user (RLS applies):')

  // 1. clients — exactly one row (the test client).
  const clientsRes = await userClient.from('clients').select('id, label')
  if (clientsRes.error) die(`Reading clients failed: ${clientsRes.error.message}`)
  const clients = clientsRes.data ?? []
  check(
    'clients returns exactly one row',
    clients.length === 1,
    `got ${clients.length}` +
      (clients.length === 1 ? ` ("${clients[0].label}")` : ''),
  )

  // 2. client_users — exactly one row (the user's own mapping).
  const mappingRes = await userClient
    .from('client_users')
    .select('user_id, client_id')
  if (mappingRes.error) die(`Reading client_users failed: ${mappingRes.error.message}`)
  const mappings = mappingRes.data ?? []
  check(
    'client_users returns exactly one row (own mapping)',
    mappings.length === 1 && mappings[0]?.user_id === userId,
    `got ${mappings.length}`,
  )

  // 3. client_secrets — zero rows readable. With RLS + revoked privileges this
  //    is typically a permission-denied error; either way the user reads NO
  //    token rows, which is the property we are proving.
  const secretsRes = await userClient.from('client_secrets').select('*')
  const secretsRead = secretsRes.data?.length ?? 0
  check(
    'client_secrets returns zero rows (token unreachable by the user)',
    secretsRead === 0,
    secretsRes.error
      ? `blocked: ${secretsRes.error.message}`
      : `rows readable: ${secretsRead}`,
  )

  // --- As the service-role client: the token is reachable and decrypts. ------
  console.log('\nAs the service-role client (bypasses RLS):')
  const clientId = mappings[0]?.client_id
  if (!clientId) die('No client_id available from the user mapping; cannot check decryption.')

  const admin = createAdminClient()
  const secretRow = await admin
    .from('client_secrets')
    .select('token_ciphertext, token_iv, token_auth_tag')
    .eq('client_id', clientId)
    .single()
  if (secretRow.error || !secretRow.data) {
    die(`Service-role could not read the seeded secret: ${secretRow.error?.message ?? 'no row'}`)
  }
  const decrypted = decryptToken({
    ciphertext: secretRow.data.token_ciphertext,
    iv: secretRow.data.token_iv,
    authTag: secretRow.data.token_auth_tag,
  })
  check(
    'seeded secret decrypts to the original dummy token',
    decrypted === DUMMY_TOKEN,
    decrypted === DUMMY_TOKEN ? 'match' : 'mismatch',
  )

  await userClient.auth.signOut()

  console.log(
    failures === 0
      ? '\n✅  ALL CHECKS PASSED — the test user resolves to exactly one client ' +
          'config and cannot read any token.\n'
      : `\n❌  ${failures} CHECK(S) FAILED — see above.\n`,
  )
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((err) => die(err instanceof Error ? err.message : String(err)))
