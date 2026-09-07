# Soundcheck ability audio

These are short audio-only extracts from Riot Games champion ability demonstrations, not assets taken from League of Listen. Champion identities and ability labels are returned only after a round is finished. The API does not expose this directory as static public files.

Source URLs and champion/ability attribution are recorded in `../../src/data/soundcheck.json`. The reusable extraction command is `node scripts/build-soundcheck-audio.cjs /path/to/ffmpeg` from the repository root. Output is mono MP3, at most nine seconds, without video or source title metadata.

Champion names, sounds and artwork belong to Riot Games and are not relicensed under the repository's software license. RiftEssence is an independent fan project, not affiliated with Riot Games. The game concept is credited to [League of Listen by Lynge](https://lynge.tv/listen/) in the game UI. Champion Archive separately credits [LoLdle](https://loldle.net/).
