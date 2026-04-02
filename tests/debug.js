import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load tests/.env first, then fall back to parent .env
dotenv.config({ path: resolve(__dirname, '.env') })
dotenv.config({ path: resolve(__dirname, '../.env') })

const URL          = process.env.VITE_SUPABASE_URL
const KEY          = process.env.VITE_SUPABASE_ANON_KEY
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY

// ─── helpers ────────────────────────────────────────────────────────────────
const green  = s => `\x1b[32m${s}\x1b[0m`
const red    = s => `\x1b[31m${s}\x1b[0m`
const yellow = s => `\x1b[33m${s}\x1b[0m`
const bold   = s => `\x1b[1m${s}\x1b[0m`
const dim    = s => `\x1b[2m${s}\x1b[0m`

function pass(label) { console.log(`  ${green('✓')} ${label}`) }
function fail(label, err) {
  console.log(`  ${red('✗')} ${label}`)
  console.log(`    ${red('Error:')} ${err?.message ?? err}`)
  if (err?.code)    console.log(`    ${dim('Code:')}  ${err.code}`)
  if (err?.hint)    console.log(`    ${dim('Hint:')}  ${err.hint}`)
  if (err?.details) console.log(`    ${dim('Details:')} ${err.details}`)
}
function section(title) { console.log(`\n${bold(title)}`) }

// ─── main ────────────────────────────────────────────────────────────────────
console.log(bold('\n🏈  Ultifilm — Supabase Debug Runner\n'))

// 1. Check env vars
section('1. Environment')
if (!URL || !KEY) {
  console.log(red('  ✗ .env not found or missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY'))
  console.log(yellow('  → Copy .env.example to .env and fill in your Supabase credentials.'))
  process.exit(1)
}
console.log(`  ${dim('URL:')} ${URL}`)
console.log(`  ${dim('Key:')} ${KEY.slice(0, 20)}...`)
pass('Env vars loaded')

const db      = createClient(URL, KEY)
const adminDb = SERVICE_KEY ? createClient(URL, SERVICE_KEY) : null

// 2. Check RLS / table access
section('2. Table access (SELECT)')
for (const table of ['games', 'plays', 'player_positions']) {
  const { error } = await db.from(table).select('*').limit(1)
  if (error) fail(`SELECT on "${table}"`, error)
  else       pass(`SELECT on "${table}"`)
}

// 3. INSERT a game
section('3. INSERT game')
const { data: game, error: gameErr } = await db
  .from('games')
  .insert({ title: '[debug] Test Game', video_path: null })
  .select()
  .single()

if (gameErr) {
  fail('INSERT into games', gameErr)
  console.log(yellow('\n  → Most likely fixes:'))
  console.log(yellow('    Run in Supabase SQL Editor:'))
  console.log(yellow('    ALTER TABLE public.games DISABLE ROW LEVEL SECURITY;'))
  console.log(yellow('    GRANT ALL ON public.games TO anon;'))
  process.exit(1)
} else {
  pass(`INSERT game — id: ${game.id}`)
}

// 4. INSERT a play
section('4. INSERT play')
const { data: play, error: playErr } = await db
  .from('plays')
  .insert({ game_id: game.id, name: '[debug] Test Play', start_time: 0, end_time: 10, notes: 'debug' })
  .select()
  .single()

if (playErr) fail('INSERT into plays', playErr)
else         pass(`INSERT play — id: ${play.id}`)

// 5. INSERT player positions
section('5. INSERT player_positions')
const positions = [
  { play_id: play?.id, team: 'offense', x: 30, y: 40, label: 'H1' },
  { play_id: play?.id, team: 'defense', x: 60, y: 50, label: 'D1' },
  { play_id: play?.id, team: 'disc',    x: 28, y: 38, label: ''   },
]
const { error: posErr } = await db.from('player_positions').insert(positions)
if (posErr) fail('INSERT into player_positions', posErr)
else        pass('INSERT 3 player_positions')

// 6. UPDATE game
section('6. UPDATE game')
const { error: updErr } = await db
  .from('games')
  .update({ title: '[debug] Test Game (updated)' })
  .eq('id', game.id)
if (updErr) fail('UPDATE game', updErr)
else        pass('UPDATE game')

// 7. Storage bucket — list via service role if available
section('7. Storage bucket')
if (adminDb) {
  const { data: buckets, error: bucketErr } = await adminDb.storage.listBuckets()
  if (bucketErr) fail('List buckets (service role)', bucketErr)
  else {
    const found = buckets.find(b => b.id === 'videos')
    if (found) pass(`Bucket "videos" exists (public: ${found.public})`)
    else       fail('Bucket "videos"', { message: 'Not found — create it in Supabase Storage UI' })
  }
} else {
  console.log(`  ${dim('→ No SUPABASE_SERVICE_ROLE_KEY in tests/.env — skipping bucket list, checking via upload below.')}`)
}

// 8. Storage upload test
section('8. Storage upload')
const testFile = new Blob(['ultifilm debug test'], { type: 'text/plain' })
const testPath = `debug/test-${Date.now()}.txt`
const { error: uploadErr } = await db.storage.from('videos').upload(testPath, testFile)
if (uploadErr) {
  fail('Upload file to "videos" bucket', uploadErr)
  console.log(yellow('\n  → Run in Supabase SQL Editor:'))
  console.log(yellow('    DROP POLICY IF EXISTS "public upload" ON storage.objects;'))
  console.log(yellow('    CREATE POLICY "public upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = \'videos\');'))
} else {
  pass(`Upload succeeded — path: ${testPath}`)
  // cleanup
  await db.storage.from('videos').remove([testPath])
  pass('Upload test file cleaned up')
}

// 9. Cleanup — delete the test game (cascades to plays + positions)
section('9. Cleanup')
const { error: delErr } = await db.from('games').delete().eq('id', game.id)
if (delErr) fail('DELETE test game', delErr)
else        pass('Test data cleaned up')

// ─── summary ─────────────────────────────────────────────────────────────────
console.log(`\n${bold('Done.')}\n`)
