// Refresh the checked-in quiz catalog from Riot Data Dragon and CommunityDragon.
// Runtime puzzles never depend on a third-party catalog request.
const fs = require('node:fs/promises');
const path = require('node:path');

function countSkins(skins) {
  if (!Array.isArray(skins) || skins.some((skin) => !Number.isInteger(skin.num))) {
    throw new Error('Invalid Data Dragon skin list');
  }
  // The list includes chromas. parentSkin may be 0 (a base-skin chroma).
  // chromas: true means a skin HAS chromas, not that it IS a chroma.
  return skins.filter((skin) => skin.num !== 0 && skin.parentSkin == null).length;
}

async function main() {
  const version = process.argv[2] || '16.10.1';
  const destination = path.join(__dirname, '../apps/api/src/data/game-catalog.json');
  const skinsOnly = process.argv.includes('--skins-only');
  const existing = skinsOnly ? JSON.parse(await fs.readFile(destination, 'utf8')) : null;
  let roster = existing?.champions;
  if (!roster) {
    const response = await fetch(
      `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`,
    );
    if (!response.ok) throw new Error(`Data Dragon: ${response.status}`);
    roster = Object.values((await response.json()).data);
  }
  const audioRoster = new Set([
    'Ahri',
    'Ashe',
    'Blitzcrank',
    'Brand',
    'Caitlyn',
    'Darius',
    'Draven',
    'Ezreal',
    'Fiddlesticks',
    'Garen',
    'Jhin',
    'Jinx',
    'LeeSin',
    'Leona',
    'Lux',
    'Malphite',
    'Morgana',
    'Nami',
    'Nautilus',
    'Orianna',
    'Pyke',
    'Sona',
    'Thresh',
    'Veigar',
    'Yasuo',
    'Zed',
  ]);
  const champions = [];
  for (const c of roster) {
    const skinResponse = await fetch(
      `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion/${c.id}.json`,
    );
    if (!skinResponse.ok) throw new Error(`Data Dragon skins ${c.id}: ${skinResponse.status}`);
    const skinData = await skinResponse.json();
    const skinCount = countSkins(skinData.data[c.id].skins);
    if (skinsOnly) {
      champions.push({ ...c, skinCount });
      continue;
    }
    let abilities = [];
    if (audioRoster.has(c.id)) {
      const detail = await fetch(
        `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champions/${c.key}.json`,
      );
      if (!detail.ok) throw new Error(`CommunityDragon ${c.id}: ${detail.status}`);
      const champion = await detail.json();
      abilities = champion.spells
        .filter((s) => s.abilityVideoPath)
        .map((s) => ({
          key: s.spellKey.toUpperCase(),
          name: s.name,
          video: `https://d28xe8vt774jo5.cloudfront.net/${s.abilityVideoPath}`,
        }));
    }
    champions.push({
      id: c.id,
      name: c.name,
      title: c.title,
      roles: c.tags,
      resource: c.partype,
      range: c.stats.attackrange >= 300 ? 'Ranged' : 'Melee',
      skinCount,
      abilities,
    });
  }
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(
    destination,
    JSON.stringify({ ...(existing || { version }), skinVersion: version, champions }, null, 2) +
      '\n',
  );
  console.log(
    `Saved ${champions.length} champions; ${
      champions.filter((c) => c.abilities.length).length
    } ability-audio candidates.`,
  );
}
module.exports = { countSkins };
if (require.main === module)
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
