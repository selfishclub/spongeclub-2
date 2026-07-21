export const STORAGE_KEY = 'eft_tracker_v1';

export const SYMPTOM_QUESTIONS = [
  '내 삶은 불행한 편이다.',
  '한스러워지는 때가 있다.',
  '내 인생이 서글프다고 느낀다.',
  '나는 서러움을 느낀다.',
  '나는 억울함을 느낀다.',
  '나는 신경이 아주 약해져서 마음을 가눌 수 없다.',
  '나는 손발이 떨리고 안절부절 못한다.',
  '나는 내 자신에게 실망할 때가 많다.',
  '얼굴에 열이 자주 달아오른다.',
  '가슴속에 열이 차 있는 것을 자주 느낀다.',
  '무언가가 아래(다리 또는 배)에서 위(가슴)로 치미는 것을 자주 느낀다.',
  '화가 나면 손이 저리거나 떨린다.',
  '소화가 잘 안 되고 체하는 편이다.',
  '몹시 피곤하다.',
  '세상이 불공평하다고 느낀다.',
];

export const SYMPTOM_SCALE_LABELS = [
  '전혀 그렇지 않다',
  '그렇지 않은 편이다',
  '중간 정도 그렇다',
  '상당히 그렇다',
  '완전히 그렇다',
];

export const EFT_TAP_POINTS = [
  { name: '손날점(준비)', hint: '손날 가운데를 두드리며 준비 확언' },
  { name: '정수리', hint: '머리 꼭대기' },
  { name: '눈썹', hint: '눈썹 안쪽 시작점' },
  { name: '눈 옆', hint: '눈 바깥쪽 뼈' },
  { name: '눈 밑', hint: '눈 아래 뼈' },
  { name: '코 밑', hint: '코와 윗입술 사이' },
  { name: '턱', hint: '아랫입술과 턱 사이' },
  { name: '쇄골', hint: '쇄골 아래 오목한 곳' },
  { name: '겨드랑이 아래', hint: '옆구리, 겨드랑이에서 손바닥 하나 아래' },
];

export const EFT_GUIDE_STEPS = [
  'EFT는 침 없이 손끝으로 특정 지점(타점)을 가볍게 두드리며 감정을 다스리는 오픈소스 자가치료법입니다.',
  '검지·중지 두 손가락 끝으로 각 타점을 5~7회 톡톡 두드립니다.',
  '두드리는 동안 다스리려는 감정과 그 느낌에 마음을 집중합니다.',
  '순서: 손날점(준비) → 정수리 → 눈썹 → 눈 옆 → 눈 밑 → 코 밑 → 턱 → 쇄골 → 겨드랑이 아래',
  '한 바퀴 돈 뒤 감정 강도를 다시 확인합니다.',
];

export const SHAPE_FIELDS = [
  { key: 'temperature', label: '온도', placeholder: '예: 뜨겁다 / 차갑다 / 미지근하다' },
  { key: 'texture', label: '촉감·질감', placeholder: '예: 거칠다 / 끈적하다 / 딱딱하다' },
  { key: 'color', label: '색깔', placeholder: '예: 검붉은 / 회색 / 탁한' },
  { key: 'form', label: '모양', placeholder: '예: 뾰족한 덩어리 / 소용돌이' },
  { key: 'size', label: '크기', placeholder: '예: 주먹만 한 / 손바닥만 한' },
  { key: 'weight', label: '무게', placeholder: '예: 돌덩이처럼 무겁다 / 가볍다' },
];
