// Pin direct crafting recipes to the same Data Dragon patch as Shopkeeper.
const fs = require('node:fs/promises');
const path = require('node:path');
const catalog = require('../apps/api/src/data/item-catalog.json');

async function main() {
  const response = await fetch(
    `https://ddragon.leagueoflegends.com/cdn/${catalog.version}/data/en_US/item.json`,
  );
  if (!response.ok) throw new Error(`Data Dragon: ${response.status}`);
  const { data } = await response.json();
  const items = new Map(catalog.items.map((item) => [item.id, item]));
  const recipes = catalog.items.flatMap((item) => {
    const from = data[item.id]?.from;
    if (
      !['epic', 'legendary'].includes(item.tier) ||
      !from ||
      from.length < 1 ||
      from.length > 4 ||
      from.some((id) => !items.has(id))
    )
      return [];
    // Preserve duplicate ingredients: two Long Swords require two separate pieces.
    return [{ targetId: item.id, ingredientIds: from }];
  });
  for (const [tier, min, max] of [
    ['epic', 2, 2],
    ['legendary', 2, 2],
    ['legendary', 3, 4],
  ]) {
    if (
      recipes.filter(
        (recipe) =>
          items.get(recipe.targetId).tier === tier &&
          recipe.ingredientIds.length >= min &&
          recipe.ingredientIds.length <= max,
      ).length < 3
    )
      throw new Error(`Too few ${tier} recipes with ${min}–${max} ingredients`);
  }
  await fs.writeFile(
    path.join(__dirname, '../apps/api/src/data/recipe-catalog.json'),
    JSON.stringify(
      {
        version: catalog.version,
        recipes,
        traits: Object.fromEntries(
          catalog.items.map((item) => [item.id, data[item.id]?.tags || []]),
        ),
      },
      null,
      2,
    ) + '\n',
  );
  console.log(`Saved ${recipes.length} direct recipes for patch ${catalog.version}.`);
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
