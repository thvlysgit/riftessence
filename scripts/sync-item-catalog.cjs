// Pin item prices and artwork to one Riot Data Dragon patch. No runtime fetches.
const fs = require('node:fs/promises');
const path = require('node:path');
const tiers = require('./item-tiers.json');
async function main() {
  const version = process.argv[2];
  if (!/^\d+\.\d+\.\d+$/.test(version || ''))
    throw new Error('Pass a Data Dragon version, e.g. 16.18.1');
  const response = await fetch(
    `https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/item.json`,
  );
  if (!response.ok) throw new Error(`Data Dragon: ${response.status}`);
  const { data } = await response.json();
  // Curated normal-shop IDs: Data Dragon also marks some mode variants as map 11.
  // Exclude those, champion-specific items, quest upgrades, and transformed items.
  const standardIds = new Set(
    '1001 1004 1006 1011 1018 1026 1027 1028 1029 1031 1033 1036 1037 1038 1042 1043 1052 1053 1054 1055 1056 1057 1058 1082 1083 2003 2019 2020 2021 2022 2031 2055 2065 2138 2139 2140 2420 2501 2502 2503 2504 2508 3003 3004 3006 3009 3020 3024 3026 3031 3032 3033 3035 3036 3041 3044 3046 3047 3050 3051 3053 3057 3065 3066 3067 3068 3070 3071 3072 3073 3074 3075 3076 3077 3078 3082 3083 3084 3085 3086 3087 3089 3091 3094 3100 3102 3107 3108 3109 3110 3111 3113 3114 3115 3116 3118 3119 3123 3124 3133 3134 3135 3137 3139 3140 3142 3143 3144 3145 3147 3152 3153 3155 3156 3157 3158 3161 3165 3179 3181 3190 3211 3222 3302 3504 3508 3742 3748 3801 3802 3803 3814 3916 4005 4401 4628 4629 4630 4632 4633 4642 4645 4646 6333 6609 6610 6616 6617 6620 6621 6631 6653 6655 6657 6660 6662 6664 6665 6670 6672 6673 6675 6676 6690 6692 6694 6695 6696 6697 6698 6699 8010 8020'.split(
      ' ',
    ),
  );
  const eligible = Object.entries(data).filter(
    ([id, item]) =>
      standardIds.has(id) &&
      item.maps['11'] &&
      item.gold.purchasable &&
      item.gold.total > 0 &&
      !item.requiredAlly &&
      !item.requiredChampion &&
      item.inStore !== false,
  );
  // Explicit reviewed tiers: recipe edges do not reliably express item tiers.
  // Refuse new IDs until classified, rather than silently guessing a tier.
  for (const [id] of eligible) if (!tiers[id]) throw new Error('Unclassified item: ' + id);
  const items = eligible.map(([id, item]) => ({
    id,
    name: item.name,
    price: item.gold.total,
    image: item.image.full,
    tier: tiers[id],
  }));
  if (items.length < 20) throw new Error('Not enough eligible shop items');
  await fs.writeFile(
    path.join(__dirname, '../apps/api/src/data/item-catalog.json'),
    JSON.stringify({ version, items }, null, 2) + '\n',
  );
  console.log(`Saved ${items.length} Summoner's Rift shop items for ${version}.`);
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
