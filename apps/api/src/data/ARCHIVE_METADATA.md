Archive uses five of eight clue types, selected at round creation and stored in
GameRound.clueTypes. Daily selection is shared for the UTC day; practice is random.
Existing rounds with no selection keep their original four clues so evidence does
not change during a case. Metadata is server-only; the public catalog contains
champion names and IDs, never the answer's attributes.

`archive-metadata.json` is a reviewed snapshot for the 172 champions in
`game-catalog.json`. Update it when adding champions; startup and tests enforce
coverage. No third-party requests happen during play.

- Typical lanes and original release dates: [Meraki Analytics](https://github.com/meraki-analytics/lolstaticdata),
  [champion data](https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/champions.json),
  with thanks to Meraki and the League of Legends Wiki. Lanes are typical
  positions, not live pick-rate rankings. Zaahen's Top/Jungle positions are a
  curated addition to this snapshot.
- Regional affiliation and gender baseline: [Kerrders' LoLdleData](https://github.com/Kerrders/LoLdleData)
  and the linked generated data source in the JSON. Region means lore affiliation,
  not birthplace; unaffiliated champions use Runeterra. Gender supports multiple
  values for Kindred (Lamb/Wolf), and Other for ungendered entities, rather than
  treating every non-female result as male. Reviewed corrections include Yunara,
  Kindred, Blitzcrank, Fiddlesticks, Cho'Gath, and Nocturne.
- [Yunara](https://www.leagueoflegends.com/en-us/champions/yunara/),
  [Kindred](https://www.leagueoflegends.com/en-us/champions/kindred/),
  [Blitzcrank](https://www.leagueoflegends.com/en-us/champions/blitzcrank/),
  and [Zaahen](https://www.leagueoflegends.com/en-us/champions/zaahen/): Riot champion pages.
  Zaahen's release date comes from [patch 25.23](https://www.leagueoflegends.com/en-us/news/game-updates/patch-25-23-notes/).
- Role, resource, range, and skins use the existing Riot Data Dragon catalog.
  Skin counts exclude base appearances and chromas. Empty resource labels mean
  None. Release dates compare chronologically; higher means later.

Do not overwrite curated metadata with the scraped gender defaults. When refreshing
sources, review the diff and keep explicit corrections for multi-entity champions.
