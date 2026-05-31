import { StoryPreset, VoiceProfile } from "./types";

export const VOICE_PROFILES: VoiceProfile[] = [
  {
    id: "v1",
    name: "Kore (Elegant Muse)",
    voiceName: "Kore",
    gender: "Female",
    vibe: "Warm, empathetic & comforting",
    description: "Perfect for classic novels, emotional dialogues, and romantic moments. Extremely expressive in tender and serene passages.",
    emotionSupport: "Excellent at sorrow, romance, and serene narration.",
  },
  {
    id: "v2",
    name: "Kore (Sighing Whisperer)",
    voiceName: "Kore",
    gender: "Female",
    vibe: "Soft, intimate & whisper-quiet",
    description: "Configured to deliver a highly breathy, quiet voice that speaks directly into your ears. Best for bedtime stories and dark secrets.",
    emotionSupport: "Incredible for soft secrets, horror whispers, and peaceful romance.",
    vocalModifier: "whispering in a very soft, breathy, close-to-mic cinematic voice",
  },
  {
    id: "v3",
    name: "Zephyr (Radiant Star)",
    voiceName: "Zephyr",
    gender: "Female",
    vibe: "Bright, lively & energetic",
    description: "An animated, crisp tone ideal for adventure books, fantasy worlds, and exciting narrative twists.",
    emotionSupport: "Excellent at joy, astonishment, and suspenseful energy.",
  },
  {
    id: "v4",
    name: "Zephyr (Bubbly Fairy)",
    voiceName: "Zephyr",
    gender: "Female",
    vibe: "High-spirited, fast-paced & joyful",
    description: "Fitted with high pitch and fast delivery. Perfect for whimsical creatures, children's fables, and humorous highlights.",
    emotionSupport: "Unbeatable for breathless giggles and rapid, joyous excitement.",
    vocalModifier: "speak with high energy, joyful giggles, and childlike excitement",
  },
  {
    id: "v5",
    name: "Charon (Ancient Oracle)",
    voiceName: "Charon",
    gender: "Male",
    vibe: "Deep, theatrical & historic narrator",
    description: "Sophisticated and solemn male voice. Excellent for heavy, dark prose, ancient lore, mystery novels, and classic philosophy.",
    emotionSupport: "Outstanding for suspense, dramatic anger, and formal calmness.",
  },
  {
    id: "v6",
    name: "Charon (Cosmic Resonant)",
    voiceName: "Charon",
    gender: "Male",
    vibe: "Grave, slow, echoing & ominous",
    description: "Tuned with high bass resonance and slow rhythm to give the voice a hauntingly dramatic weight.",
    emotionSupport: "Spectacular for echoing suspense, heavy despair, and ancient prophecies.",
    vocalModifier: "speak with a deep, ghostly resonance and extremely slow, dramatic pacing",
  },
  {
    id: "v7",
    name: "Fenrir (Primal Huntsman)",
    voiceName: "Fenrir",
    gender: "Male",
    vibe: "Grave, husky & intense thriller",
    description: "A dark, intense throat-profile. Unbeatable for suspense, high stakes, psychological thrillers, and action stories.",
    emotionSupport: "Exceptional representation of terror, anger, and breathy tension.",
  },
  {
    id: "v8",
    name: "Fenrir (Rugged Bandit)",
    voiceName: "Fenrir",
    gender: "Male",
    vibe: "Dry, raspy, gravelly & intimidating",
    description: "A rugged, craggy performance that sounds battle-worn and unpolished. Ideal for villains, veterans, and raw dialogues.",
    emotionSupport: "Invaluable for dry sarcastic humor, gravelly rage, and fatigue.",
    vocalModifier: "narrate in a dry, gravelly, rough, battle-worn raspy voice",
  },
  {
    id: "v9",
    name: "Puck (Merry Jester)",
    voiceName: "Puck",
    gender: "Male",
    vibe: "Sprightly, friendly & engaging storyteller",
    description: "A friendly, light, and engaging storytelling voice ideal for comedy, whimsical narratives, fairy tales, and quick dialogues.",
    emotionSupport: "Excellent at excitement, joy, and playful astonishment.",
  },
  {
    id: "v10",
    name: "Puck (Wily Goblin)",
    voiceName: "Puck",
    gender: "Male",
    vibe: "Quick-witted, mocking & high-pitched",
    description: "A playful, rapid performance with a sneering edge key for mischievous fantasy creatures or cheeky, satirical stories.",
    emotionSupport: "Excellent for quick teasing jokes, high-pitched wonder, and astonishment.",
    vocalModifier: "speak with quick, teasing laughter, and a mischievous, high-pitched dry tone",
  },
];

export const STORY_PRESETS: StoryPreset[] = [
  {
    id: "p1",
    title: "The Tell-Tale Heart",
    author: "Edgar Allan Poe",
    genre: "Gothic Horror",
    coverColor: "from-red-950 to-neutral-950 border-red-900/30",
    description: "A terrifying psychological descent into madness. Best tested with Fenrir (Primal Huntsman) or Charon (Cosmic Resonant).",
    text: `True! — nervous — very, very dreadfully nervous I had been and am; but why will you say that I am mad? The disease had sharpened my senses — not destroyed — not dulled them. Above all was the sense of hearing acute. 

Hearken! and observe how healthily — how calmly I can tell you the whole story.

It is impossible to say how first the idea entered my brain; but once conceived, it haunted me day and night. Object there was none. Passion there was none. I loved the old man. He had never wronged me. He had never given me insult. For his gold I had no desire. I think it was his eye! yes, it was this! He had the eye of a vulture — a pale blue eye, with a film over it. Whenever it fell upon me, my blood ran cold; and so by degrees — very gradually — I made up my mind to take the life of the old man, and thus rid myself of the eye forever.`,
  },
  {
    id: "p2",
    title: "The Happy Prince",
    author: "Oscar Wilde",
    genre: "Classic Fairy Tale",
    coverColor: "from-amber-950 to-amber-900 border-amber-700/30",
    description: "A deeply moving and sorrowful fairy tale of empathy and ultimate sacrifice. Best tested with Kore (Elegant Muse).",
    text: `High above the city, on a tall column, stood the statue of the Happy Prince. He was gilded all over with thin leaves of fine gold, for eyes he had two bright sapphires, and a large red ruby glowed on his sword-hilt. He was very much admired indeed.

One night there flew over the city a little Swallow. His friends had gone away to Egypt six weeks before, but he had stayed behind, for he was in love with the most beautiful Reed. 

"Where shall I put up?" he said; "I hope the town has made preparations."

Then he saw the statue on the tall column. "I will put up there," he cried; "it is a fine position, with plenty of fresh air." So he alighted just between the feet of the Happy Prince.

"I have a golden bedroom," he said softly to himself as he looked round, and he prepared to go to sleep; but just as he was putting his head under his wing a large drop of water fell on him. "What a curious thing!" he cried; "there is not a single cloud in the sky, the stars are quite clear and bright, and yet it is raining!"

Then another drop fell. 

"What is the use of a statue if it cannot keep the rain off?" he said; "I must look for a good chimney-pot," and he determined to fly away. But before he had opened his wings, a third drop fell, and he looked up, and saw — Ah! what did he see?

The eyes of the Happy Prince were filled with tears, and tears were running down his golden cheeks. His face was so beautiful in the moonlight that the little Swallow was filled with pity.`,
  },
  {
    id: "p3",
    title: "Alice in Wonderland",
    author: "Lewis Carroll",
    genre: "Wonder & Adventure",
    coverColor: "from-teal-950 to-cyan-950 border-teal-800/30",
    description: "A whimsical, curious trip down an unexpected rabbit hole. Best tested with Zephyr (Radiant Star) or Puck (Merry Jester).",
    text: `Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, "and what is the use of a book," thought Alice "without pictures or conversations?"

So she was considering in her own mind whether the pleasure of making a daisy-chain would be worth the trouble of getting up and picking the daisies, when suddenly a White Rabbit with pink eyes ran close by her.

There was nothing so very remarkable in that; nor did Alice think it so very much out of the way to hear the Rabbit say to itself, "Oh dear! Oh dear! I shall be late!" (when she thought it over afterwards, it occurred to her that she ought to have wondered at this, but at the time it all seemed quite natural); but when the Rabbit actually took a watch out of its waistcoat-pocket, and looked at it, and then hurried on, Alice started to her feet, for it flashed across her mind that she had never before seen a rabbit with either a waistcoat-pocket, or a watch to take out of it, and burning with curiosity, she ran across the field after it, and fortunately was just in time to see it pop down a large rabbit-hole under the hedge.

In another moment down went Alice after it, never once considering how in the world she was to get out again.`,
  },
  {
    id: "p4",
    title: "The Time Machine",
    author: "H.G. Wells",
    genre: "Wonder & Adventure",
    coverColor: "from-slate-900 to-indigo-950 border-slate-700/30",
    description: "An extraordinary journey through millions of years into the far future of humankind. Great with Charon (Ancient Oracle).",
    text: `The Time Traveller (for so it will be convenient to speak of him) was expounding a recondite matter to us. His grey eyes shone and twinkled, and his usually pale face was flushed and animated. The fire burned brightly, and the soft radiance of the incandescent lights in the lilies of silver caught the bubbles that flashed and passed in our glasses.

"You must follow me carefully," he said. "Shall I lose my outline in the dimness? Or will I fade from sight entirely into the Fourth Dimension, which is Time? There is no difference between Time and any of the other three dimensions of Space, except that our consciousness moves along it. We are always getting away from the present, yet we must construct a machine that can travel in either direction."`,
  },
];
