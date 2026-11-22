import type {
  CompetencyId,
  DifficultyTier,
  Question,
  RhythmToken,
  SequenceItem,
  VisualColor,
  VisualShape,
  VisualToken,
} from '../types/game';
import {
  isAlphabetSequenceUnambiguous,
  isArithmeticSequenceUnambiguous,
  isRepeatingCycleUnambiguous,
} from './mathValidator';

export const VISUAL_TOKENS: Record<string, VisualToken> = {
  amber_star: { id: 'amber_star', shape: 'star', color: 'amber', label: 'Amber Star' },
  sky_circle: { id: 'sky_circle', shape: 'circle', color: 'sky', label: 'Sky Circle' },
  rose_triangle: { id: 'rose_triangle', shape: 'triangle', color: 'rose', label: 'Rose Triangle' },
  emerald_leaf: { id: 'emerald_leaf', shape: 'leaf', color: 'emerald', label: 'Emerald Leaf' },
  indigo_diamond: { id: 'indigo_diamond', shape: 'diamond', color: 'indigo', label: 'Indigo Diamond' },
  coral_square: { id: 'coral_square', shape: 'square', color: 'coral', label: 'Coral Square' },
  amber_petal: { id: 'amber_petal', shape: 'petal', color: 'amber', label: 'Golden Petal' },
};

export const RHYTHM_TOKENS: Record<string, RhythmToken> = {
  drum: { id: 'drum', instrument: 'drum', symbol: '●', label: 'Boom Drum', pitchHz: 146.83, color: 'coral' },
  chime: { id: 'chime', instrument: 'chime', symbol: '◆', label: 'Crystal Chime', pitchHz: 523.25, color: 'sky' },
  bell: { id: 'bell', instrument: 'bell', symbol: '▲', label: 'Forest Bell', pitchHz: 659.25, color: 'amber' },
  wood: { id: 'wood', instrument: 'wood', symbol: '■', label: 'Wood Tap', pitchHz: 329.63, color: 'emerald' },
  sparkle: { id: 'sparkle', instrument: 'sparkle', symbol: '★', label: 'Fairy Sparkle', pitchHz: 783.99, color: 'indigo' },
};

// Deterministic seeded PRNG (Mulberry32)
export function createSeededRng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWithRng<T>(arr: T[], rng: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function makeNumberOptions(
  correct: number,
  step: number,
  rng: () => number,
  count = 4
): Array<{ id: string; label: string; value: number }> {
  const candidates = new Set<number>([correct]);
  const offsets = [
    step,
    -step,
    step + 1,
    step - 1,
    2 * step,
    -2 * step,
    1,
    -1,
    2,
    -2,
    5,
    10,
  ];
  for (const off of shuffleWithRng(offsets, rng)) {
    if (candidates.size >= count) break;
    const val = correct + off;
    if (val >= 0 && val !== correct) {
      candidates.add(val);
    }
  }
  let fallback = 1;
  while (candidates.size < count) {
    const val = correct + fallback;
    if (val >= 0 && !candidates.has(val)) candidates.add(val);
    fallback++;
  }
  return shuffleWithRng(Array.from(candidates), rng).map((v) => ({
    id: `opt-${v}`,
    label: String(v),
    value: v,
  }));
}

/**
 * Curated prevalidated question bank covering all 12 question types,
 * 4 world areas + Champion's Tower, and Grade 2 competencies.
 */
export const CURATED_QUESTIONS: Question[] = [
  // === AREA 1: THE COUNTING GROVE ===
  {
    id: 'cg-bridge-1',
    competency: 'number_patterns',
    tier: 1,
    kind: 'next_term',
    interaction: 'slot_drag_tap',
    area: 'counting_grove',
    prompt: 'Place the missing river stone to finish the bridge across Whispering Brook!',
    storyContext: 'Barnaby the Owl points to the mossy river stones: "The stones grow by the same jump each time!"',
    sequence: [
      { kind: 'number', value: 4 },
      { kind: 'number', value: 8 },
      { kind: 'number', value: 12 },
      { kind: 'number', value: 16 },
      { kind: 'number', value: '?', isMissing: true },
    ],
    missingIndices: [4],
    options: [
      { id: 'o1', label: '18', value: 18 },
      { id: 'o2', label: '20', value: 20 },
      { id: 'o3', label: '22', value: 22 },
      { id: 'o4', label: '24', value: 24 },
    ],
    correctAnswer: 20,
    ruleSummary: 'Add 4 each time (+4)',
    stepDelta: 4,
    hint1: 'Look at how much each stone number grows from one stone to the next.',
    hint2: 'From 4 to 8, we add 4. From 8 to 12, we add 4 again. What is 16 + 4?',
    explanation: 'Every stone is 4 more than the stone before it: 4, 8, 12, 16, 20. So 16 + 4 = 20!',
    misconceptionTags: ['constant_addition_error'],
    parentTag: 'Increasing number pattern (+4)',
  },
  {
    id: 'cg-stairs-2',
    competency: 'missing_terms',
    tier: 1,
    kind: 'missing_middle',
    interaction: 'slot_drag_tap',
    area: 'counting_grove',
    prompt: 'A mossy treehouse stair is missing its middle step. Which number belongs there?',
    storyContext: 'The squirrel guardians need every step numbered in order so they can carry acorns up safely.',
    sequence: [
      { kind: 'number', value: 10 },
      { kind: 'number', value: 15 },
      { kind: 'number', value: '?', isMissing: true },
      { kind: 'number', value: 25 },
      { kind: 'number', value: 30 },
    ],
    missingIndices: [2],
    options: [
      { id: 'o1', label: '18', value: 18 },
      { id: 'o2', label: '20', value: 20 },
      { id: 'o3', label: '22', value: 22 },
      { id: 'o4', label: '24', value: 24 },
    ],
    correctAnswer: 20,
    ruleSummary: 'Count forward by 5s (+5)',
    stepDelta: 5,
    hint1: 'Check the first two numbers (10 and 15) and the last two numbers (25 and 30).',
    hint2: 'Each step goes up by 5. What is 15 + 5? Check if adding 5 again gives 25!',
    explanation: 'The steps count by 5s: 10, 15, 20, 25, 30. The missing middle step is 20.',
    misconceptionTags: ['missing_middle_term'],
    parentTag: 'Missing middle term (+5)',
  },
  {
    id: 'cg-fruit-3',
    competency: 'number_patterns',
    tier: 2,
    kind: 'two_missing_terms',
    interaction: 'slot_drag_tap',
    area: 'counting_grove',
    prompt: 'Help Pip stack the shrinking piles of sunberries! Fill in the last two baskets.',
    storyContext: 'Each basket holds fewer sunberries as you walk deeper into the grove.',
    sequence: [
      { kind: 'number', value: 45 },
      { kind: 'number', value: 40 },
      { kind: 'number', value: 35 },
      { kind: 'number', value: 30 },
      { kind: 'number', value: '?', isMissing: true },
      { kind: 'number', value: '?', isMissing: true },
    ],
    missingIndices: [4, 5],
    options: [
      { id: 'o1', label: '25', value: 25 },
      { id: 'o2', label: '20', value: 20 },
      { id: 'o3', label: '28', value: 28 },
      { id: 'o4', label: '15', value: 15 },
      { id: 'o5', label: '35', value: 35 },
    ],
    correctAnswer: [25, 20],
    ruleSummary: 'Subtract 5 each time (-5)',
    stepDelta: -5,
    hint1: 'Notice whether the numbers are getting bigger or smaller as you move right.',
    hint2: 'From 45 to 40, we take away 5. Subtract 5 from 30 for the first basket, then 5 again for the second.',
    explanation: 'Each basket has 5 fewer berries: 30 - 5 = 25, and 25 - 5 = 20.',
    misconceptionTags: ['decreasing_sequence', 'two_missing_terms'],
    parentTag: 'Decreasing pattern, two missing terms (-5)',
  },
  {
    id: 'cg-rule-4',
    competency: 'number_patterns',
    tier: 2,
    kind: 'find_rule',
    interaction: 'rule_selector',
    area: 'counting_grove',
    prompt: 'Look at the glowing mushroom trail: 14, 21, 28, 35, 42. What rule makes this pattern?',
    storyContext: 'Barnaby wants to write the grove’s rule in the Guardian Ledger.',
    sequence: [
      { kind: 'number', value: 14 },
      { kind: 'number', value: 21 },
      { kind: 'number', value: 28 },
      { kind: 'number', value: 35 },
      { kind: 'number', value: 42 },
    ],
    options: [
      { id: 'r1', label: 'Add 7 each time (+7)', value: 'Add 7 each time' },
      { id: 'r2', label: 'Add 6 each time (+6)', value: 'Add 6 each time' },
      { id: 'r3', label: 'Subtract 7 each time (-7)', value: 'Subtract 7 each time' },
      { id: 'r4', label: 'Add 5 each time (+5)', value: 'Add 5 each time' },
    ],
    correctAnswer: 'Add 7 each time',
    ruleSummary: 'Add 7 each time (+7)',
    stepDelta: 7,
    hint1: 'Count on your fingers from 14 to 21. How many steps did you jump?',
    hint2: '14 + 7 = 21. Check the next jump: does 21 + 7 = 28?',
    explanation: 'Every mushroom grows by +7: 14 + 7 = 21, 21 + 7 = 28, 28 + 7 = 35, and 35 + 7 = 42.',
    misconceptionTags: ['rule_identification'],
    parentTag: 'Identifying governing rule (+7)',
  },

  // === AREA 2: THE ENCHANTED GARDEN ===
  {
    id: 'eg-flower-1',
    competency: 'repeating_patterns',
    tier: 1,
    kind: 'repeating_pattern',
    interaction: 'slot_drag_tap',
    area: 'enchanted_garden',
    prompt: 'Plant the missing flower token to restore the garden border’s repeating pattern!',
    storyContext: 'The garden’s stone planter repeats in a steady rhythm of shapes and colors.',
    sequence: [
      { kind: 'visual', value: 'amber_star', visual: VISUAL_TOKENS.amber_star },
      { kind: 'visual', value: 'sky_circle', visual: VISUAL_TOKENS.sky_circle },
      { kind: 'visual', value: 'rose_triangle', visual: VISUAL_TOKENS.rose_triangle },
      { kind: 'visual', value: 'amber_star', visual: VISUAL_TOKENS.amber_star },
      { kind: 'visual', value: 'sky_circle', visual: VISUAL_TOKENS.sky_circle },
      { kind: 'visual', value: '?', isMissing: true },
    ],
    missingIndices: [5],
    options: [
      { id: 'v1', label: 'Amber Star', value: 'amber_star', visual: VISUAL_TOKENS.amber_star },
      { id: 'v2', label: 'Sky Circle', value: 'sky_circle', visual: VISUAL_TOKENS.sky_circle },
      { id: 'v3', label: 'Rose Triangle', value: 'rose_triangle', visual: VISUAL_TOKENS.rose_triangle },
      { id: 'v4', label: 'Emerald Leaf', value: 'emerald_leaf', visual: VISUAL_TOKENS.emerald_leaf },
    ],
    correctAnswer: 'rose_triangle',
    ruleSummary: 'ABC repeating group: Star, Circle, Triangle',
    hint1: 'Say the shapes out loud in groups of three: Star, Circle, Triangle...',
    hint2: 'After Star and Circle comes Triangle. What follows Sky Circle in the second group?',
    explanation: 'This is an ABC repeating pattern: Amber Star, Sky Circle, Rose Triangle. So Rose Triangle finishes the group!',
    misconceptionTags: ['abc_repeating_pattern'],
    parentTag: 'Repeating ABC visual pattern',
  },
  {
    id: 'eg-vine-2',
    competency: 'visual_patterns',
    tier: 2,
    kind: 'visual_sequence',
    interaction: 'slot_drag_tap',
    area: 'enchanted_garden',
    prompt: 'Look at how the magic arrow leaf turns around! Which direction does it point next?',
    storyContext: 'Dewdrops spin the enchanted vine leaf one quarter-turn clockwise each step.',
    sequence: [
      { kind: 'visual', value: 'leaf_0', visual: { id: 'leaf_0', shape: 'triangle', color: 'emerald', rotation: 0, label: 'Point Up (↑)' } },
      { kind: 'visual', value: 'leaf_90', visual: { id: 'leaf_90', shape: 'triangle', color: 'emerald', rotation: 90, label: 'Point Right (→)' } },
      { kind: 'visual', value: 'leaf_180', visual: { id: 'leaf_180', shape: 'triangle', color: 'emerald', rotation: 180, label: 'Point Down (↓)' } },
      { kind: 'visual', value: 'leaf_270', visual: { id: 'leaf_270', shape: 'triangle', color: 'emerald', rotation: 270, label: 'Point Left (←)' } },
      { kind: 'visual', value: 'leaf_0', visual: { id: 'leaf_0', shape: 'triangle', color: 'emerald', rotation: 0, label: 'Point Up (↑)' } },
      { kind: 'visual', value: '?', isMissing: true },
    ],
    missingIndices: [5],
    options: [
      { id: 'o1', label: 'Point Right (→)', value: 'leaf_90', visual: { id: 'leaf_90', shape: 'triangle', color: 'emerald', rotation: 90, label: 'Point Right (→)' } },
      { id: 'o2', label: 'Point Down (↓)', value: 'leaf_180', visual: { id: 'leaf_180', shape: 'triangle', color: 'emerald', rotation: 180, label: 'Point Down (↓)' } },
      { id: 'o3', label: 'Point Left (←)', value: 'leaf_270', visual: { id: 'leaf_270', shape: 'triangle', color: 'emerald', rotation: 270, label: 'Point Left (←)' } },
      { id: 'o4', label: 'Point Up (↑)', value: 'leaf_0', visual: { id: 'leaf_0', shape: 'triangle', color: 'emerald', rotation: 0, label: 'Point Up (↑)' } },
    ],
    correctAnswer: 'leaf_90',
    ruleSummary: 'Turns one quarter-turn clockwise: Up → Right → Down → Left',
    hint1: 'Watch which way the tip points: Up, Right, Down, Left, Up...',
    hint2: 'It spins like the hands on a clock. Right after pointing Up comes pointing Right!',
    explanation: 'The leaf turns clockwise one quarter-turn each step: Up, Right, Down, Left, Up, Right.',
    misconceptionTags: ['orientation_rotation_pattern'],
    parentTag: 'Visual orientation / rotation pattern',
  },
  {
    id: 'eg-lantern-3',
    competency: 'letter_patterns',
    tier: 1,
    kind: 'letter_sequence',
    interaction: 'letter_reorder',
    area: 'enchanted_garden',
    prompt: 'Light the Enchanted Garden’s letter lanterns! Which letter belongs in the dark lantern?',
    storyContext: 'The firefly lanterns skip letters in a neat alphabetical beat.',
    sequence: [
      { kind: 'letter', value: 'A' },
      { kind: 'letter', value: 'C' },
      { kind: 'letter', value: 'E' },
      { kind: 'letter', value: 'G' },
      { kind: 'letter', value: '?', isMissing: true },
    ],
    missingIndices: [4],
    options: [
      { id: 'l1', label: 'H', value: 'H' },
      { id: 'l2', label: 'I', value: 'I' },
      { id: 'l3', label: 'J', value: 'J' },
      { id: 'l4', label: 'K', value: 'K' },
    ],
    correctAnswer: 'I',
    ruleSummary: 'Skip 1 letter each time (+2 in the alphabet)',
    stepDelta: 2,
    hint1: 'Say the alphabet quietly: A, (b), C, (d), E, (f), G...',
    hint2: 'We skip one letter each time! What letter do we skip after G, and which letter do we land on?',
    explanation: 'Skipping 1 letter each time gives A, C, E, G, I (skipping B, D, F, H).',
    misconceptionTags: ['alphabet_skip_one'],
    parentTag: 'Alphabetical skip-letter sequence',
  },
  {
    id: 'eg-size-4',
    competency: 'repeating_patterns',
    tier: 2,
    kind: 'missing_middle',
    interaction: 'slot_drag_tap',
    area: 'enchanted_garden',
    prompt: 'An AAB pattern of garden gems lost one gem in the middle. Place the missing gem!',
    storyContext: 'Notice both the shape and the repeating rhythm of the garden tiles.',
    sequence: [
      { kind: 'visual', value: 'indigo_diamond', visual: VISUAL_TOKENS.indigo_diamond },
      { kind: 'visual', value: 'indigo_diamond', visual: VISUAL_TOKENS.indigo_diamond },
      { kind: 'visual', value: 'amber_petal', visual: VISUAL_TOKENS.amber_petal },
      { kind: 'visual', value: 'indigo_diamond', visual: VISUAL_TOKENS.indigo_diamond },
      { kind: 'visual', value: '?', isMissing: true },
      { kind: 'visual', value: 'amber_petal', visual: VISUAL_TOKENS.amber_petal },
    ],
    missingIndices: [4],
    options: [
      { id: 'v1', label: 'Indigo Diamond', value: 'indigo_diamond', visual: VISUAL_TOKENS.indigo_diamond },
      { id: 'v2', label: 'Golden Petal', value: 'amber_petal', visual: VISUAL_TOKENS.amber_petal },
      { id: 'v3', label: 'Sky Circle', value: 'sky_circle', visual: VISUAL_TOKENS.sky_circle },
      { id: 'v4', label: 'Coral Square', value: 'coral_square', visual: VISUAL_TOKENS.coral_square },
    ],
    correctAnswer: 'indigo_diamond',
    ruleSummary: 'AAB repeating pattern: Diamond, Diamond, Petal',
    hint1: 'Look at the first three gems: Diamond, Diamond, Petal.',
    hint2: 'The second group starts with one Diamond and ends with a Petal. What goes between them?',
    explanation: 'The pattern repeats in sets of three (A-A-B): Diamond, Diamond, Petal. So the missing gem is Indigo Diamond.',
    misconceptionTags: ['aab_repeating_pattern'],
    parentTag: 'Missing middle in AAB repeating pattern',
  },

  // === AREA 3: THE RHYTHM WOODS ===
  {
    id: 'rw-melody-1',
    competency: 'rhythm_patterns',
    tier: 1,
    kind: 'rhythm_sequence',
    interaction: 'rhythm_pads',
    area: 'rhythm_woods',
    prompt: 'Listen to (or watch) the musical flowers! Tap the sound pad that comes next.',
    storyContext: 'Lyra the Songbird plays the woods’ melody: Drum, Chime, Drum, Chime...',
    sequence: [
      { kind: 'rhythm', value: 'drum', rhythm: RHYTHM_TOKENS.drum },
      { kind: 'rhythm', value: 'chime', rhythm: RHYTHM_TOKENS.chime },
      { kind: 'rhythm', value: 'drum', rhythm: RHYTHM_TOKENS.drum },
      { kind: 'rhythm', value: 'chime', rhythm: RHYTHM_TOKENS.chime },
      { kind: 'rhythm', value: 'drum', rhythm: RHYTHM_TOKENS.drum },
      { kind: 'rhythm', value: '?', isMissing: true },
    ],
    missingIndices: [5],
    options: [
      { id: 'p1', label: 'Boom Drum (●)', value: 'drum', rhythm: RHYTHM_TOKENS.drum },
      { id: 'p2', label: 'Crystal Chime (◆)', value: 'chime', rhythm: RHYTHM_TOKENS.chime },
      { id: 'p3', label: 'Forest Bell (▲)', value: 'bell', rhythm: RHYTHM_TOKENS.bell },
      { id: 'p4', label: 'Wood Tap (■)', value: 'wood', rhythm: RHYTHM_TOKENS.wood },
    ],
    correctAnswer: 'chime',
    ruleSummary: 'AB rhythm: Boom Drum (●), Crystal Chime (◆)',
    hint1: 'Tap the Replay Rhythm button and say the sounds aloud: Drum, Chime, Drum, Chime...',
    hint2: 'Every Boom Drum is followed by a Crystal Chime!',
    explanation: 'The rhythm alternates between Boom Drum (●) and Crystal Chime (◆). After Boom Drum comes Crystal Chime!',
    misconceptionTags: ['rhythm_ab_extension'],
    parentTag: 'Repeating AB rhythm pattern',
  },
  {
    id: 'rw-flowers-2',
    competency: 'rhythm_patterns',
    tier: 2,
    kind: 'rhythm_sequence',
    interaction: 'rhythm_pads',
    area: 'rhythm_woods',
    prompt: 'The Singing Echo Log plays an ABB beat! Choose the sound pad that fills the silent beat.',
    storyContext: 'You can follow the shapes (▲ ■ ■) even with sound muted.',
    sequence: [
      { kind: 'rhythm', value: 'bell', rhythm: RHYTHM_TOKENS.bell },
      { kind: 'rhythm', value: 'wood', rhythm: RHYTHM_TOKENS.wood },
      { kind: 'rhythm', value: 'wood', rhythm: RHYTHM_TOKENS.wood },
      { kind: 'rhythm', value: 'bell', rhythm: RHYTHM_TOKENS.bell },
      { kind: 'rhythm', value: '?', isMissing: true },
      { kind: 'rhythm', value: 'wood', rhythm: RHYTHM_TOKENS.wood },
    ],
    missingIndices: [4],
    options: [
      { id: 'p1', label: 'Forest Bell (▲)', value: 'bell', rhythm: RHYTHM_TOKENS.bell },
      { id: 'p2', label: 'Wood Tap (■)', value: 'wood', rhythm: RHYTHM_TOKENS.wood },
      { id: 'p3', label: 'Boom Drum (●)', value: 'drum', rhythm: RHYTHM_TOKENS.drum },
      { id: 'p4', label: 'Fairy Sparkle (★)', value: 'sparkle', rhythm: RHYTHM_TOKENS.sparkle },
    ],
    correctAnswer: 'wood',
    ruleSummary: 'ABB rhythm: Bell (▲), Wood (■), Wood (■)',
    hint1: 'Look at the first three beats: one Bell followed by two Wood Taps.',
    hint2: 'In the second measure, we hear Bell (▲), then a silent beat, then Wood (■).',
    explanation: 'Each group has 1 Bell followed by 2 Wood Taps (▲ ■ ■). The missing middle beat is Wood Tap (■)!',
    misconceptionTags: ['rhythm_abb_middle'],
    parentTag: 'Missing middle beat in ABB rhythm',
  },
  {
    id: 'rw-chorus-3',
    competency: 'rhythm_patterns',
    tier: 2,
    kind: 'two_missing_terms',
    interaction: 'rhythm_pads',
    area: 'rhythm_woods',
    prompt: 'Finish the last two beats of the Firefly Chorus!',
    storyContext: 'Listen to the 3-beat chorus: Drum (●), Bell (▲), Sparkle (★).',
    sequence: [
      { kind: 'rhythm', value: 'drum', rhythm: RHYTHM_TOKENS.drum },
      { kind: 'rhythm', value: 'bell', rhythm: RHYTHM_TOKENS.bell },
      { kind: 'rhythm', value: 'sparkle', rhythm: RHYTHM_TOKENS.sparkle },
      { kind: 'rhythm', value: 'drum', rhythm: RHYTHM_TOKENS.drum },
      { kind: 'rhythm', value: '?', isMissing: true },
      { kind: 'rhythm', value: '?', isMissing: true },
    ],
    missingIndices: [4, 5],
    options: [
      { id: 'p1', label: 'Boom Drum (●)', value: 'drum', rhythm: RHYTHM_TOKENS.drum },
      { id: 'p2', label: 'Forest Bell (▲)', value: 'bell', rhythm: RHYTHM_TOKENS.bell },
      { id: 'p3', label: 'Fairy Sparkle (★)', value: 'sparkle', rhythm: RHYTHM_TOKENS.sparkle },
      { id: 'p4', label: 'Crystal Chime (◆)', value: 'chime', rhythm: RHYTHM_TOKENS.chime },
    ],
    correctAnswer: ['bell', 'sparkle'],
    ruleSummary: 'ABC rhythm: Drum (●), Bell (▲), Sparkle (★)',
    hint1: 'The chorus repeats 3 beats in order: Drum, Bell, Sparkle.',
    hint2: 'We already have Drum for beat 4. Which two beats come right after Drum?',
    explanation: 'The ABC chorus is Drum (●), Bell (▲), Sparkle (★). So beats 5 and 6 are Forest Bell (▲) and Fairy Sparkle (★)!',
    misconceptionTags: ['rhythm_abc_two_missing'],
    parentTag: 'Extending ABC rhythm by two beats',
  },

  // === AREA 4: THE CASTLE OF SEQUENCES ===
  {
    id: 'cs-build-inc-1',
    competency: 'number_patterns',
    creationSkill: 'create_increasing',
    tier: 2,
    kind: 'create_increasing',
    interaction: 'pattern_builder',
    area: 'castle_sequences',
    prompt: 'Build a 5-step Rising Castle Staircase starting at 7!',
    storyContext: 'Sir Cedric asks you to invent your own increasing rule (+3, +4, +5, or +10) and build every step.',
    sequence: [
      { kind: 'number', value: 7 },
      { kind: 'number', value: '?', isMissing: true },
      { kind: 'number', value: '?', isMissing: true },
      { kind: 'number', value: '?', isMissing: true },
      { kind: 'number', value: '?', isMissing: true },
    ],
    creationSpec: {
      direction: 'increasing',
      startValue: 7,
      length: 5,
      allowedSteps: [3, 4, 5, 10],
    },
    correctAnswer: 'created_increasing',
    ruleSummary: 'Start at 7 and add the same chosen number each step',
    hint1: 'First pick a rule card like +4 or +5. Then add that same number to each step!',
    hint2: 'For example, if you choose +4: 7 + 4 = 11, then 11 + 4 = 15, and keep adding 4.',
    explanation: 'An increasing pattern starts at 7 and adds the exact same chosen amount at every step.',
    misconceptionTags: ['create_increasing_pattern'],
    parentTag: 'Creating an increasing pattern from scratch',
  },
  {
    id: 'cs-build-dec-2',
    competency: 'number_patterns',
    creationSkill: 'create_decreasing',
    tier: 2,
    kind: 'create_decreasing',
    interaction: 'pattern_builder',
    area: 'castle_sequences',
    prompt: 'Construct a 5-stone Decreasing Castle Bridge starting at 50!',
    storyContext: 'Lower the magic drawbridge step-by-step using a steady subtracting rule (-2, -4, -5, or -10).',
    sequence: [
      { kind: 'number', value: 50 },
      { kind: 'number', value: '?', isMissing: true },
      { kind: 'number', value: '?', isMissing: true },
      { kind: 'number', value: '?', isMissing: true },
      { kind: 'number', value: '?', isMissing: true },
    ],
    creationSpec: {
      direction: 'decreasing',
      startValue: 50,
      length: 5,
      allowedSteps: [2, 4, 5, 10],
    },
    correctAnswer: 'created_decreasing',
    ruleSummary: 'Start at 50 and subtract the same chosen number each step',
    hint1: 'Pick a subtracting rule like -5 or -10. Remember: decreasing means the numbers go down!',
    hint2: 'If you pick -5: 50 - 5 = 45, then 45 - 5 = 40, then 35, then 30.',
    explanation: 'A decreasing pattern starts at 50 and subtracts the exact same chosen amount at every step.',
    misconceptionTags: ['create_decreasing_pattern'],
    parentTag: 'Creating a decreasing pattern from scratch',
  },
  {
    id: 'cs-error-3',
    competency: 'missing_terms',
    tier: 2,
    kind: 'error_detection',
    interaction: 'error_repair',
    area: 'castle_sequences',
    prompt: 'One rune on the Castle Gate is broken! Tap the wrong number and repair it.',
    storyContext: 'Sequence on the gate: 12, 18, 24, 29, 36.',
    sequence: [
      { kind: 'number', value: 12 },
      { kind: 'number', value: 18 },
      { kind: 'number', value: 24 },
      { kind: 'number', value: 29, isError: true },
      { kind: 'number', value: 36 },
    ],
    errorRepairSpec: {
      wrongIndex: 3,
      wrongValue: 29,
      correctedValue: 30,
    },
    options: [
      { id: 'e1', label: '28', value: 28 },
      { id: 'e2', label: '30', value: 30 },
      { id: 'e3', label: '31', value: 31 },
      { id: 'e4', label: '32', value: 32 },
    ],
    correctAnswer: 30,
    ruleSummary: 'Add 6 each time (+6); 29 should be 30',
    stepDelta: 6,
    hint1: 'Check the jump between 12 and 18 (+6), and between 18 and 24 (+6).',
    hint2: 'If the rule is +6, what is 24 + 6? Check if adding 6 again reaches 36!',
    explanation: 'The rule is +6: 12, 18, 24, 30, 36. The number 29 was off by 1 and repairs to 30!',
    misconceptionTags: ['error_detection', 'constant_addition_error'],
    parentTag: 'Error detection and repair (+6)',
  },
  {
    id: 'cs-reason-4',
    competency: 'number_patterns',
    tier: 2,
    kind: 'reasoning_challenge',
    interaction: 'rule_selector',
    area: 'castle_sequences',
    prompt: 'Look at 64, 56, 48, 40, 32. Which explanation best proves how this pattern works?',
    storyContext: 'The Great Sequence Crystal needs a clear mathematical rule to lock back into place!',
    sequence: [
      { kind: 'number', value: 64 },
      { kind: 'number', value: 56 },
      { kind: 'number', value: 48 },
      { kind: 'number', value: 40 },
      { kind: 'number', value: 32 },
    ],
    options: [
      {
        id: 'exp1',
        label: 'Start at 64 and subtract 8 each time because every jump goes down by 8.',
        value: 'Start at 64 and subtract 8 each time because every jump goes down by 8.',
      },
      {
        id: 'exp2',
        label: 'Start at 64 and add 8 each time.',
        value: 'Start at 64 and add 8 each time.',
      },
      {
        id: 'exp3',
        label: 'Subtract 6 each time because 64 ends in 4.',
        value: 'Subtract 6 each time because 64 ends in 4.',
      },
      {
        id: 'exp4',
        label: 'Every number is half of the number before it.',
        value: 'Every number is half of the number before it.',
      },
    ],
    correctAnswer: 'Start at 64 and subtract 8 each time because every jump goes down by 8.',
    ruleSummary: 'Start at 64 and subtract 8 each time (-8)',
    stepDelta: -8,
    hint1: 'Check if the numbers go up or down, and count the difference between 64 and 56.',
    hint2: '64 - 8 = 56, 56 - 8 = 48, 48 - 8 = 40, 40 - 8 = 32.',
    explanation: 'Every neighbor drops by 8 (64 - 8 = 56, down to 32), so the rule is "Start at 64 and subtract 8 each time."',
    misconceptionTags: ['reasoning_explanation'],
    parentTag: 'Explaining governing pattern rule (-8)',
  },

  // === TIER 3 & TIER 4: CHAMPION'S TOWER (Optional Competition Challenges) ===
  {
    id: 'ct-growing-diff-1',
    competency: 'number_patterns',
    tier: 3,
    kind: 'next_term',
    interaction: 'slot_drag_tap',
    area: 'champions_tower',
    isCompetition: true,
    prompt: 'Champion’s Stairway: The jumps themselves are growing! What number comes next?',
    storyContext: 'Notice the jumps: +1, +2, +3, +4... (Triangular numbers)',
    sequence: [
      { kind: 'number', value: 1 },
      { kind: 'number', value: 3 },
      { kind: 'number', value: 6 },
      { kind: 'number', value: 10 },
      { kind: 'number', value: 15 },
      { kind: 'number', value: '?', isMissing: true },
    ],
    missingIndices: [5],
    options: [
      { id: 'c1', label: '19', value: 19 },
      { id: 'c2', label: '20', value: 20 },
      { id: 'c3', label: '21', value: 21 },
      { id: 'c4', label: '25', value: 25 },
    ],
    correctAnswer: 21,
    ruleSummary: 'Jumps grow by 1 each time: +2, +3, +4, +5, +6',
    hint1: 'Write down the jump between each pair of numbers: 1→3 (+2), 3→6 (+3), 6→10 (+4)...',
    hint2: 'From 10 to 15 we added 5. What should we add next?',
    explanation: 'The jumps increase by 1 each step: +2, +3, +4, +5, so the next jump is +6. 15 + 6 = 21!',
    misconceptionTags: ['second_order_difference'],
    parentTag: 'Competition: Growing-jump triangular sequence',
  },
  {
    id: 'ct-squares-2',
    competency: 'number_patterns',
    tier: 3,
    kind: 'next_term',
    interaction: 'slot_drag_tap',
    area: 'champions_tower',
    isCompetition: true,
    prompt: 'Look at the Tower Lanterns: 2, 5, 10, 17, 26, ?. Find the next lantern number.',
    storyContext: 'Check how much is added at each jump—odd numbers are hiding here!',
    sequence: [
      { kind: 'number', value: 2 },
      { kind: 'number', value: 5 },
      { kind: 'number', value: 10 },
      { kind: 'number', value: 17 },
      { kind: 'number', value: 26 },
      { kind: 'number', value: '?', isMissing: true },
    ],
    missingIndices: [5],
    options: [
      { id: 'c1', label: '35', value: 35 },
      { id: 'c2', label: '36', value: 36 },
      { id: 'c3', label: '37', value: 37 },
      { id: 'c4', label: '39', value: 39 },
    ],
    correctAnswer: 37,
    ruleSummary: 'Add consecutive odd numbers: +3, +5, +7, +9, +11',
    hint1: 'Find the jump from 2 to 5 (+3), then 5 to 10 (+5), then 10 to 17 (+7).',
    hint2: '26 came from 17 + 9. The next odd number to add is 11! What is 26 + 11?',
    explanation: 'Each jump increases by 2 (+3, +5, +7, +9, +11). So 26 + 11 = 37!',
    misconceptionTags: ['growing_odd_differences'],
    parentTag: 'Competition: Odd-number growing jumps',
  },
  {
    id: 'ct-alt-3',
    competency: 'missing_terms',
    tier: 4,
    kind: 'two_missing_terms',
    interaction: 'slot_drag_tap',
    area: 'champions_tower',
    isCompetition: true,
    prompt: 'Two-Track Bridge! Even-numbered stones and odd-numbered stones follow different rules.',
    storyContext: 'Look at positions 1, 3, 5... separately from positions 2, 4, 6...',
    sequence: [
      { kind: 'number', value: 5 },
      { kind: 'number', value: 40 },
      { kind: 'number', value: 10 },
      { kind: 'number', value: 35 },
      { kind: 'number', value: 15 },
      { kind: 'number', value: 30 },
      { kind: 'number', value: '?', isMissing: true },
      { kind: 'number', value: '?', isMissing: true },
    ],
    missingIndices: [6, 7],
    options: [
      { id: 'a1', label: '20', value: 20 },
      { id: 'a2', label: '25', value: 25 },
      { id: 'a3', label: '35', value: 35 },
      { id: 'a4', label: '15', value: 15 },
    ],
    correctAnswer: [20, 25],
    ruleSummary: 'Alternating tracks: odd spots +5 (5, 10, 15, 20), even spots -5 (40, 35, 30, 25)',
    hint1: 'Hop over every other stone! Look at 5, 10, 15... and separately look at 40, 35, 30...',
    hint2: 'Track A goes 5, 10, 15, __ (+5). Track B goes 40, 35, 30, __ (-5).',
    explanation: 'Two sequences weave together: 5, 10, 15, 20 (+5) and 40, 35, 30, 25 (-5)!',
    misconceptionTags: ['interleaved_alternating_sequence'],
    parentTag: 'Competition: Interleaved dual-track sequence',
  },
  {
    id: 'ct-constraint-4',
    competency: 'number_patterns',
    creationSkill: 'create_increasing',
    tier: 4,
    kind: 'create_increasing',
    interaction: 'pattern_builder',
    area: 'champions_tower',
    isCompetition: true,
    prompt: 'Champion’s Constraint Challenge: Start at 6 and build a 5-term increasing pattern that lands on 30!',
    storyContext: 'You must pick the exact step rule so your 5th stone equals 30.',
    sequence: [
      { kind: 'number', value: 6 },
      { kind: 'number', value: '?', isMissing: true },
      { kind: 'number', value: '?', isMissing: true },
      { kind: 'number', value: '?', isMissing: true },
      { kind: 'number', value: 30, isMissing: true },
    ],
    creationSpec: {
      direction: 'increasing',
      startValue: 6,
      length: 5,
      allowedSteps: [4, 5, 6, 8],
      requireTargetAtEnd: 30,
    },
    correctAnswer: 'created_increasing_30',
    ruleSummary: '4 equal jumps from 6 to 30 means +6 each step (6, 12, 18, 24, 30)',
    hint1: 'To go from stone 1 (6) to stone 5 (30), you take 4 equal jumps. Total climb is 30 - 6 = 24.',
    hint2: 'Test adding +6 four times: 6 → 12 → 18 → 24 → 30!',
    explanation: 'Four jumps of +6 climbs 24 total: 6, 12, 18, 24, 30.',
    misconceptionTags: ['constrained_pattern_creation'],
    parentTag: 'Competition: Constrained pattern creation (target end)',
  },
  {
    id: 'ct-error-5',
    competency: 'missing_terms',
    tier: 4,
    kind: 'error_detection',
    interaction: 'error_repair',
    area: 'champions_tower',
    isCompetition: true,
    prompt: 'Tower Clockwork Glitch: One number breaks the growing-jump rule! Tap and fix it.',
    storyContext: 'Sequence: 3, 5, 8, 12, 18, 23.',
    sequence: [
      { kind: 'number', value: 3 },
      { kind: 'number', value: 5 },
      { kind: 'number', value: 8 },
      { kind: 'number', value: 12 },
      { kind: 'number', value: 18, isError: true },
      { kind: 'number', value: 23 },
    ],
    errorRepairSpec: {
      wrongIndex: 4,
      wrongValue: 18,
      correctedValue: 17,
    },
    options: [
      { id: 'ce1', label: '16', value: 16 },
      { id: 'ce2', label: '17', value: 17 },
      { id: 'ce3', label: '19', value: 19 },
      { id: 'ce4', label: '20', value: 20 },
    ],
    correctAnswer: 17,
    ruleSummary: 'Jumps are +2, +3, +4, +5, +6; 12 + 5 = 17 (and 17 + 6 = 23)',
    hint1: 'Find the jumps at the start: 3→5 (+2), 5→8 (+3), 8→12 (+4).',
    hint2: 'The next jump should be +5! What is 12 + 5? Check if adding +6 then gives 23.',
    explanation: 'The jumps grow +2, +3, +4, +5, +6: 3, 5, 8, 12, 17, 23. So 18 should be 17!',
    misconceptionTags: ['competition_error_detection'],
    parentTag: 'Competition: Growing-jump error repair',
  },
];

// === DETERMINISTIC QUESTION GENERATORS ===

export function generateArithmeticQuestion(
  tier: DifficultyTier,
  seed: number,
  mode: 'next_term' | 'two_missing_terms' | 'missing_middle' | 'find_rule' = 'next_term'
): Question {
  const rng = createSeededRng(seed);
  const steps = tier === 1 ? [2, 3, 5, 10] : [3, 4, 6, 7, 8, 9, 10, 12];
  const stepAbs = steps[Math.floor(rng() * steps.length)];
  const isDecreasing = rng() > 0.45;
  const stepDelta = isDecreasing ? -stepAbs : stepAbs;

  const length = mode === 'two_missing_terms' ? 6 : 5;
  const minStart = isDecreasing ? stepAbs * (length + 1) + Math.floor(rng() * 15) : 2 + Math.floor(rng() * 20);
  const fullValues = Array.from({ length }, (_, idx) => minStart + idx * stepDelta);

  // Guard: verify unambiguous arithmetic progression
  const checkSlice =
    mode === 'two_missing_terms'
      ? fullValues.slice(0, 4)
      : mode === 'missing_middle'
        ? [fullValues[0], fullValues[1], fullValues[2], fullValues[3]]
        : fullValues.slice(0, 4);

  if (!isArithmeticSequenceUnambiguous(checkSlice, stepDelta)) {
    // Fallback safe deterministic sequence
    return CURATED_QUESTIONS[0];
  }

  const ruleText = stepDelta > 0 ? `Add ${stepAbs} each time` : `Subtract ${stepAbs} each time`;
  const id = `gen-arith-${tier}-${mode}-${seed}`;

  if (mode === 'find_rule') {
    const distractors = shuffleWithRng(
      [
        `Add ${stepAbs + 1} each time`,
        `Subtract ${stepAbs} each time`,
        `Add ${stepAbs} each time`,
        `Add ${Math.max(1, stepAbs - 1)} each time`,
        `Subtract ${Math.max(1, stepAbs - 2)} each time`,
      ].filter((x) => x !== ruleText),
      rng
    ).slice(0, 3);

    return {
      id,
      competency: 'number_patterns',
      tier,
      kind: 'find_rule',
      interaction: 'rule_selector',
      prompt: `What rule creates this sequence: ${fullValues.join(', ')}?`,
      sequence: fullValues.map((v) => ({ kind: 'number', value: v })),
      options: shuffleWithRng([ruleText, ...distractors], rng).map((label, idx) => ({
        id: `opt-${idx}`,
        label,
        value: label,
      })),
      correctAnswer: ruleText,
      ruleSummary: `${ruleText} (${stepDelta > 0 ? `+${stepAbs}` : `-${stepAbs}`})`,
      stepDelta,
      hint1: 'Check whether the numbers go up or down from left to right.',
      hint2: `Find the difference between ${fullValues[0]} and ${fullValues[1]}. Does the same jump happen next?`,
      explanation: `Every step changes by ${stepDelta > 0 ? `+${stepAbs}` : `-${stepAbs}`}: ${fullValues.join(', ')}.`,
      misconceptionTags: ['rule_identification'],
      parentTag: `Generated rule identification (${stepDelta > 0 ? `+${stepAbs}` : `-${stepAbs}`})`,
    };
  }

  if (mode === 'two_missing_terms') {
    const seq: SequenceItem[] = fullValues.map((v, i) =>
      i >= 4 ? { kind: 'number', value: '?', isMissing: true } : { kind: 'number', value: v }
    );
    const ans1 = fullValues[4];
    const ans2 = fullValues[5];
    const opts = shuffleWithRng(
      Array.from(new Set([ans1, ans2, ans1 + stepAbs, ans2 - stepAbs, ans1 + 1, ans2 + 2])).filter((n) => n >= 0),
      rng
    ).slice(0, 5);
    if (!opts.includes(ans1)) opts[0] = ans1;
    if (!opts.includes(ans2)) opts[1] = ans2;

    return {
      id,
      competency: 'missing_terms',
      tier,
      kind: 'two_missing_terms',
      interaction: 'slot_drag_tap',
      prompt: 'Find the next two missing numbers in this sequence!',
      sequence: seq,
      missingIndices: [4, 5],
      options: shuffleWithRng(opts, rng).map((v) => ({ id: `opt-${v}`, label: String(v), value: v })),
      correctAnswer: [ans1, ans2],
      ruleSummary: `${ruleText} (${stepDelta > 0 ? `+${stepAbs}` : `-${stepAbs}`})`,
      stepDelta,
      hint1: `Look at how ${fullValues[0]} changes to ${fullValues[1]}, and ${fullValues[1]} to ${fullValues[2]}.`,
      hint2: `The rule is ${ruleText.toLowerCase()}. Start from ${fullValues[3]} and apply it twice!`,
      explanation: `${ruleText}: ${fullValues[3]} ${stepDelta > 0 ? `+ ${stepAbs}` : `- ${stepAbs}`} = ${ans1}, then ${ans2}.`,
      misconceptionTags: ['two_missing_terms'],
      parentTag: `Generated two missing terms (${stepDelta > 0 ? `+${stepAbs}` : `-${stepAbs}`})`,
    };
  }

  if (mode === 'missing_middle') {
    const missIdx = 1 + Math.floor(rng() * 3); // index 1, 2, or 3
    const seq: SequenceItem[] = fullValues.map((v, i) =>
      i === missIdx ? { kind: 'number', value: '?', isMissing: true } : { kind: 'number', value: v }
    );
    const ans = fullValues[missIdx];
    return {
      id,
      competency: 'missing_terms',
      tier,
      kind: 'missing_middle',
      interaction: 'slot_drag_tap',
      prompt: 'A stone fell out of the middle of this sequence. Place the missing number!',
      sequence: seq,
      missingIndices: [missIdx],
      options: makeNumberOptions(ans, stepAbs, rng),
      correctAnswer: ans,
      ruleSummary: `${ruleText} (${stepDelta > 0 ? `+${stepAbs}` : `-${stepAbs}`})`,
      stepDelta,
      hint1: 'Look at two numbers sitting right next to each other to discover the jump.',
      hint2: `The rule is ${ruleText.toLowerCase()}. Apply it from ${fullValues[missIdx - 1]} to fill the gap!`,
      explanation: `The sequence changes by ${stepDelta > 0 ? `+${stepAbs}` : `-${stepAbs}`} each step, so the missing stone is ${ans}.`,
      misconceptionTags: ['missing_middle_term'],
      parentTag: `Generated missing middle term (${stepDelta > 0 ? `+${stepAbs}` : `-${stepAbs}`})`,
    };
  }

  // Default: next_term
  const ans = fullValues[4];
  return {
    id,
    competency: 'number_patterns',
    tier,
    kind: 'next_term',
    interaction: 'slot_drag_tap',
    prompt: 'What number completes the end of this sequence?',
    sequence: fullValues.map((v, i) =>
      i === 4 ? { kind: 'number', value: '?', isMissing: true } : { kind: 'number', value: v }
    ),
    missingIndices: [4],
    options: makeNumberOptions(ans, stepAbs, rng),
    correctAnswer: ans,
    ruleSummary: `${ruleText} (${stepDelta > 0 ? `+${stepAbs}` : `-${stepAbs}`})`,
    stepDelta,
    hint1: 'Compare neighboring numbers. Are they getting bigger or smaller?',
    hint2: `From ${fullValues[0]} to ${fullValues[1]} we ${stepDelta > 0 ? `add ${stepAbs}` : `subtract ${stepAbs}`}. Apply that to ${fullValues[3]}!`,
    explanation: `${ruleText}: ${fullValues[3]} ${stepDelta > 0 ? `+ ${stepAbs}` : `- ${stepAbs}`} = ${ans}.`,
    misconceptionTags: [isDecreasing ? 'decreasing_sequence' : 'constant_addition_error'],
    parentTag: `Generated number sequence (${stepDelta > 0 ? `+${stepAbs}` : `-${stepAbs}`})`,
  };
}

export function generateAlphabetQuestion(tier: DifficultyTier, seed: number): Question {
  const rng = createSeededRng(seed);
  const step = tier === 1 ? (rng() > 0.5 ? 1 : 2) : rng() > 0.5 ? 2 : 3;
  const reverse = tier >= 2 && rng() > 0.65;
  const signedStep = reverse ? -step : step;
  const length = 5;

  const minCode = reverse ? 65 + step * (length - 1) + Math.floor(rng() * (26 - step * length)) : 65 + Math.floor(rng() * (26 - step * length));
  const letters = Array.from({ length }, (_, idx) => String.fromCharCode(minCode + idx * signedStep));

  if (!isAlphabetSequenceUnambiguous(letters, signedStep)) {
    return CURATED_QUESTIONS.find((q) => q.competency === 'letter_patterns')!;
  }

  const missingMiddle = tier >= 2 && rng() > 0.5;
  const missIdx = missingMiddle ? 2 : 4;
  const ans = letters[missIdx];
  const ansCode = ans.charCodeAt(0);

  const distractorCodes = new Set<number>([ansCode]);
  for (const offset of [-1, 1, -2, 2, 3, -3]) {
    if (distractorCodes.size >= 4) break;
    const c = ansCode + offset;
    if (c >= 65 && c <= 90 && c !== ansCode) distractorCodes.add(c);
  }

  return {
    id: `gen-alpha-${tier}-${seed}`,
    competency: 'letter_patterns',
    tier,
    kind: 'letter_sequence',
    interaction: 'letter_reorder',
    prompt: missingMiddle
      ? 'A letter lantern went dark in the middle! Which letter restores the pattern?'
      : 'Which letter lantern comes next in this alphabetical sequence?',
    sequence: letters.map((ch, i) =>
      i === missIdx ? { kind: 'letter', value: '?', isMissing: true } : { kind: 'letter', value: ch }
    ),
    missingIndices: [missIdx],
    options: shuffleWithRng(Array.from(distractorCodes), rng).map((c) => {
      const ch = String.fromCharCode(c);
      return { id: `let-${ch}`, label: ch, value: ch };
    }),
    correctAnswer: ans,
    ruleSummary: reverse
      ? `Move backward ${step} letter${step > 1 ? 's' : ''} each step`
      : `Move forward ${step} letter${step > 1 ? 's' : ''} each step`,
    stepDelta: signedStep,
    hint1: 'Recite the alphabet softly and notice how many letters are skipped between neighbors.',
    hint2: `Between ${letters[0]} and ${letters[1]} we move ${step} step${step > 1 ? 's' : ''} ${reverse ? 'backward' : 'forward'}.`,
    explanation: `Moving ${step} step${step > 1 ? 's' : ''} ${reverse ? 'backward' : 'forward'} through the alphabet gives ${letters.join(', ')}.`,
    misconceptionTags: ['alphabet_skip_pattern'],
    parentTag: `Generated letter pattern (${reverse ? `-${step}` : `+${step}`})`,
  };
}

export function generateRepeatingPatternQuestion(tier: DifficultyTier, seed: number): Question {
  const rng = createSeededRng(seed);
  const allTokens = shuffleWithRng(Object.values(VISUAL_TOKENS), rng);
  const [A, B, C] = allTokens;

  const patternTemplates: Array<{ name: string; cycle: VisualToken[]; totalLen: number }> =
    tier === 1
      ? [
          { name: 'AB', cycle: [A, B], totalLen: 6 },
          { name: 'ABC', cycle: [A, B, C], totalLen: 6 },
        ]
      : [
          { name: 'AAB', cycle: [A, A, B], totalLen: 6 },
          { name: 'ABB', cycle: [A, B, B], totalLen: 6 },
          { name: 'ABC', cycle: [A, B, C], totalLen: 6 },
        ];

  const chosen = patternTemplates[Math.floor(rng() * patternTemplates.length)];
  const cycleIds = chosen.cycle.map((t) => t.id);

  if (!isRepeatingCycleUnambiguous(cycleIds, chosen.totalLen)) {
    return CURATED_QUESTIONS.find((q) => q.competency === 'repeating_patterns')!;
  }

  const fullTokens = Array.from({ length: chosen.totalLen }, (_, i) => chosen.cycle[i % chosen.cycle.length]);
  const missIdx = tier >= 2 && rng() > 0.4 ? chosen.totalLen - 2 : chosen.totalLen - 1;
  const correctToken = fullTokens[missIdx];
  const optionTokens = shuffleWithRng([A, B, C, allTokens[3]], rng);

  return {
    id: `gen-repeat-${tier}-${seed}`,
    competency: 'repeating_patterns',
    tier,
    kind: 'repeating_pattern',
    interaction: 'slot_drag_tap',
    prompt: 'Place the missing shape tile to keep the repeating pattern going!',
    sequence: fullTokens.map((tok, i) =>
      i === missIdx
        ? { kind: 'visual', value: '?', isMissing: true }
        : { kind: 'visual', value: tok.id, visual: tok }
    ),
    missingIndices: [missIdx],
    options: optionTokens.map((t) => ({ id: t.id, label: t.label, value: t.id, visual: t })),
    correctAnswer: correctToken.id,
    ruleSummary: `${chosen.name} repeating pattern (${chosen.cycle.map((t) => t.label).join(', ')})`,
    hint1: `Group the tiles into repeating chunks of ${chosen.cycle.length}.`,
    hint2: `The repeating chunk is: ${chosen.cycle.map((t) => t.label).join(' → ')}.`,
    explanation: `Repeating ${chosen.cycle.map((t) => t.label).join(', ')} gives ${correctToken.label} in that spot.`,
    misconceptionTags: ['repeating_cycle_recognition'],
    parentTag: `Generated ${chosen.name} repeating pattern`,
  };
}

export function generateVisualAttributeQuestion(tier: DifficultyTier, seed: number): Question {
  const rng = createSeededRng(seed);
  const shapes: VisualShape[] = ['triangle', 'leaf', 'petal'];
  const colors: VisualColor[] = ['emerald', 'sky', 'amber', 'indigo'];
  const shape = shapes[Math.floor(rng() * shapes.length)];
  const color = colors[Math.floor(rng() * colors.length)];

  if (tier >= 2 && rng() > 0.5) {
    // Size cycle: sm -> md -> lg -> sm -> md -> ?
    const sizes: Array<'sm' | 'md' | 'lg'> = ['sm', 'md', 'lg'];
    const sizeLabels = { sm: 'Small', md: 'Medium', lg: 'Large' };
    const seqTokens: VisualToken[] = [0, 1, 2, 0, 1, 2].map((sIdx) => {
      const sz = sizes[sIdx];
      return {
        id: `${shape}_${color}_${sz}`,
        shape,
        color,
        size: sz,
        label: `${sizeLabels[sz]} ${shape}`,
      };
    });
    const missIdx = 5;
    const opts: VisualToken[] = [
      { id: `${shape}_${color}_sm`, shape, color, size: 'sm', label: `Small ${shape}` },
      { id: `${shape}_${color}_md`, shape, color, size: 'md', label: `Medium ${shape}` },
      { id: `${shape}_${color}_lg`, shape, color, size: 'lg', label: `Large ${shape}` },
      { id: `${shape}_rose_lg`, shape: 'square', color: 'rose', size: 'lg', label: 'Large Square' },
    ];
    return {
      id: `gen-vis-size-${tier}-${seed}`,
      competency: 'visual_patterns',
      tier,
      kind: 'visual_sequence',
      interaction: 'slot_drag_tap',
      prompt: 'Watch how the size grows and resets! Which tile belongs in the missing spot?',
      sequence: seqTokens.map((t, i) =>
        i === missIdx ? { kind: 'visual', value: '?', isMissing: true } : { kind: 'visual', value: t.id, visual: t }
      ),
      missingIndices: [missIdx],
      options: shuffleWithRng(opts, rng).map((t) => ({ id: t.id, label: t.label, value: t.id, visual: t })),
      correctAnswer: seqTokens[missIdx].id,
      ruleSummary: 'Repeating size pattern: Small, Medium, Large',
      hint1: 'Look at the size of each piece—not just its shape!',
      hint2: 'It goes Small, Medium, Large, then starts over: Small, Medium, ...',
      explanation: 'The sizes repeat in threes: Small, Medium, Large. So Large comes next!',
      misconceptionTags: ['visual_size_pattern'],
      parentTag: 'Generated visual size pattern',
    };
  }

  // Rotation pattern: 0, 90, 180, 270, 0, ?
  const rots: Array<0 | 90 | 180 | 270> = [0, 90, 180, 270];
  const dirLabel: Record<0 | 90 | 180 | 270, string> = {
    0: 'Point Up (↑)',
    90: 'Point Right (→)',
    180: 'Point Down (↓)',
    270: 'Point Left (←)',
  };
  const seqTokens: VisualToken[] = [0, 1, 2, 3, 0, 1].map((rIdx) => {
    const rot = rots[rIdx];
    return {
      id: `rot_${rot}`,
      shape: 'triangle',
      color,
      rotation: rot,
      label: dirLabel[rot],
    };
  });
  const opts = rots.map((rot) => ({
    id: `rot_${rot}`,
    label: dirLabel[rot],
    value: `rot_${rot}`,
    visual: { id: `rot_${rot}`, shape: 'triangle' as VisualShape, color, rotation: rot, label: dirLabel[rot] },
  }));

  return {
    id: `gen-vis-rot-${tier}-${seed}`,
    competency: 'visual_patterns',
    tier,
    kind: 'visual_sequence',
    interaction: 'slot_drag_tap',
    prompt: 'Follow how the pointer turns one quarter-turn clockwise each step!',
    sequence: seqTokens.map((t, i) =>
      i === 5 ? { kind: 'visual', value: '?', isMissing: true } : { kind: 'visual', value: t.id, visual: t }
    ),
    missingIndices: [5],
    options: shuffleWithRng(opts, rng),
    correctAnswer: 'rot_90',
    ruleSummary: 'Clockwise quarter-turn: Up → Right → Down → Left',
    hint1: 'Trace the arrow direction with your finger: Up, Right, Down, Left...',
    hint2: 'After pointing Up, one clockwise turn points Right!',
    explanation: 'Turning clockwise one quarter-turn after Point Up lands on Point Right (→).',
    misconceptionTags: ['orientation_rotation_pattern'],
    parentTag: 'Generated visual rotation pattern',
  };
}

export function generateRhythmQuestion(tier: DifficultyTier, seed: number): Question {
  const rng = createSeededRng(seed);
  const all = shuffleWithRng(Object.values(RHYTHM_TOKENS), rng);
  const [A, B, C] = all;
  const cycle = tier === 1 ? [A, B] : rng() > 0.5 ? [A, A, B] : [A, B, C];
  const full = Array.from({ length: 6 }, (_, i) => cycle[i % cycle.length]);
  const missIdx = tier >= 2 ? 4 : 5;
  const ans = full[missIdx];
  const opts = shuffleWithRng([A, B, C, all[3]], rng);

  return {
    id: `gen-rhythm-${tier}-${seed}`,
    competency: 'rhythm_patterns',
    tier,
    kind: 'rhythm_sequence',
    interaction: 'rhythm_pads',
    prompt: 'Hear and see the forest rhythm! Tap the sound pad that fits the missing beat.',
    sequence: full.map((tok, i) =>
      i === missIdx ? { kind: 'rhythm', value: '?', isMissing: true } : { kind: 'rhythm', value: tok.id, rhythm: tok }
    ),
    missingIndices: [missIdx],
    options: opts.map((t) => ({ id: t.id, label: `${t.label} (${t.symbol})`, value: t.id, rhythm: t })),
    correctAnswer: ans.id,
    ruleSummary: `Repeating rhythm: ${cycle.map((t) => `${t.label} ${t.symbol}`).join(' · ')}`,
    hint1: 'Tap Replay Rhythm and match both the sound and the symbol shape.',
    hint2: `The beat repeats every ${cycle.length} sounds: ${cycle.map((t) => t.symbol).join(' ')}.`,
    explanation: `Following the repeating rhythm ${cycle.map((t) => t.symbol).join(' ')} puts ${ans.label} (${ans.symbol}) in that beat!`,
    misconceptionTags: ['rhythm_pattern_extension'],
    parentTag: 'Generated rhythm pattern',
  };
}

export function generateCreationQuestion(
  direction: 'increasing' | 'decreasing',
  tier: DifficultyTier,
  seed: number
): Question {
  const rng = createSeededRng(seed);
  const steps = direction === 'increasing' ? [2, 3, 4, 5, 10] : [2, 3, 5, 10];
  const startValue =
    direction === 'increasing'
      ? 3 + Math.floor(rng() * 15)
      : 45 + Math.floor(rng() * 35);

  return {
    id: `gen-create-${direction}-${tier}-${seed}`,
    competency: 'number_patterns',
    creationSkill: direction === 'increasing' ? 'create_increasing' : 'create_decreasing',
    tier,
    kind: direction === 'increasing' ? 'create_increasing' : 'create_decreasing',
    interaction: 'pattern_builder',
    prompt:
      direction === 'increasing'
        ? `Create your own 5-term INCREASING pattern starting at ${startValue}!`
        : `Create your own 5-term DECREASING pattern starting at ${startValue}!`,
    sequence: [
      { kind: 'number', value: startValue },
      { kind: 'number', value: '?', isMissing: true },
      { kind: 'number', value: '?', isMissing: true },
      { kind: 'number', value: '?', isMissing: true },
      { kind: 'number', value: '?', isMissing: true },
    ],
    creationSpec: {
      direction,
      startValue,
      length: 5,
      allowedSteps: steps,
    },
    correctAnswer: `created_${direction}`,
    ruleSummary:
      direction === 'increasing'
        ? `Start at ${startValue} and add the same chosen number each step`
        : `Start at ${startValue} and subtract the same chosen number each step`,
    hint1: `Choose one rule button first, then apply that ${direction === 'increasing' ? 'addition' : 'subtraction'} at every step.`,
    hint2: `Start from ${startValue}. Add/subtract your chosen step to get the second number, then keep using the exact same jump.`,
    explanation: `A valid ${direction} sequence keeps the same constant jump between every pair of neighboring numbers.`,
    misconceptionTags: [`create_${direction}_pattern`],
    parentTag: `Generated ${direction} pattern creation`,
  };
}

export function generateErrorDetectionQuestion(tier: DifficultyTier, seed: number): Question {
  const rng = createSeededRng(seed);
  const stepAbs = tier === 1 ? [2, 5, 10][Math.floor(rng() * 3)] : [3, 4, 6, 7][Math.floor(rng() * 4)];
  const isDec = rng() > 0.5;
  const delta = isDec ? -stepAbs : stepAbs;
  const start = isDec ? stepAbs * 6 + Math.floor(rng() * 12) : 4 + Math.floor(rng() * 15);
  const trueValues = Array.from({ length: 5 }, (_, i) => start + i * delta);
  const wrongIndex = 1 + Math.floor(rng() * 3); // 1, 2, or 3
  const offset = rng() > 0.5 ? 1 : -1;
  const wrongValue = trueValues[wrongIndex] + offset;
  const correctedValue = trueValues[wrongIndex];

  return {
    id: `gen-err-${tier}-${seed}`,
    competency: 'missing_terms',
    tier,
    kind: 'error_detection',
    interaction: 'error_repair',
    prompt: 'One number in this sequence does not belong! Tap the wrong number and fix it.',
    sequence: trueValues.map((v, i) =>
      i === wrongIndex ? { kind: 'number', value: wrongValue, isError: true } : { kind: 'number', value: v }
    ),
    errorRepairSpec: {
      wrongIndex,
      wrongValue,
      correctedValue,
    },
    options: makeNumberOptions(correctedValue, stepAbs, rng),
    correctAnswer: correctedValue,
    ruleSummary: `${delta > 0 ? `Add ${stepAbs}` : `Subtract ${stepAbs}`} each time; ${wrongValue} should be ${correctedValue}`,
    stepDelta: delta,
    hint1: 'Check the jump between every neighbor pair to find which single number breaks the steady jump.',
    hint2: `Most jumps are ${delta > 0 ? `+${stepAbs}` : `-${stepAbs}`}. Apply that rule from ${trueValues[wrongIndex - 1]}!`,
    explanation: `The true rule is ${delta > 0 ? `+${stepAbs}` : `-${stepAbs}`}. ${trueValues[wrongIndex - 1]} ${delta > 0 ? `+ ${stepAbs}` : `- ${stepAbs}`} = ${correctedValue}, not ${wrongValue}.`,
    misconceptionTags: ['error_detection'],
    parentTag: `Generated error detection (${delta > 0 ? `+${stepAbs}` : `-${stepAbs}`})`,
  };
}

/**
 * Generates an adaptive practice question for a given competency & tier.
 */
export function generatePracticeQuestion(
  competency: CompetencyId,
  tier: DifficultyTier,
  seed: number,
  customQuestions: Question[] = []
): Question {
  const matchingCustom = customQuestions.filter(
    (q) => q.competency === competency && !q.isCompetition
  );
  if (matchingCustom.length > 0 && seed % 4 === 0) {
    return matchingCustom[seed % matchingCustom.length];
  }

  if (tier >= 3) {
    const compMatches = CURATED_QUESTIONS.filter(
      (q) => q.isCompetition && q.competency === competency
    );
    if (compMatches.length > 0) {
      return compMatches[seed % compMatches.length];
    }
  }

  switch (competency) {
    case 'number_patterns': {
      const mod = seed % 5;
      if (mod === 0) return generateArithmeticQuestion(tier, seed, 'next_term');
      if (mod === 1) return generateArithmeticQuestion(tier, seed, 'find_rule');
      if (mod === 2) return generateCreationQuestion('increasing', tier, seed);
      if (mod === 3) return generateCreationQuestion('decreasing', tier, seed);
      return generateArithmeticQuestion(tier, seed, 'next_term');
    }
    case 'missing_terms': {
      const mod = seed % 3;
      if (mod === 0) return generateArithmeticQuestion(tier, seed, 'missing_middle');
      if (mod === 1) return generateArithmeticQuestion(tier, seed, 'two_missing_terms');
      return generateErrorDetectionQuestion(tier, seed);
    }
    case 'letter_patterns':
      return generateAlphabetQuestion(tier, seed);
    case 'repeating_patterns':
      return generateRepeatingPatternQuestion(tier, seed);
    case 'visual_patterns':
      return generateVisualAttributeQuestion(tier, seed);
    case 'rhythm_patterns':
      return generateRhythmQuestion(tier, seed);
  }
}

/**
 * 6-question Diagnostic covering all 6 primary Grade 2 competencies.
 */
export function generateDiagnosticSet(seed = Date.now()): Question[] {
  return [
    generateArithmeticQuestion(1, seed + 1, 'next_term'),
    generateArithmeticQuestion(2, seed + 2, 'missing_middle'),
    generateAlphabetQuestion(1, seed + 3),
    generateRepeatingPatternQuestion(1, seed + 4),
    generateVisualAttributeQuestion(1, seed + 5),
    generateRhythmQuestion(1, seed + 6),
  ];
}

/**
 * Configurable 20-question Grade 2 Mock Summative Assessment covering all 6 competencies,
 * error detection, reasoning, and BOTH increasing & decreasing pattern creation.
 */
export function generateMockAssessmentSet(
  seed = Date.now(),
  questionCount = 20,
  customQuestions: Question[] = []
): Question[] {
  const basePlan: Question[] = [
    // Number patterns (4)
    generateArithmeticQuestion(1, seed + 101, 'next_term'),
    generateArithmeticQuestion(2, seed + 102, 'next_term'),
    generateArithmeticQuestion(2, seed + 103, 'find_rule'),
    CURATED_QUESTIONS.find((q) => q.id === 'cs-reason-4')!,
    // Missing terms & error repair (4)
    generateArithmeticQuestion(1, seed + 104, 'missing_middle'),
    generateArithmeticQuestion(2, seed + 105, 'missing_middle'),
    generateArithmeticQuestion(2, seed + 106, 'two_missing_terms'),
    generateErrorDetectionQuestion(2, seed + 107),
    // Letter patterns (3)
    generateAlphabetQuestion(1, seed + 108),
    generateAlphabetQuestion(2, seed + 109),
    generateAlphabetQuestion(2, seed + 110),
    // Repeating patterns (3)
    generateRepeatingPatternQuestion(1, seed + 111),
    generateRepeatingPatternQuestion(2, seed + 112),
    generateRepeatingPatternQuestion(2, seed + 113),
    // Visual patterns (2)
    generateVisualAttributeQuestion(1, seed + 114),
    generateVisualAttributeQuestion(2, seed + 115),
    // Rhythm patterns (2)
    generateRhythmQuestion(1, seed + 116),
    generateRhythmQuestion(2, seed + 117),
    // Pattern creation: Increasing AND Decreasing (2)
    generateCreationQuestion('increasing', 2, seed + 118),
    generateCreationQuestion('decreasing', 2, seed + 119),
  ];

  // Include any parent-added custom Grade 2 questions near the end if present
  const nonCompCustom = customQuestions.filter((q) => !q.isCompetition);
  if (nonCompCustom.length > 0) {
    basePlan[1] = nonCompCustom[0];
    if (nonCompCustom.length > 1) {
      basePlan[5] = nonCompCustom[1];
    }
  }

  return basePlan.slice(0, Math.max(6, Math.min(questionCount, basePlan.length)));
}

function hashQuestSeed(questSeed: number, salt: number): number {
  const mixed = (Math.imul(questSeed | 0, 2654435761) ^ Math.imul(salt | 0, 1597334677)) >>> 0;
  return mixed === 0 ? 1 : mixed;
}

/**
 * Returns either the curated landmark puzzle (questSeed === 0) or a fresh,
 * deterministic, mathematically valid variant preserving the landmark's
 * story setting, competency, interaction type, and difficulty tier.
 */
export function getHotspotQuestion(questionId: string, questSeed = 0): Question {
  const curated = CURATED_QUESTIONS.find((q) => q.id === questionId) ?? CURATED_QUESTIONS[0];
  if (!questSeed || questSeed <= 0) {
    return curated;
  }

  const slotIndex = Math.max(0, CURATED_QUESTIONS.findIndex((q) => q.id === questionId));
  const derivedSeed = hashQuestSeed(questSeed, slotIndex + 17);
  const rng = createSeededRng(derivedSeed);

  switch (questionId) {
    case 'cg-bridge-1': {
      const steps = [2, 3, 4, 5, 6, 10];
      const step = steps[Math.floor(rng() * steps.length)];
      let start = 2 + Math.floor(rng() * 19);
      if (start === 4 && step === 4) start = 6;
      const values = Array.from({ length: 5 }, (_, i) => start + i * step);
      const ans = values[4];
      return {
        ...curated,
        prompt: curated.prompt,
        storyContext: curated.storyContext,
        sequence: values.map((v, i) =>
          i === 4 ? { kind: 'number', value: '?', isMissing: true } : { kind: 'number', value: v }
        ),
        missingIndices: [4],
        options: makeNumberOptions(ans, step, rng),
        correctAnswer: ans,
        ruleSummary: `Add ${step} each time (+${step})`,
        stepDelta: step,
        hint1: 'Look at how much each stone number grows from one stone to the next.',
        hint2: `From ${values[0]} to ${values[1]}, we add ${step}. From ${values[1]} to ${values[2]}, we add ${step} again. What is ${values[3]} + ${step}?`,
        explanation: `Every stone is ${step} more than the stone before it: ${values.join(', ')}. So ${values[3]} + ${step} = ${ans}!`,
      };
    }

    case 'cg-stairs-2': {
      const steps = [2, 3, 4, 5, 6, 10];
      const step = steps[Math.floor(rng() * steps.length)];
      let start = 4 + Math.floor(rng() * 20);
      if (start === 10 && step === 5) start = 12;
      const values = Array.from({ length: 5 }, (_, i) => start + i * step);
      const missIdx = 1 + Math.floor(rng() * 3);
      const ans = values[missIdx];
      return {
        ...curated,
        sequence: values.map((v, i) =>
          i === missIdx ? { kind: 'number', value: '?', isMissing: true } : { kind: 'number', value: v }
        ),
        missingIndices: [missIdx],
        options: makeNumberOptions(ans, step, rng),
        correctAnswer: ans,
        ruleSummary: `Count forward by ${step}s (+${step})`,
        stepDelta: step,
        hint1: 'Check two neighboring steps that are already filled in to discover the jump.',
        hint2: `Each step goes up by ${step}. Apply +${step} after ${values[missIdx - 1]} to fill the gap!`,
        explanation: `The steps count by +${step}: ${values.join(', ')}. The missing step is ${ans}.`,
      };
    }

    case 'cg-fruit-3': {
      const steps = [3, 4, 5, 6, 7, 8, 10];
      const stepAbs = steps[Math.floor(rng() * steps.length)];
      let start = stepAbs * 6 + 4 + Math.floor(rng() * 18);
      if (start === 45 && stepAbs === 5) start = 48;
      const values = Array.from({ length: 6 }, (_, i) => start - i * stepAbs);
      const ans1 = values[4];
      const ans2 = values[5];
      const rawOpts = Array.from(
        new Set([ans1, ans2, ans1 + stepAbs, Math.max(1, ans2 - stepAbs), ans1 + 1, Math.max(2, ans2 - 2)])
      ).filter((n) => n >= 0);
      const opts = shuffleWithRng(rawOpts, rng).slice(0, 5);
      if (!opts.includes(ans1)) opts[0] = ans1;
      if (!opts.includes(ans2)) opts[1] = ans2;
      return {
        ...curated,
        sequence: values.map((v, i) =>
          i >= 4 ? { kind: 'number', value: '?', isMissing: true } : { kind: 'number', value: v }
        ),
        missingIndices: [4, 5],
        options: shuffleWithRng(opts, rng).map((v) => ({ id: `o-${v}`, label: String(v), value: v })),
        correctAnswer: [ans1, ans2],
        ruleSummary: `Subtract ${stepAbs} each time (-${stepAbs})`,
        stepDelta: -stepAbs,
        hint1: 'Notice whether the numbers are getting bigger or smaller as you move right.',
        hint2: `From ${values[0]} to ${values[1]}, we take away ${stepAbs}. Subtract ${stepAbs} from ${values[3]}, then ${stepAbs} again.`,
        explanation: `Each basket has ${stepAbs} fewer berries: ${values[3]} - ${stepAbs} = ${ans1}, and ${ans1} - ${stepAbs} = ${ans2}.`,
      };
    }

    case 'cg-rule-4': {
      const steps = [3, 4, 5, 6, 7, 8, 9];
      const stepAbs = steps[Math.floor(rng() * steps.length)];
      const isInc = rng() > 0.35;
      const delta = isInc ? stepAbs : -stepAbs;
      let start = isInc ? 4 + Math.floor(rng() * 18) : stepAbs * 5 + 6 + Math.floor(rng() * 15);
      if (start === 14 && delta === 7) start = 11;
      const values = Array.from({ length: 5 }, (_, i) => start + i * delta);
      const correctVal = isInc ? `Add ${stepAbs} each time` : `Subtract ${stepAbs} each time`;
      const correctLabel = `${correctVal} (${isInc ? `+${stepAbs}` : `-${stepAbs}`})`;
      const distractorSpecs = [
        { val: isInc ? `Add ${stepAbs + 1} each time` : `Subtract ${stepAbs + 1} each time`, tag: isInc ? `+${stepAbs + 1}` : `-${stepAbs + 1}` },
        { val: isInc ? `Subtract ${stepAbs} each time` : `Add ${stepAbs} each time`, tag: isInc ? `-${stepAbs}` : `+${stepAbs}` },
        { val: isInc ? `Add ${Math.max(2, stepAbs - 1)} each time` : `Subtract ${Math.max(2, stepAbs - 1)} each time`, tag: isInc ? `+${Math.max(2, stepAbs - 1)}` : `-${Math.max(2, stepAbs - 1)}` },
        { val: isInc ? `Add ${stepAbs + 2} each time` : `Subtract ${stepAbs + 2} each time`, tag: isInc ? `+${stepAbs + 2}` : `-${stepAbs + 2}` },
      ].filter((d) => d.val !== correctVal);
      const options = shuffleWithRng(
        [
          { id: 'r-correct', label: correctLabel, value: correctVal },
          ...distractorSpecs.slice(0, 3).map((d, i) => ({
            id: `r-dist-${i}`,
            label: `${d.val} (${d.tag})`,
            value: d.val,
          })),
        ],
        rng
      );
      return {
        ...curated,
        prompt: `Look at the glowing mushroom trail: ${values.join(', ')}. What rule makes this pattern?`,
        sequence: values.map((v) => ({ kind: 'number', value: v })),
        options,
        correctAnswer: correctVal,
        ruleSummary: correctLabel,
        stepDelta: delta,
        hint1: `Check whether the numbers go up or down from ${values[0]} to ${values[1]}.`,
        hint2: `${values[0]} ${isInc ? `+ ${stepAbs}` : `- ${stepAbs}`} = ${values[1]}. Check if the next jump is the same!`,
        explanation: `Every mushroom changes by ${isInc ? `+${stepAbs}` : `-${stepAbs}`}: ${values.join(', ')}.`,
      };
    }

    case 'eg-flower-1': {
      const gen = generateRepeatingPatternQuestion(1, derivedSeed);
      return {
        ...gen,
        id: curated.id,
        area: 'enchanted_garden',
        prompt: curated.prompt,
        storyContext: curated.storyContext,
      };
    }

    case 'eg-vine-2': {
      const colors: VisualColor[] = ['emerald', 'sky', 'amber', 'indigo'];
      const color = colors[Math.floor(rng() * colors.length)];
      const clockwise = rng() > 0.4;
      const baseRots: Array<0 | 90 | 180 | 270> = clockwise ? [0, 90, 180, 270] : [0, 270, 180, 90];
      const offset = Math.floor(rng() * 4);
      const dirLabel: Record<0 | 90 | 180 | 270, string> = {
        0: 'Point Up (↑)',
        90: 'Point Right (→)',
        180: 'Point Down (↓)',
        270: 'Point Left (←)',
      };
      const seqRots = Array.from({ length: 6 }, (_, i) => baseRots[(i + offset) % 4]);
      const missIdx = rng() > 0.5 ? 5 : 4;
      const ansRot = seqRots[missIdx];
      const makeTok = (rot: 0 | 90 | 180 | 270): VisualToken => ({
        id: `leaf_${rot}`,
        shape: 'triangle',
        color,
        rotation: rot,
        label: dirLabel[rot],
      });
      return {
        ...curated,
        prompt: clockwise
          ? 'Look at how the magic arrow leaf turns clockwise! Which direction does it point in the missing spot?'
          : 'Look at how the magic arrow leaf turns counter-clockwise! Which direction does it point in the missing spot?',
        storyContext: clockwise
          ? 'Dewdrops spin the enchanted vine leaf one quarter-turn clockwise each step.'
          : 'Breezes spin the enchanted vine leaf one quarter-turn counter-clockwise each step.',
        sequence: seqRots.map((r, i) =>
          i === missIdx ? { kind: 'visual', value: '?', isMissing: true } : { kind: 'visual', value: `leaf_${r}`, visual: makeTok(r) }
        ),
        missingIndices: [missIdx],
        options: shuffleWithRng(
          ([0, 90, 180, 270] as Array<0 | 90 | 180 | 270>).map((r) => {
            const tok = makeTok(r);
            return { id: tok.id, label: tok.label, value: tok.id, visual: tok };
          }),
          rng
        ),
        correctAnswer: `leaf_${ansRot}`,
        ruleSummary: `Turns one quarter-turn ${clockwise ? 'clockwise' : 'counter-clockwise'}: ${baseRots.map((r) => dirLabel[r].split(' ')[1]).join(' → ')}`,
        hint1: `Follow which way the arrow points step by step: ${seqRots.slice(0, 4).map((r) => dirLabel[r].split(' ')[1]).join(', ')}...`,
        hint2: `Look just before the missing spot (${dirLabel[seqRots[missIdx - 1]]}) and make one ${clockwise ? 'clockwise' : 'counter-clockwise'} turn!`,
        explanation: `Each quarter-turn ${clockwise ? 'clockwise' : 'counter-clockwise'} lands on ${dirLabel[ansRot]} in that spot.`,
      };
    }

    case 'eg-lantern-3': {
      let gen = generateAlphabetQuestion(1, derivedSeed);
      if (gen.sequence[0]?.value === 'A' && gen.stepDelta === 2) {
        gen = generateAlphabetQuestion(1, derivedSeed + 97);
      }
      return {
        ...gen,
        id: curated.id,
        area: 'enchanted_garden',
        prompt: curated.prompt,
        storyContext: curated.storyContext,
      };
    }

    case 'eg-size-4': {
      const tokens = shuffleWithRng(Object.values(VISUAL_TOKENS), rng);
      const [A, B, C, D] = tokens;
      const isAab = rng() > 0.45;
      const cycle = isAab ? [A, A, B] : [A, B, B];
      const patternName = isAab ? 'AAB' : 'ABB';
      const full = Array.from({ length: 6 }, (_, i) => cycle[i % 3]);
      const missIdx = rng() > 0.5 ? 4 : 3;
      const ans = full[missIdx];
      return {
        ...curated,
        prompt: `An ${patternName} pattern of garden gems lost one gem in the middle. Place the missing gem!`,
        sequence: full.map((tok, i) =>
          i === missIdx ? { kind: 'visual', value: '?', isMissing: true } : { kind: 'visual', value: tok.id, visual: tok }
        ),
        missingIndices: [missIdx],
        options: shuffleWithRng([A, B, C, D], rng).map((t) => ({
          id: t.id,
          label: t.label,
          value: t.id,
          visual: t,
        })),
        correctAnswer: ans.id,
        ruleSummary: `${patternName} repeating pattern: ${cycle.map((t) => t.label).join(', ')}`,
        hint1: `Look at the first three gems: ${cycle.map((t) => t.label).join(', ')}.`,
        hint2: `The pattern repeats in threes (${patternName}). Match the position in the second group!`,
        explanation: `The pattern repeats in sets of three (${patternName}): ${cycle.map((t) => t.label).join(', ')}. So ${ans.label} belongs there!`,
      };
    }

    case 'rw-melody-1': {
      const all = shuffleWithRng(Object.values(RHYTHM_TOKENS), rng);
      const [A, B, C, D] = all;
      const full = [A, B, A, B, A, B];
      const missIdx = rng() > 0.5 ? 5 : 4;
      const ans = full[missIdx];
      return {
        ...curated,
        storyContext: `Lyra the Songbird plays the woods’ melody: ${A.label}, ${B.label}, ${A.label}, ${B.label}...`,
        sequence: full.map((tok, i) =>
          i === missIdx ? { kind: 'rhythm', value: '?', isMissing: true } : { kind: 'rhythm', value: tok.id, rhythm: tok }
        ),
        missingIndices: [missIdx],
        options: shuffleWithRng([A, B, C, D], rng).map((t) => ({
          id: t.id,
          label: `${t.label} (${t.symbol})`,
          value: t.id,
          rhythm: t,
        })),
        correctAnswer: ans.id,
        ruleSummary: `AB rhythm: ${A.label} (${A.symbol}), ${B.label} (${B.symbol})`,
        hint1: `Tap Replay Rhythm and follow the alternating beat: ${A.label}, ${B.label}...`,
        hint2: `The beat switches back and forth between ${A.label} and ${B.label}!`,
        explanation: `The rhythm alternates ${A.symbol} ${B.symbol}, so ${ans.label} (${ans.symbol}) fits that beat!`,
      };
    }

    case 'rw-flowers-2': {
      const all = shuffleWithRng(Object.values(RHYTHM_TOKENS), rng);
      const [A, B, C, D] = all;
      const isAbb = rng() > 0.4;
      const cycle = isAbb ? [A, B, B] : [A, A, B];
      const name = isAbb ? 'ABB' : 'AAB';
      const full = [...cycle, ...cycle];
      const missIdx = rng() > 0.5 ? 4 : 3;
      const ans = full[missIdx];
      return {
        ...curated,
        prompt: `The Singing Echo Log plays an ${name} beat! Choose the sound pad that fills the silent beat.`,
        storyContext: `You can follow the shapes (${cycle.map((t) => t.symbol).join(' ')}) even with sound muted.`,
        sequence: full.map((tok, i) =>
          i === missIdx ? { kind: 'rhythm', value: '?', isMissing: true } : { kind: 'rhythm', value: tok.id, rhythm: tok }
        ),
        missingIndices: [missIdx],
        options: shuffleWithRng([A, B, C, D], rng).map((t) => ({
          id: t.id,
          label: `${t.label} (${t.symbol})`,
          value: t.id,
          rhythm: t,
        })),
        correctAnswer: ans.id,
        ruleSummary: `${name} rhythm: ${cycle.map((t) => `${t.label} (${t.symbol})`).join(', ')}`,
        hint1: `Look at the first three beats: ${cycle.map((t) => t.label).join(', ')}.`,
        hint2: `In the second measure, match the exact position in (${cycle.map((t) => t.symbol).join(' ')}).`,
        explanation: `Each group follows ${cycle.map((t) => t.symbol).join(' ')}, so the missing beat is ${ans.label} (${ans.symbol})!`,
      };
    }

    case 'rw-chorus-3': {
      const all = shuffleWithRng(Object.values(RHYTHM_TOKENS), rng);
      const [A, B, C, D] = all;
      const full = [A, B, C, A, B, C];
      return {
        ...curated,
        storyContext: `Listen to the 3-beat chorus: ${A.label} (${A.symbol}), ${B.label} (${B.symbol}), ${C.label} (${C.symbol}).`,
        sequence: full.map((tok, i) =>
          i >= 4 ? { kind: 'rhythm', value: '?', isMissing: true } : { kind: 'rhythm', value: tok.id, rhythm: tok }
        ),
        missingIndices: [4, 5],
        options: shuffleWithRng([A, B, C, D], rng).map((t) => ({
          id: t.id,
          label: `${t.label} (${t.symbol})`,
          value: t.id,
          rhythm: t,
        })),
        correctAnswer: [B.id, C.id],
        ruleSummary: `ABC rhythm: ${A.label} (${A.symbol}), ${B.label} (${B.symbol}), ${C.label} (${C.symbol})`,
        hint1: `The chorus repeats 3 beats in order: ${A.label}, ${B.label}, ${C.label}.`,
        hint2: `Beat 4 already has ${A.label}. Which two beats follow right after ${A.label}?`,
        explanation: `The ABC chorus repeats ${A.symbol} ${B.symbol} ${C.symbol}, so beats 5 and 6 are ${B.label} (${B.symbol}) and ${C.label} (${C.symbol})!`,
      };
    }

    case 'cs-build-inc-1': {
      const startValue = [4, 5, 6, 8, 9, 11, 12, 14, 15][Math.floor(rng() * 9)];
      return {
        ...curated,
        prompt: `Build a 5-step Rising Castle Staircase starting at ${startValue}!`,
        storyContext: 'Sir Cedric asks you to invent your own increasing rule (+3, +4, +5, or +10) and build every step.',
        sequence: [
          { kind: 'number', value: startValue },
          { kind: 'number', value: '?', isMissing: true },
          { kind: 'number', value: '?', isMissing: true },
          { kind: 'number', value: '?', isMissing: true },
          { kind: 'number', value: '?', isMissing: true },
        ],
        creationSpec: {
          direction: 'increasing',
          startValue,
          length: 5,
          allowedSteps: [3, 4, 5, 10],
        },
        ruleSummary: `Start at ${startValue} and add the same chosen number each step`,
        hint2: `For example, if you choose +4: ${startValue} + 4 = ${startValue + 4}, then ${startValue + 8}, and keep adding 4.`,
        explanation: `An increasing pattern starts at ${startValue} and adds the exact same chosen amount at every step.`,
      };
    }

    case 'cs-build-dec-2': {
      const startValue = [44, 48, 52, 55, 60, 64, 70, 75][Math.floor(rng() * 8)];
      return {
        ...curated,
        prompt: `Construct a 5-stone Decreasing Castle Bridge starting at ${startValue}!`,
        storyContext: 'Lower the magic drawbridge step-by-step using a steady subtracting rule (-2, -4, -5, or -10).',
        sequence: [
          { kind: 'number', value: startValue },
          { kind: 'number', value: '?', isMissing: true },
          { kind: 'number', value: '?', isMissing: true },
          { kind: 'number', value: '?', isMissing: true },
          { kind: 'number', value: '?', isMissing: true },
        ],
        creationSpec: {
          direction: 'decreasing',
          startValue,
          length: 5,
          allowedSteps: [2, 4, 5, 10],
        },
        ruleSummary: `Start at ${startValue} and subtract the same chosen number each step`,
        hint2: `If you pick -5: ${startValue} - 5 = ${startValue - 5}, then ${startValue - 10}, ${startValue - 15}, ${startValue - 20}.`,
        explanation: `A decreasing pattern starts at ${startValue} and subtracts the exact same chosen amount at every step.`,
      };
    }

    case 'cs-error-3': {
      const stepAbs = [3, 4, 5, 6, 7][Math.floor(rng() * 5)];
      const isDec = rng() > 0.5;
      const delta = isDec ? -stepAbs : stepAbs;
      let start = isDec ? stepAbs * 5 + 6 + Math.floor(rng() * 14) : 4 + Math.floor(rng() * 16);
      if (start === 12 && delta === 6) start = 14;
      const trueValues = Array.from({ length: 5 }, (_, i) => start + i * delta);
      const wrongIndex = 1 + Math.floor(rng() * 3);
      const wrongOffset = rng() > 0.5 ? 1 : -1;
      const wrongValue = trueValues[wrongIndex] + wrongOffset;
      const correctedValue = trueValues[wrongIndex];
      const seqDisplay = trueValues.map((v, i) => (i === wrongIndex ? wrongValue : v)).join(', ');
      return {
        ...curated,
        prompt: 'One rune on the Castle Gate is broken! Tap the wrong number and repair it.',
        storyContext: `Sequence on the gate: ${seqDisplay}.`,
        sequence: trueValues.map((v, i) =>
          i === wrongIndex ? { kind: 'number', value: wrongValue, isError: true } : { kind: 'number', value: v }
        ),
        errorRepairSpec: {
          wrongIndex,
          wrongValue,
          correctedValue,
        },
        options: makeNumberOptions(correctedValue, stepAbs, rng).filter((o) => o.value !== wrongValue).slice(0, 4),
        correctAnswer: correctedValue,
        ruleSummary: `${delta > 0 ? `Add ${stepAbs}` : `Subtract ${stepAbs}`} each time (${delta > 0 ? `+${stepAbs}` : `-${stepAbs}`}); ${wrongValue} should be ${correctedValue}`,
        stepDelta: delta,
        hint1: 'Check the jump between every neighbor pair to find which single rune breaks the steady jump.',
        hint2: `Most jumps are ${delta > 0 ? `+${stepAbs}` : `-${stepAbs}`}. Apply that rule from ${trueValues[wrongIndex - 1]}!`,
        explanation: `The rule is ${delta > 0 ? `+${stepAbs}` : `-${stepAbs}`}: ${trueValues.join(', ')}. The number ${wrongValue} repairs to ${correctedValue}!`,
      };
    }

    case 'cs-reason-4': {
      const stepAbs = [4, 6, 7, 8, 9][Math.floor(rng() * 5)];
      const isInc = rng() > 0.55;
      const delta = isInc ? stepAbs : -stepAbs;
      let start = isInc ? 8 + Math.floor(rng() * 20) : stepAbs * 5 + 12 + Math.floor(rng() * 22);
      if (start === 64 && delta === -8) start = 72;
      const values = Array.from({ length: 5 }, (_, i) => start + i * delta);
      const correctLabel = `Start at ${start} and ${isInc ? `add ${stepAbs}` : `subtract ${stepAbs}`} each time because every jump goes ${isInc ? 'up' : 'down'} by ${stepAbs}.`;
      const oppositeLabel = `Start at ${start} and ${isInc ? `subtract ${stepAbs}` : `add ${stepAbs}`} each time.`;
      const wrongStep = Math.max(2, stepAbs - 2);
      const wrongStepLabel = `${isInc ? `Add ${wrongStep}` : `Subtract ${wrongStep}`} each time because ${start} ends in ${start % 10}.`;
      const halfLabel = 'Every number is half of the number before it.';
      return {
        ...curated,
        prompt: `Look at ${values.join(', ')}. Which explanation best proves how this pattern works?`,
        sequence: values.map((v) => ({ kind: 'number', value: v })),
        options: shuffleWithRng(
          [
            { id: 'exp1', label: correctLabel, value: correctLabel },
            { id: 'exp2', label: oppositeLabel, value: oppositeLabel },
            { id: 'exp3', label: wrongStepLabel, value: wrongStepLabel },
            { id: 'exp4', label: halfLabel, value: halfLabel },
          ],
          rng
        ),
        correctAnswer: correctLabel,
        ruleSummary: `Start at ${start} and ${isInc ? `add ${stepAbs}` : `subtract ${stepAbs}`} each time (${delta > 0 ? `+${stepAbs}` : `-${stepAbs}`})`,
        stepDelta: delta,
        hint1: `Check if the numbers go up or down, and count the difference between ${values[0]} and ${values[1]}.`,
        hint2: `${values[0]} ${isInc ? `+ ${stepAbs}` : `- ${stepAbs}`} = ${values[1]}, and every next jump changes by ${stepAbs} too.`,
        explanation: `Every neighbor changes by ${isInc ? `+${stepAbs}` : `-${stepAbs}`}, so the rule is "${correctLabel}"`,
      };
    }

    case 'ct-growing-diff-1': {
      const baseD = [1, 2, 3][Math.floor(rng() * 3)];
      let start = 2 + Math.floor(rng() * 9);
      if (start === 1 && baseD === 2) start = 3;
      const values = [start];
      for (let i = 0; i < 5; i++) {
        values.push(values[values.length - 1] + (baseD + i));
      }
      const ans = values[5];
      return {
        ...curated,
        storyContext: `Notice the jumps: +${baseD}, +${baseD + 1}, +${baseD + 2}, +${baseD + 3}...`,
        sequence: values.map((v, i) =>
          i === 5 ? { kind: 'number', value: '?', isMissing: true } : { kind: 'number', value: v }
        ),
        missingIndices: [5],
        options: makeNumberOptions(ans, baseD + 4, rng),
        correctAnswer: ans,
        ruleSummary: `Jumps grow by 1 each time: +${baseD}, +${baseD + 1}, +${baseD + 2}, +${baseD + 3}, +${baseD + 4}`,
        hint1: `Find the jump between each pair: ${values[0]}→${values[1]} (+${baseD}), ${values[1]}→${values[2]} (+${baseD + 1})...`,
        hint2: `From ${values[3]} to ${values[4]} we added ${baseD + 3}. What should we add next?`,
        explanation: `The jumps increase by 1 each step, so the next jump is +${baseD + 4}. ${values[4]} + ${baseD + 4} = ${ans}!`,
      };
    }

    case 'ct-squares-2': {
      const oddStart = rng() > 0.5 ? 1 : 3;
      let start = 1 + Math.floor(rng() * 8);
      if (start === 2 && oddStart === 3) start = 4;
      const jumps = Array.from({ length: 5 }, (_, i) => oddStart + i * 2);
      const values = [start];
      for (const j of jumps) values.push(values[values.length - 1] + j);
      const ans = values[5];
      return {
        ...curated,
        prompt: `Look at the Tower Lanterns: ${values.slice(0, 5).join(', ')}, ?. Find the next lantern number.`,
        sequence: values.map((v, i) =>
          i === 5 ? { kind: 'number', value: '?', isMissing: true } : { kind: 'number', value: v }
        ),
        missingIndices: [5],
        options: makeNumberOptions(ans, jumps[4], rng),
        correctAnswer: ans,
        ruleSummary: `Add consecutive odd numbers: ${jumps.map((j) => `+${j}`).join(', ')}`,
        hint1: `Find the first three jumps: +${jumps[0]}, +${jumps[1]}, +${jumps[2]}.`,
        hint2: `${values[4]} came from ${values[3]} + ${jumps[3]}. The next odd jump is +${jumps[4]}!`,
        explanation: `Each jump increases by 2 (${jumps.map((j) => `+${j}`).join(', ')}). So ${values[4]} + ${jumps[4]} = ${ans}!`,
      };
    }

    case 'ct-alt-3': {
      const stepA = [3, 4, 5, 6][Math.floor(rng() * 4)];
      const stepB = [3, 4, 5, 6][Math.floor(rng() * 4)];
      let startA = 2 + Math.floor(rng() * 9);
      if (startA === 5 && stepA === 5) startA = 4;
      const startB = stepB * 4 + 14 + Math.floor(rng() * 14);
      const seqVals = [
        startA,
        startB,
        startA + stepA,
        startB - stepB,
        startA + 2 * stepA,
        startB - 2 * stepB,
        startA + 3 * stepA,
        startB - 3 * stepB,
      ];
      const ans1 = seqVals[6];
      const ans2 = seqVals[7];
      const opts = Array.from(new Set([ans1, ans2, ans1 + stepA, Math.max(1, ans2 - stepB), ans1 - 1, ans2 + stepB])).slice(0, 4);
      if (!opts.includes(ans1)) opts[0] = ans1;
      if (!opts.includes(ans2)) opts[1] = ans2;
      return {
        ...curated,
        sequence: seqVals.map((v, i) =>
          i >= 6 ? { kind: 'number', value: '?', isMissing: true } : { kind: 'number', value: v }
        ),
        missingIndices: [6, 7],
        options: shuffleWithRng(opts, rng).map((v, idx) => ({ id: `alt-${idx}`, label: String(v), value: v })),
        correctAnswer: [ans1, ans2],
        ruleSummary: `Alternating tracks: odd spots +${stepA}, even spots -${stepB}`,
        hint1: `Hop over every other stone! Look at ${seqVals[0]}, ${seqVals[2]}, ${seqVals[4]}... and separately ${seqVals[1]}, ${seqVals[3]}, ${seqVals[5]}...`,
        hint2: `Track A adds +${stepA} to ${seqVals[4]}. Track B subtracts -${stepB} from ${seqVals[5]}.`,
        explanation: `Two sequences weave together: +${stepA} reaches ${ans1}, and -${stepB} reaches ${ans2}!`,
      };
    }

    case 'ct-constraint-4': {
      const chosenStep = [4, 5, 6, 7, 8][Math.floor(rng() * 5)];
      let startValue = 3 + Math.floor(rng() * 10);
      if (startValue === 6 && chosenStep === 6) startValue = 5;
      const targetEnd = startValue + 4 * chosenStep;
      const allowedSet = new Set<number>([chosenStep]);
      for (const candidate of [chosenStep - 1, chosenStep + 1, chosenStep + 2, chosenStep - 2]) {
        if (allowedSet.size < 4 && candidate >= 2) allowedSet.add(candidate);
      }
      const allowedSteps = Array.from(allowedSet).sort((a, b) => a - b);
      return {
        ...curated,
        prompt: `Champion’s Constraint Challenge: Start at ${startValue} and build a 5-term increasing pattern that lands on ${targetEnd}!`,
        storyContext: `You must pick the exact step rule so your 5th stone equals ${targetEnd}.`,
        sequence: [
          { kind: 'number', value: startValue },
          { kind: 'number', value: '?', isMissing: true },
          { kind: 'number', value: '?', isMissing: true },
          { kind: 'number', value: '?', isMissing: true },
          { kind: 'number', value: targetEnd, isMissing: true },
        ],
        creationSpec: {
          direction: 'increasing',
          startValue,
          length: 5,
          allowedSteps,
          requireTargetAtEnd: targetEnd,
        },
        correctAnswer: `created_increasing_${targetEnd}`,
        ruleSummary: `4 equal jumps from ${startValue} to ${targetEnd} means +${chosenStep} each step`,
        hint1: `To go from stone 1 (${startValue}) to stone 5 (${targetEnd}), you take 4 equal jumps. Total climb is ${targetEnd - startValue}.`,
        hint2: `Test adding +${chosenStep} four times starting at ${startValue}!`,
        explanation: `Four jumps of +${chosenStep} climbs ${4 * chosenStep} total from ${startValue} to ${targetEnd}.`,
      };
    }

    case 'ct-error-5': {
      const baseD = rng() > 0.5 ? 2 : 3;
      let start = 2 + Math.floor(rng() * 8);
      if (start === 3 && baseD === 2) start = 5;
      const trueValues = [start];
      for (let i = 0; i < 5; i++) {
        trueValues.push(trueValues[trueValues.length - 1] + (baseD + i));
      }
      const wrongIndex = rng() > 0.45 ? 4 : 3;
      const correctedValue = trueValues[wrongIndex];
      const wrongValue = correctedValue + (rng() > 0.5 ? 1 : -1);
      const seqDisplay = trueValues.map((v, i) => (i === wrongIndex ? wrongValue : v)).join(', ');
      return {
        ...curated,
        storyContext: `Sequence: ${seqDisplay}.`,
        sequence: trueValues.map((v, i) =>
          i === wrongIndex ? { kind: 'number', value: wrongValue, isError: true } : { kind: 'number', value: v }
        ),
        errorRepairSpec: {
          wrongIndex,
          wrongValue,
          correctedValue,
        },
        options: makeNumberOptions(correctedValue, 2, rng).filter((o) => o.value !== wrongValue).slice(0, 4),
        correctAnswer: correctedValue,
        ruleSummary: `Jumps are +${baseD}, +${baseD + 1}, +${baseD + 2}, +${baseD + 3}, +${baseD + 4}; ${wrongValue} repairs to ${correctedValue}`,
        hint1: `Find the jumps at the start: +${baseD}, +${baseD + 1}, +${baseD + 2}...`,
        hint2: `Check the expected jump from ${trueValues[wrongIndex - 1]} to keep the growing-jump rule steady!`,
        explanation: `With jumps growing by +1 each step (${trueValues.join(', ')}), ${wrongValue} repairs to ${correctedValue}!`,
      };
    }

    default:
      return curated;
  }
}

