export type ThemeId =
  | 'classic'
  | 'christmas'
  | 'summer'
  | 'autumn'
  | 'spring'
  | 'space'
  | 'ocean'
  | 'mountain'
  | 'cyberpunk';

export interface ThemeConfig {
  id: ThemeId;
  nameKo: string;
  nameEn: string;
  categoryKo: string;
  categoryEn: string;
  icon: string;
  accentColor: string;
  secondaryColor: string;
  bgColor: string;
  descKo: string;
  descEn: string;
}

export const THEME_LIST: ThemeConfig[] = [
  {
    id: 'classic',
    nameKo: '클래식 모노',
    nameEn: 'Classic Mono',
    categoryKo: '모던',
    categoryEn: 'Modern',
    icon: '⚡',
    accentColor: '#ffffff',
    secondaryColor: '#71717a',
    bgColor: '#09090b',
    descKo: '세련된 미니멀리즘 징크 & 고대비 실버',
    descEn: 'Minimalist deep matte zinc & high-contrast silver',
  },
  {
    id: 'christmas',
    nameKo: '크리스마스',
    nameEn: 'Christmas Noel',
    categoryKo: '시즌',
    categoryEn: 'Season',
    icon: '🎄',
    accentColor: '#ef4444',
    secondaryColor: '#10b981',
    bgColor: '#061710',
    descKo: '따뜻한 루비 레드와 상록수 포레스트 그린, 눈꽃 골드',
    descEn: 'Festive ruby red, pine forest green & warm golden snow',
  },
  {
    id: 'summer',
    nameKo: '여름 바다',
    nameEn: 'Summer Breeze',
    categoryKo: '시즌',
    categoryEn: 'Season',
    icon: '🏖️',
    accentColor: '#38bdf8',
    secondaryColor: '#fbbf24',
    bgColor: '#061a29',
    descKo: '청량한 트로피컬 에메랄드 파도와 눈부신 햇살',
    descEn: 'Tropical turquoise waves, sunlit golden sand & ocean azure',
  },
  {
    id: 'autumn',
    nameKo: '가을 단풍',
    nameEn: 'Autumn Maple',
    categoryKo: '시즌',
    categoryEn: 'Season',
    icon: '🍁',
    accentColor: '#f97316',
    secondaryColor: '#eab308',
    bgColor: '#1c100a',
    descKo: '포근한 메이플 앰버와 노을빛 테라코타, 밤나무 브라운',
    descEn: 'Warm sunset amber, cozy burnt terracotta & chestnut woods',
  },
  {
    id: 'spring',
    nameKo: '봄 벚꽃',
    nameEn: 'Spring Sakura',
    categoryKo: '시즌',
    categoryEn: 'Season',
    icon: '🌸',
    accentColor: '#f472b6',
    secondaryColor: '#a78bfa',
    bgColor: '#180e1d',
    descKo: '흩날리는 사쿠라 핑크와 라벤더 바이올렛의 싱그러움',
    descEn: 'Delicate sakura petal pink, twilight lavender & soft blossom',
  },
  {
    id: 'space',
    nameKo: '우주 코스모스',
    nameEn: 'Deep Cosmos',
    categoryKo: '자연/SF',
    categoryEn: 'Nature/Sci-Fi',
    icon: '🌌',
    accentColor: '#a855f7',
    secondaryColor: '#06b6d4',
    bgColor: '#09071a',
    descKo: '신비로운 심우주 성운 보라와 푸른 별빛 일루미네이션',
    descEn: 'Mystic nebula violet, galactic starlight cyan & cosmic void',
  },
  {
    id: 'ocean',
    nameKo: '심해 바다',
    nameEn: 'Deep Marine',
    categoryKo: '자연/SF',
    categoryEn: 'Nature/Sci-Fi',
    icon: '🌊',
    accentColor: '#0284c7',
    secondaryColor: '#14b8a6',
    bgColor: '#031422',
    descKo: '깊고 고요한 심해 네이비와 발광 플랑크톤 시안',
    descEn: 'Quiet deep abyss navy, bioluminescent aqua & gentle tides',
  },
  {
    id: 'mountain',
    nameKo: '에메랄드 산림',
    nameEn: 'Emerald Forest',
    categoryKo: '자연/SF',
    categoryEn: 'Nature/Sci-Fi',
    icon: '🌲',
    accentColor: '#10b981',
    secondaryColor: '#84cc16',
    bgColor: '#071810',
    descKo: '상쾌한 피톤치드 편백나무 숲과 짙은 에메랄드 제이드',
    descEn: 'Fresh mountain alpine mist, deep jade moss & pine woodland',
  },
  {
    id: 'cyberpunk',
    nameKo: '사이버펑크 네온',
    nameEn: 'Cyberpunk Neon',
    categoryKo: '자연/SF',
    categoryEn: 'Nature/Sci-Fi',
    icon: '👾',
    accentColor: '#f43f5e',
    secondaryColor: '#00f0ff',
    bgColor: '#05050a',
    descKo: '강렬한 네온 핫핑크와 일렉트릭 사이안의 사이버 시티',
    descEn: 'High-voltage electric cyan, neon laser magenta & noir grid',
  },
];

export const THEME_STORAGE_KEY = 'sudoku-theme-preference-v2';

export function getThemeConfig(id: ThemeId): ThemeConfig {
  const found = THEME_LIST.find((t) => t.id === id);
  return found ?? THEME_LIST[0];
}
