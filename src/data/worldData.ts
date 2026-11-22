import type { AreaId, CompetencyId } from '../types/game';

export interface WorldHotspot {
  id: string;
  areaId: AreaId;
  title: string;
  subtitle: string;
  xPercent: number; // 10 - 90
  yPercent: number; // 25 - 85
  questionId: string;
  worldEffectText: string; // What visibly changes in the world when solved!
  relicName: string;
}

export interface WorldArea {
  id: AreaId;
  name: string;
  shortLabel: string;
  description: string;
  guideName: string;
  guideGreeting: string;
  backdropImage: string;
  palette: {
    skyTop: string;
    skyBottom: string;
    hillBack: string;
    hillFront: string;
    ground: string;
    accent: string;
  };
  unlockRequirementText: string;
  nextAreaId?: AreaId;
  hotspots: WorldHotspot[];
}

export const WORLD_AREAS: Record<AreaId, WorldArea> = {
  counting_grove: {
    id: 'counting_grove',
    name: 'The Counting Grove',
    shortLabel: 'Counting Grove',
    description: 'Ancient mossy bridges and sunberry trees where number sequences awaken the stream.',
    guideName: 'Barnaby the Owl',
    guideGreeting: 'Hoo-hoo, young Guardian! Walk to each glowing landmark to mend our woodland number paths.',
    backdropImage: '/src/assets/images/bg_counting_grove_1795336831420.jpg',
    palette: {
      skyTop: '#BAE6FD',
      skyBottom: '#ECFDF5',
      hillBack: '#6EE7B7',
      hillFront: '#34D399',
      ground: '#10B981',
      accent: '#D97706',
    },
    unlockRequirementText: 'Starting Kingdom Area',
    nextAreaId: 'enchanted_garden',
    hotspots: [
      {
        id: 'hs-cg-bridge',
        areaId: 'counting_grove',
        title: 'Whispering Brook Bridge',
        subtitle: 'Stepping Stones (+4)',
        xPercent: 28,
        yPercent: 67,
        questionId: 'cg-bridge-1',
        worldEffectText: 'The missing river stone floats into place and the brook sparkles!',
        relicName: 'Brookstone Shard',
      },
      {
        id: 'hs-cg-stairs',
        areaId: 'counting_grove',
        title: 'Oak Treehouse Stairs',
        subtitle: 'Missing Middle Step',
        xPercent: 54,
        yPercent: 46,
        questionId: 'cg-stairs-2',
        worldEffectText: 'The glowing treehouse stairway locks together for the squirrel scouts!',
        relicName: 'Acorn Step Gem',
      },
      {
        id: 'hs-cg-berries',
        areaId: 'counting_grove',
        title: 'Sunberry Harvest Path',
        subtitle: 'Decreasing Piles (-5)',
        xPercent: 62,
        yPercent: 77,
        questionId: 'cg-fruit-3',
        worldEffectText: 'Golden sunberries fill the harvest baskets in neat shrinking rows!',
        relicName: 'Sunberry Crest',
      },
      {
        id: 'hs-cg-mushrooms',
        areaId: 'counting_grove',
        title: 'Elder Grove Lanterns',
        subtitle: 'Discover the Rule',
        xPercent: 78,
        yPercent: 60,
        questionId: 'cg-rule-4',
        worldEffectText: 'The woodland lanterns illuminate the archway to The Enchanted Garden!',
        relicName: 'Grove Lantern',
      },
    ],
  },
  enchanted_garden: {
    id: 'enchanted_garden',
    name: 'The Enchanted Garden',
    shortLabel: 'Enchanted Garden',
    description: 'Blooming shape planters, turning ivy arches, and alphabetical firefly lanterns.',
    guideName: 'Pip the Sprout Sprite',
    guideGreeting: 'Welcome to the garden! Look at shapes, turns, and letters to help every flower bed bloom.',
    backdropImage: '/src/assets/images/bg_enchanted_garden_1795336830609.jpg',
    palette: {
      skyTop: '#DDD6FE',
      skyBottom: '#FDF2F8',
      hillBack: '#A7F3D0',
      hillFront: '#6EE7B7',
      ground: '#059669',
      accent: '#DB2777',
    },
    unlockRequirementText: 'Complete 2 puzzles in The Counting Grove (or unlock via Parent Menu)',
    nextAreaId: 'rhythm_woods',
    hotspots: [
      {
        id: 'hs-eg-flowers',
        areaId: 'enchanted_garden',
        title: 'Starlight Flower Bed',
        subtitle: 'ABC Shape Pattern',
        xPercent: 25,
        yPercent: 72,
        questionId: 'eg-flower-1',
        worldEffectText: 'Radiant star, circle, and triangle blossoms open along the garden arch!',
        relicName: 'Petal Prism',
      },
      {
        id: 'hs-eg-vine',
        areaId: 'enchanted_garden',
        title: 'Spinning Ivy Arch',
        subtitle: 'Turning Leaves',
        xPercent: 22,
        yPercent: 45,
        questionId: 'eg-vine-2',
        worldEffectText: 'The emerald vine spirals upward around the stone arch!',
        relicName: 'Compass Leaf',
      },
      {
        id: 'hs-eg-lanterns',
        areaId: 'enchanted_garden',
        title: 'Pergola Letter Lanterns',
        subtitle: 'Alphabet Sequence',
        xPercent: 46,
        yPercent: 57,
        questionId: 'eg-lantern-3',
        worldEffectText: 'Warm letter lanterns flicker to life beneath the wooden pergola!',
        relicName: 'Firefly Rune',
      },
      {
        id: 'hs-eg-gems',
        areaId: 'enchanted_garden',
        title: 'Sunlit Courtyard Tiles',
        subtitle: 'AAB Repeating Gems',
        xPercent: 74,
        yPercent: 68,
        questionId: 'eg-size-4',
        worldEffectText: 'Courtyard mosaic gems shimmer and open the trail to Rhythm Woods!',
        relicName: 'Dewdrop Jewel',
      },
    ],
  },
  rhythm_woods: {
    id: 'rhythm_woods',
    name: 'The Rhythm Woods',
    shortLabel: 'Rhythm Woods',
    description: 'Musical chimes, lantern paths, and singing glade blossoms waiting for their beats.',
    guideName: 'Lyra the Songbird',
    guideGreeting: 'Listen closely—or watch the glowing beat shapes! Every rhythm has a steady pattern.',
    backdropImage: '/src/assets/images/bg_rhythm_woods_1795336831720.jpg',
    palette: {
      skyTop: '#C7D2FE',
      skyBottom: '#E0F2FE',
      hillBack: '#818CF8',
      hillFront: '#38BDF8',
      ground: '#0F766E',
      accent: '#0284C7',
    },
    unlockRequirementText: 'Complete 2 puzzles in The Enchanted Garden',
    nextAreaId: 'castle_sequences',
    hotspots: [
      {
        id: 'hs-rw-melody',
        areaId: 'rhythm_woods',
        title: 'Lantern Trail Clearing',
        subtitle: 'AB Beat Sequence',
        xPercent: 25,
        yPercent: 60,
        questionId: 'rw-melody-1',
        worldEffectText: 'The hanging lanterns chime and glow in cheerful harmony!',
        relicName: 'Songbird Bell',
      },
      {
        id: 'hs-rw-echo',
        areaId: 'rhythm_woods',
        title: 'Mossy Echo Glade',
        subtitle: 'ABB Missing Beat',
        xPercent: 53,
        yPercent: 71,
        questionId: 'rw-flowers-2',
        worldEffectText: 'Golden musical rings ripple across the mossy forest clearing!',
        relicName: 'Echo Mallet',
      },
      {
        id: 'hs-rw-chorus',
        areaId: 'rhythm_woods',
        title: 'Firefly Chorus Arch',
        subtitle: 'ABC Two-Beat Finale',
        xPercent: 78,
        yPercent: 58,
        questionId: 'rw-chorus-3',
        worldEffectText: 'The firefly chorus sings together, unlocking the Castle Courtyard!',
        relicName: 'Harmony Crystal',
      },
    ],
  },
  castle_sequences: {
    id: 'castle_sequences',
    name: 'The Castle of Sequences',
    shortLabel: 'Castle of Sequences',
    description: 'Construct your own increasing & decreasing patterns, repair glitches, and restore the Great Crystal!',
    guideName: 'Sir Cedric',
    guideGreeting: 'Welcome to the Castle! Become the Pattern Architect—build sequences from scratch and explain your rules.',
    backdropImage: '/src/assets/images/bg_castle_sequences_1795336831518.jpg',
    palette: {
      skyTop: '#FDE68A',
      skyBottom: '#FEF3C7',
      hillBack: '#94A3B8',
      hillFront: '#64748B',
      ground: '#475569',
      accent: '#B45309',
    },
    unlockRequirementText: 'Complete 2 puzzles in The Rhythm Woods',
    nextAreaId: 'champions_tower',
    hotspots: [
      {
        id: 'hs-cs-inc',
        areaId: 'castle_sequences',
        title: 'Rising Grand Staircase',
        subtitle: 'Create Increasing Pattern',
        xPercent: 31,
        yPercent: 66,
        questionId: 'cs-build-inc-1',
        worldEffectText: 'Golden marble steps rise smoothly across the Castle Courtyard!',
        relicName: 'Architect Crown',
      },
      {
        id: 'hs-cs-dec',
        areaId: 'castle_sequences',
        title: 'Royal Moat Bridge',
        subtitle: 'Create Decreasing Pattern',
        xPercent: 69,
        yPercent: 76,
        questionId: 'cs-build-dec-2',
        worldEffectText: 'The grand timber moat bridge glows with golden runes!',
        relicName: 'Drawbridge Key',
      },
      {
        id: 'hs-cs-gate',
        areaId: 'castle_sequences',
        title: 'West Gatehouse Rune',
        subtitle: 'Spot & Fix Error',
        xPercent: 20,
        yPercent: 48,
        questionId: 'cs-error-3',
        worldEffectText: 'The castle gatehouse gears click into alignment!',
        relicName: 'Clockwork Seal',
      },
      {
        id: 'hs-cs-crystal',
        areaId: 'castle_sequences',
        title: 'Great Sequence Crystal',
        subtitle: 'Explain the Rule',
        xPercent: 76,
        yPercent: 45,
        questionId: 'cs-reason-4',
        worldEffectText: 'The Great Sequence Crystal shines between the twin castle spires!',
        relicName: 'Great Sequence Shard',
      },
    ],
  },
  champions_tower: {
    id: 'champions_tower',
    name: "Champion's Tower",
    shortLabel: "Champion's Tower",
    description: 'Optional Math Team competition challenges (Grades 3–5 style reasoning, separate from Grade 2 test score).',
    guideName: 'Grandmaster Owl',
    guideGreeting: 'Welcome to the optional Champion’s Tower! Take your time—look for growing jumps and two-track secrets.',
    backdropImage: '/src/assets/images/bg_champions_tower_1795336831718.jpg',
    palette: {
      skyTop: '#1E1B4B',
      skyBottom: '#312E81',
      hillBack: '#4338CA',
      hillFront: '#3730A3',
      ground: '#1E293B',
      accent: '#F59E0B',
    },
    unlockRequirementText: 'Optional Competition Mode (Unlocks after 4 adventure puzzles or 2 ready topics)',
    hotspots: [
      {
        id: 'hs-ct-1',
        areaId: 'champions_tower',
        title: 'Starlight Terrace',
        subtitle: 'Tier 3: Growing Jumps',
        xPercent: 24,
        yPercent: 68,
        questionId: 'ct-growing-diff-1',
        worldEffectText: 'Starlight steps spiral upward around the parapet!',
        relicName: 'Starlight Spiral',
      },
      {
        id: 'hs-ct-2',
        areaId: 'champions_tower',
        title: 'Brass Telescope',
        subtitle: 'Tier 3: Odd-Jump Pattern',
        xPercent: 26,
        yPercent: 49,
        questionId: 'ct-squares-2',
        worldEffectText: 'The brass telescope locks onto golden constellations!',
        relicName: 'Comet Lens',
      },
      {
        id: 'hs-ct-3',
        areaId: 'champions_tower',
        title: 'Two-Track Promenade',
        subtitle: 'Tier 4: Interleaved Rules',
        xPercent: 48,
        yPercent: 68,
        questionId: 'ct-alt-3',
        worldEffectText: 'Twin glowing bridges weave across the starry terrace!',
        relicName: 'Twin Ribbon Crest',
      },
      {
        id: 'hs-ct-4',
        areaId: 'champions_tower',
        title: 'Lantern Forge',
        subtitle: 'Tier 4: Target Creation',
        xPercent: 68,
        yPercent: 54,
        questionId: 'ct-constraint-4',
        worldEffectText: 'The observatory lanterns blaze with golden fire!',
        relicName: 'Forge Medallion',
      },
      {
        id: 'hs-ct-5',
        areaId: 'champions_tower',
        title: 'Astronomical Dome',
        subtitle: 'Tier 4: Complex Glitch',
        xPercent: 80,
        yPercent: 42,
        questionId: 'ct-error-5',
        worldEffectText: 'The Observatory Dome chimes with golden starlight!',
        relicName: 'Champion Laurel',
      },
    ],
  },
};

export const AREA_ORDER: AreaId[] = [
  'counting_grove',
  'enchanted_garden',
  'rhythm_woods',
  'castle_sequences',
  'champions_tower',
];

export interface DayMissionPlan {
  day: 1 | 2 | 3;
  title: string;
  subtitle: string;
  estimatedMinutes: number;
  goals: string[];
  competencies: CompetencyId[];
  includesDiagnostic?: boolean;
  includesCreationFocus?: boolean;
  includesMockTest?: boolean;
}

export const THREE_DAY_PLAN: DayMissionPlan[] = [
  {
    day: 1,
    title: 'Day 1: Discover & Diagnose',
    subtitle: 'Find your strengths and warm up with number, letter, and repeating patterns.',
    estimatedMinutes: 15,
    goals: [
      'Complete the 6-question Kingdom Diagnostic',
      'Practice increasing & decreasing number patterns',
      'Explore letter lanterns & simple repeating patterns',
    ],
    competencies: ['number_patterns', 'letter_patterns', 'repeating_patterns'],
    includesDiagnostic: true,
  },
  {
    day: 2,
    title: 'Day 2: Practice & Build',
    subtitle: 'Strengthen visual & rhythm skills, revisit tricky spots, and create your own patterns!',
    estimatedMinutes: 15,
    goals: [
      'Practice visual orientation & rhythm sequences',
      'Create original increasing & decreasing patterns',
      'Revisit any missed concepts with step-by-step scaffolding',
    ],
    competencies: ['visual_patterns', 'rhythm_patterns', 'missing_terms'],
    includesCreationFocus: true,
  },
  {
    day: 3,
    title: 'Day 3: Prove Your Powers',
    subtitle: 'Complete the full 20-question Mock Summative Test and review every explanation.',
    estimatedMinutes: 15,
    goals: [
      'Quick 3-question confidence warm-up',
      'Take the 20-question Mixed-Topic Mock Assessment',
      'Review missed items and celebrate test readiness!',
    ],
    competencies: [
      'number_patterns',
      'letter_patterns',
      'visual_patterns',
      'repeating_patterns',
      'rhythm_patterns',
      'missing_terms',
    ],
    includesMockTest: true,
  },
];
