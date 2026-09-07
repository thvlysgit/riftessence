// Extract audio (never video) from Riot's ability demonstrations. Requires ffmpeg.
// Use: node scripts/build-soundcheck-audio.cjs /path/to/ffmpeg
const fs = require('node:fs/promises');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const catalog = require('../apps/api/src/data/game-catalog.json');
const ffmpeg = process.argv[2] || 'ffmpeg';
async function main() {
  const root = path.resolve(__dirname, '../apps/api/assets/soundcheck');
  await fs.mkdir(root, { recursive: true });
  const manifest = {};
  for (const champion of catalog.champions.filter(c => c.abilities.length)) {
    const sounds = [];
    for (const ability of champion.abilities) {
      const filename = `${champion.id}-${ability.key}.mp3`;
      const output = path.join(root, filename);
      const result = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', ability.video,
        '-map', '0:a:0', '-vn', '-t', '9', '-ac', '1', '-ar', '44100', '-b:a', '96k',
        '-af', 'silenceremove=start_periods=1:start_threshold=-45dB', '-map_metadata', '-1', output], { windowsHide: true, timeout: 45000 });
      if (result.status === 0 && (await fs.stat(output)).size > 2500) {
        sounds.push({ key: ability.key, name: ability.name, file: filename, source: ability.video });
      } else {
        console.warn(`Skipping unavailable audio: ${champion.id} ${ability.key}`);
        await fs.rm(output, { force: true });
      }
    }
    if (sounds.length >= 2) manifest[champion.id] = sounds;
    console.log(`${champion.id}: ${sounds.length} ability clips`);
  }
  if (Object.keys(manifest).length < 10) throw new Error('Not enough valid champions to publish Soundcheck.');
  await fs.writeFile(path.resolve(__dirname, '../apps/api/src/data/soundcheck.json'), JSON.stringify(manifest, null, 2) + '\n');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
