/**
 * Unit card icons, hotlinked directly from the community wiki
 * (animeexpeditions.miraheze.org) rather than copied into this repo — the
 * game itself only renders units as live 3D ViewportFrames, so there's no
 * first-party static image to fetch the way Gems/Trait Crystal have.
 * Resolved via the wiki's MediaWiki API (action=query&prop=imageinfo) against
 * each unit's "{Name}.png" file, using its 135px thumbnail rendition. Units
 * not listed here fall back to the generic placeholder icon.
 */
export const UNIT_ICON_IMAGES: Record<string, string> = {
  "8th Sword": "https://static.wikitide.net/animeexpeditionswiki/thumb/4/44/8th_Sword.png/135px-8th_Sword.png",
  "8th Sword (Berserk)":
    "https://static.wikitide.net/animeexpeditionswiki/thumb/e/e0/8th_Sword_%28Berserk%29.png/135px-8th_Sword_%28Berserk%29.png",
  "Bounty Hunter":
    "https://static.wikitide.net/animeexpeditionswiki/thumb/1/1d/Bounty_Hunter.png/135px-Bounty_Hunter.png",
  Carrot: "https://static.wikitide.net/animeexpeditionswiki/thumb/c/c3/Carrot.png/135px-Carrot.png",
  "Corps Captain":
    "https://static.wikitide.net/animeexpeditionswiki/thumb/1/1d/Corps_Captain.png/135px-Corps_Captain.png",
  Crimson: "https://static.wikitide.net/animeexpeditionswiki/thumb/0/01/Crimson.png/135px-Crimson.png",
  "Crimson (Brother)":
    "https://static.wikitide.net/animeexpeditionswiki/thumb/2/25/Crimson_%28Brother%29.png/135px-Crimson_%28Brother%29.png",
  "Curly Brow": "https://static.wikitide.net/animeexpeditionswiki/thumb/7/7e/Curly_Brow.png/135px-Curly_Brow.png",
  "Cursed Student":
    "https://static.wikitide.net/animeexpeditionswiki/thumb/6/60/Cursed_Student.png/135px-Cursed_Student.png",
  "Cursed Student (True Love)":
    "https://static.wikitide.net/animeexpeditionswiki/thumb/6/64/Cursed_Student_%28True_Love%29.png/135px-Cursed_Student_%28True_Love%29.png",
  "Demon Cyborg":
    "https://static.wikitide.net/animeexpeditionswiki/thumb/5/58/Demon_Cyborg.png/135px-Demon_Cyborg.png",
  "Elf Mage": "https://static.wikitide.net/animeexpeditionswiki/thumb/5/5b/Elf_Mage.png/135px-Elf_Mage.png",
  "Elf Mage (Unleashed)":
    "https://static.wikitide.net/animeexpeditionswiki/thumb/b/ba/Elf_Mage_%28Unleashed%29.png/135px-Elf_Mage_%28Unleashed%29.png",
  "Flame Emperor":
    "https://static.wikitide.net/animeexpeditionswiki/thumb/a/ae/Flame_Emperor.png/135px-Flame_Emperor.png",
  "Flame Emperor (Reincarnate)":
    "https://static.wikitide.net/animeexpeditionswiki/thumb/8/8e/Flame_Emperor_%28Reincarnate%29.png/135px-Flame_Emperor_%28Reincarnate%29.png",
  "Forbidden Teacher":
    "https://static.wikitide.net/animeexpeditionswiki/thumb/5/5c/Forbidden_Teacher.png/135px-Forbidden_Teacher.png",
  Greed: "https://static.wikitide.net/animeexpeditionswiki/thumb/0/04/Greed.png/135px-Greed.png",
  Hollow: "https://static.wikitide.net/animeexpeditionswiki/thumb/f/f6/Hollow.png/135px-Hollow.png",
  "Hollow (Blaze)":
    "https://static.wikitide.net/animeexpeditionswiki/thumb/e/e4/Hollow_%28Blaze%29.png/135px-Hollow_%28Blaze%29.png",
  "Ice Mage": "https://static.wikitide.net/animeexpeditionswiki/thumb/3/33/Ice_Mage.png/135px-Ice_Mage.png",
  "Ice Queen": "https://static.wikitide.net/animeexpeditionswiki/thumb/9/9f/Ice_Queen.png/135px-Ice_Queen.png",
  "Kid Assassin":
    "https://static.wikitide.net/animeexpeditionswiki/thumb/3/3e/Kid_Assassin.png/135px-Kid_Assassin.png",
  "Lady Giant": "https://static.wikitide.net/animeexpeditionswiki/thumb/4/4e/Lady_Giant.png/135px-Lady_Giant.png",
  "Lady Giant (Envy)":
    "https://static.wikitide.net/animeexpeditionswiki/thumb/7/78/Lady_Giant_%28Envy%29.png/135px-Lady_Giant_%28Envy%29.png",
  "Nen Hunter": "https://static.wikitide.net/animeexpeditionswiki/thumb/6/6e/Nen_Hunter.png/135px-Nen_Hunter.png",
  Puppet: "https://static.wikitide.net/animeexpeditionswiki/thumb/6/6f/Puppet.png/135px-Puppet.png",
  "Puppet (Telekinetic)":
    "https://static.wikitide.net/animeexpeditionswiki/thumb/e/e7/Puppet_%28Telekinetic%29.png/135px-Puppet_%28Telekinetic%29.png",
  "Ramen Guy": "https://static.wikitide.net/animeexpeditionswiki/thumb/c/c3/Ramen_Guy.png/135px-Ramen_Guy.png",
  Reaper: "https://static.wikitide.net/animeexpeditionswiki/thumb/6/6a/Reaper.png/135px-Reaper.png",
  "Reaper (Released)":
    "https://static.wikitide.net/animeexpeditionswiki/thumb/0/0f/Reaper_%28Released%29.png/135px-Reaper_%28Released%29.png",
  "Reishi Archer":
    "https://static.wikitide.net/animeexpeditionswiki/thumb/4/4e/Reishi_Archer.png/135px-Reishi_Archer.png",
  "Rubber Boy": "https://static.wikitide.net/animeexpeditionswiki/thumb/c/c6/Rubber_Boy.png/135px-Rubber_Boy.png",
  "Salmon Sorcerer":
    "https://static.wikitide.net/animeexpeditionswiki/thumb/3/32/Salmon_Sorcerer.png/135px-Salmon_Sorcerer.png",
  "Salmon Sorcerer (Grade 1)":
    "https://static.wikitide.net/animeexpeditionswiki/thumb/2/22/Salmon_Sorcerer_%28Grade_1%29.png/135px-Salmon_Sorcerer_%28Grade_1%29.png",
  Scissor: "https://static.wikitide.net/animeexpeditionswiki/thumb/1/1d/Scissor.png/135px-Scissor.png",
  Shadow: "https://static.wikitide.net/animeexpeditionswiki/thumb/8/8e/Shadow.png/135px-Shadow.png",
  "Shadow (Divine)":
    "https://static.wikitide.net/animeexpeditionswiki/thumb/6/69/Shadow_%28Divine%29.png/135px-Shadow_%28Divine%29.png",
  "Spirit General (Divine)":
    "https://static.wikitide.net/animeexpeditionswiki/thumb/6/68/Spirit_General_%28Divine%29.png/135px-Spirit_General_%28Divine%29.png",
  "Stone Alchemist":
    "https://static.wikitide.net/animeexpeditionswiki/thumb/5/5e/Stone_Alchemist.png/135px-Stone_Alchemist.png",
  "String Demon": "https://static.wikitide.net/animeexpeditionswiki/thumb/6/69/String_Demon.png/135px-String_Demon.png",
  "String Demon (Awakened)":
    "https://static.wikitide.net/animeexpeditionswiki/thumb/b/b0/String_Demon_%28Awakened%29.png/135px-String_Demon_%28Awakened%29.png",
  "The Hero": "https://static.wikitide.net/animeexpeditionswiki/thumb/2/20/The_Hero.png/135px-The_Hero.png",
  "Thunder Shinobi":
    "https://static.wikitide.net/animeexpeditionswiki/thumb/2/21/Thunder_Shinobi.png/135px-Thunder_Shinobi.png",
  "Toy Maker": "https://static.wikitide.net/animeexpeditionswiki/thumb/1/19/Toy_Maker.png/135px-Toy_Maker.png",
  "True Saint": "https://static.wikitide.net/animeexpeditionswiki/thumb/b/b6/True_Saint.png/135px-True_Saint.png",
  "True Saint (Holy)":
    "https://static.wikitide.net/animeexpeditionswiki/thumb/b/b9/True_Saint_%28Holy%29.png/135px-True_Saint_%28Holy%29.png",
  "Water Princess":
    "https://static.wikitide.net/animeexpeditionswiki/thumb/6/64/Water_Princess.png/135px-Water_Princess.png",
  "Winged Spirit (Divine)":
    "https://static.wikitide.net/animeexpeditionswiki/thumb/4/4c/Winged_Spirit_%28Divine%29.png/135px-Winged_Spirit_%28Divine%29.png",
};

export function unitIconImageUrl(displayName: string | undefined | null): string | null {
  if (!displayName) return null;
  return UNIT_ICON_IMAGES[displayName] ?? null;
}

/**
 * Full-body "pose" art for the same units — held in reserve for a future
 * detail view (not currently wired into any component).
 */
export const UNIT_POSE_IMAGES: Record<string, string> = {
  "8th Sword": "https://static.wikitide.net/animeexpeditionswiki/2/2b/8th_Sword_Pose.webp",
  "8th Sword (Berserk)": "https://static.wikitide.net/animeexpeditionswiki/7/70/8th_Sword_%28Berserk%29_Pose.webp",
  "Bounty Hunter": "https://static.wikitide.net/animeexpeditionswiki/3/3e/Bounty_Hunter_Pose.webp",
  Carrot: "https://static.wikitide.net/animeexpeditionswiki/a/a8/Carrot_Pose.webp",
  "Corps Captain": "https://static.wikitide.net/animeexpeditionswiki/8/82/Corps_Captain_Pose.webp",
  Crimson: "https://static.wikitide.net/animeexpeditionswiki/b/b9/Crimson_Pose.webp",
  "Crimson (Brother)": "https://static.wikitide.net/animeexpeditionswiki/8/8c/Crimson_%28Brother%29_Pose.webp",
  "Curly Brow": "https://static.wikitide.net/animeexpeditionswiki/c/c7/Curly_Brow_Pose.webp",
  "Cursed Student": "https://static.wikitide.net/animeexpeditionswiki/4/4b/Cursed_Student_Pose.webp",
  "Cursed Student (True Love)":
    "https://static.wikitide.net/animeexpeditionswiki/f/fd/Cursed_Student_%28True_Love%29_Pose.webp",
  "Demon Cyborg": "https://static.wikitide.net/animeexpeditionswiki/b/b0/Demon_Cyborg_Pose.webp",
  "Elf Mage": "https://static.wikitide.net/animeexpeditionswiki/f/ff/Elf_Mage_Pose.webp",
  "Elf Mage (Unleashed)": "https://static.wikitide.net/animeexpeditionswiki/c/c5/Elf_Mage_%28Unleashed%29_Pose.webp",
  "Flame Emperor": "https://static.wikitide.net/animeexpeditionswiki/5/5b/Flame_Emperor_Pose.webp",
  "Flame Emperor (Reincarnate)":
    "https://static.wikitide.net/animeexpeditionswiki/7/76/Flame_Emperor_%28Reincarnate%29_Pose.webp",
  "Forbidden Teacher": "https://static.wikitide.net/animeexpeditionswiki/1/19/Forbidden_Teacher_Pose.webp",
  Greed: "https://static.wikitide.net/animeexpeditionswiki/e/e1/Greed_Pose.webp",
  Hollow: "https://static.wikitide.net/animeexpeditionswiki/7/76/Hollow_Pose.webp",
  "Hollow (Blaze)": "https://static.wikitide.net/animeexpeditionswiki/f/fa/Hollow_%28Blaze%29_Pose.webp",
  "Ice Mage": "https://static.wikitide.net/animeexpeditionswiki/7/7f/Ice_Mage_Pose.webp",
  "Ice Queen": "https://static.wikitide.net/animeexpeditionswiki/e/e0/Ice_Queen_Pose.webp",
  "Kid Assassin": "https://static.wikitide.net/animeexpeditionswiki/4/40/Kid_Assassin_Pose.webp",
  "Lady Giant": "https://static.wikitide.net/animeexpeditionswiki/d/d3/Lady_Giant_Pose.webp",
  "Lady Giant (Envy)": "https://static.wikitide.net/animeexpeditionswiki/5/53/Lady_Giant_%28Envy%29_Pose.webp",
  "Nen Hunter": "https://static.wikitide.net/animeexpeditionswiki/2/24/Nen_Hunter_Pose.webp",
  Puppet: "https://static.wikitide.net/animeexpeditionswiki/3/39/Puppet_Pose.webp",
  "Puppet (Telekinetic)": "https://static.wikitide.net/animeexpeditionswiki/f/fa/Puppet_%28Telekinetic%29_Pose.webp",
  "Ramen Guy": "https://static.wikitide.net/animeexpeditionswiki/0/0a/Ramen_Guy_Pose.webp",
  Reaper: "https://static.wikitide.net/animeexpeditionswiki/6/6f/Reaper_Pose.webp",
  "Reaper (Released)": "https://static.wikitide.net/animeexpeditionswiki/d/da/Reaper_%28Released%29_Pose.webp",
  "Reishi Archer": "https://static.wikitide.net/animeexpeditionswiki/a/af/Reishi_Archer_Pose.webp",
  "Rubber Boy": "https://static.wikitide.net/animeexpeditionswiki/e/e4/Rubber_Boy_Pose.webp",
  "Salmon Sorcerer": "https://static.wikitide.net/animeexpeditionswiki/0/08/Salmon_Sorcerer_Pose.webp",
  "Salmon Sorcerer (Grade 1)":
    "https://static.wikitide.net/animeexpeditionswiki/c/c0/Salmon_Sorcerer_%28Grade_1%29_Pose.webp",
  Scissor: "https://static.wikitide.net/animeexpeditionswiki/4/44/Scissor_Pose.webp",
  Shadow: "https://static.wikitide.net/animeexpeditionswiki/8/83/Shadow_Pose.webp",
  "Shadow (Divine)": "https://static.wikitide.net/animeexpeditionswiki/f/f9/Shadow_%28Divine%29_Pose.webp",
  "Stone Alchemist": "https://static.wikitide.net/animeexpeditionswiki/7/7a/Stone_Alchemist_Pose.webp",
  "String Demon": "https://static.wikitide.net/animeexpeditionswiki/1/1b/String_Demon_Pose.webp",
  "String Demon (Awakened)":
    "https://static.wikitide.net/animeexpeditionswiki/9/9b/String_Demon_%28Awakened%29_Pose.webp",
  "The Hero": "https://static.wikitide.net/animeexpeditionswiki/6/6f/The_Hero_Pose.webp",
  "Thunder Shinobi": "https://static.wikitide.net/animeexpeditionswiki/5/5e/Thunder_Shinobi_Pose.webp",
  "Toy Maker": "https://static.wikitide.net/animeexpeditionswiki/0/06/Toy_Maker_Pose.webp",
  "True Saint": "https://static.wikitide.net/animeexpeditionswiki/4/43/True_Saint_Pose.webp",
  "True Saint (Holy)": "https://static.wikitide.net/animeexpeditionswiki/5/59/True_Saint_%28Holy%29_Pose.webp",
  "Water Princess": "https://static.wikitide.net/animeexpeditionswiki/b/b8/Water_Princess_Pose.webp",
};

export function unitPoseImageUrl(displayName: string | undefined | null): string | null {
  if (!displayName) return null;
  return UNIT_POSE_IMAGES[displayName] ?? null;
}
