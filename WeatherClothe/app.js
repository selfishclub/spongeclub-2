// ---------- Constants ----------

// D2: the comparison baseline used to be hardcoded to Seoul, which is meaningless
// for anyone who doesn't live there (and circular for a trip *to* Seoul). We infer
// the user's home city from their IANA timezone instead.
const HOME_BASELINES = {
  "Asia/Seoul": { name: "서울", lat: 37.5665, lon: 126.978 },
  "Asia/Tokyo": { name: "도쿄", lat: 35.6762, lon: 139.6503 },
  "Asia/Singapore": { name: "싱가포르", lat: 1.3521, lon: 103.8198 },
  "Asia/Hong_Kong": { name: "홍콩", lat: 22.3193, lon: 114.1694 },
  "Asia/Taipei": { name: "타이베이", lat: 25.033, lon: 121.5654 },
  "Asia/Shanghai": { name: "상하이", lat: 31.2304, lon: 121.4737 },
  "Asia/Bangkok": { name: "방콕", lat: 13.7563, lon: 100.5018 },
  "Asia/Ho_Chi_Minh": { name: "호치민", lat: 10.8231, lon: 106.6297 },
  "Asia/Jakarta": { name: "자카르타", lat: -6.2088, lon: 106.8456 },
  "Asia/Manila": { name: "마닐라", lat: 14.5995, lon: 120.9842 },
  "Asia/Kolkata": { name: "뭄바이", lat: 19.076, lon: 72.8777 },
  "Asia/Dubai": { name: "두바이", lat: 25.2048, lon: 55.2708 },
  "Europe/London": { name: "런던", lat: 51.5074, lon: -0.1278 },
  "Europe/Paris": { name: "파리", lat: 48.8566, lon: 2.3522 },
  "Europe/Berlin": { name: "베를린", lat: 52.52, lon: 13.405 },
  "Europe/Madrid": { name: "마드리드", lat: 40.4168, lon: -3.7038 },
  "Europe/Rome": { name: "로마", lat: 41.9028, lon: 12.4964 },
  "America/New_York": { name: "뉴욕", lat: 40.7128, lon: -74.006 },
  "America/Chicago": { name: "시카고", lat: 41.8781, lon: -87.6298 },
  "America/Denver": { name: "덴버", lat: 39.7392, lon: -104.9903 },
  "America/Los_Angeles": { name: "로스앤젤레스", lat: 34.0522, lon: -118.2437 },
  "America/Toronto": { name: "토론토", lat: 43.6532, lon: -79.3832 },
  "America/Vancouver": { name: "밴쿠버", lat: 49.2827, lon: -123.1207 },
  "Australia/Sydney": { name: "시드니", lat: -33.8688, lon: 151.2093 },
  "Pacific/Auckland": { name: "오클랜드", lat: -36.8485, lon: 174.7633 },
};
const DEFAULT_HOME = { name: "서울", lat: 37.5665, lon: 126.978 };

// Countries that use Fahrenheit day-to-day.
const FAHRENHEIT_REGIONS = new Set(["US", "BS", "KY", "LR", "PW", "FM", "MH", "BZ"]);

// Korean → English aliases for destinations (mostly POIs / nature spots) that
// Open-Meteo geocoding fails to match with a Korean query.
const KOREAN_ALIASES = {
  // 해외 도시 — 음절 자동 로마자화로는 엉뚱한 곳이 잡힌다("교토" → gyoto → Gyotog)
  "도쿄": "Tokyo", "동경": "Tokyo", "교토": "Kyoto", "오사카": "Osaka", "삿포로": "Sapporo",
  "후쿠오카": "Fukuoka", "나고야": "Nagoya", "오키나와": "Okinawa", "요코하마": "Yokohama",
  "베이징": "Beijing", "북경": "Beijing", "상하이": "Shanghai", "상해": "Shanghai",
  "홍콩": "Hong Kong", "타이베이": "Taipei", "대만": "Taipei", "마카오": "Macau",
  "방콕": "Bangkok", "치앙마이": "Chiang Mai", "푸켓": "Phuket", "다낭": "Da Nang",
  "하노이": "Hanoi", "호치민": "Ho Chi Minh City", "나트랑": "Nha Trang", "달랏": "Da Lat",
  "싱가포르": "Singapore", "쿠알라룸푸르": "Kuala Lumpur", "발리": "Denpasar", "자카르타": "Jakarta",
  "세부": "Cebu", "마닐라": "Manila", "델리": "Delhi", "뭄바이": "Mumbai", "두바이": "Dubai",
  "이스탄불": "Istanbul", "파리": "Paris", "런던": "London", "로마": "Rome", "밀라노": "Milan",
  "피렌체": "Florence", "베네치아": "Venice", "베니스": "Venice", "나폴리": "Naples",
  "바르셀로나": "Barcelona", "마드리드": "Madrid", "리스본": "Lisbon", "포르투": "Porto",
  "베를린": "Berlin", "뮌헨": "Munich", "프랑크푸르트": "Frankfurt", "프라하": "Prague",
  "빈": "Vienna", "비엔나": "Vienna", "부다페스트": "Budapest", "취리히": "Zurich",
  "암스테르담": "Amsterdam", "브뤼셀": "Brussels", "코펜하겐": "Copenhagen",
  "스톡홀름": "Stockholm", "오슬로": "Oslo", "헬싱키": "Helsinki", "아테네": "Athens",
  "뉴욕": "New York", "로스앤젤레스": "Los Angeles", "엘에이": "Los Angeles",
  "샌프란시스코": "San Francisco", "라스베이거스": "Las Vegas", "시애틀": "Seattle",
  "시카고": "Chicago", "보스턴": "Boston", "하와이": "Honolulu", "호놀룰루": "Honolulu",
  "밴쿠버": "Vancouver", "토론토": "Toronto", "멕시코시티": "Mexico City", "칸쿤": "Cancun",
  "리우": "Rio de Janeiro", "부에노스아이레스": "Buenos Aires", "시드니": "Sydney",
  "멜버른": "Melbourne", "브리즈번": "Brisbane", "오클랜드": "Auckland", "카이로": "Cairo",
  "그랜드캐년": "Grand Canyon",
  "그랜드캐니언": "Grand Canyon",
  "융프라우": "Jungfrau",
  "요세미티": "Yosemite",
  "옐로스톤": "Yellowstone",
  "세도나": "Sedona",
  "앤텔로프캐년": "Antelope Canyon",
  "모뉴먼트밸리": "Monument Valley",
  "자이언캐년": "Zion",
  "브라이스캐년": "Bryce Canyon",
  "나이아가라": "Niagara Falls",
  "마추픽추": "Machu Picchu",
  "우유니": "Uyuni",
  "파타고니아": "Patagonia",
  "토레스델파이네": "Torres del Paine",
  "반프": "Banff",
  "인터라켄": "Interlaken",
  "체르마트": "Zermatt",
  "몽블랑": "Chamonix",
  "샤모니": "Chamonix",
  "돌로미티": "Dolomites",
  "할슈타트": "Hallstatt",
  "플리트비체": "Plitvice",
  "두브로브니크": "Dubrovnik",
  "몽생미셸": "Mont Saint-Michel",
  "산토리니": "Santorini",
  "카파도키아": "Cappadocia",
  "파묵칼레": "Pamukkale",
  "앙코르와트": "Siem Reap",
  "엘니도": "El Nido",
  "보라카이": "Boracay",
  "킬리만자로": "Kilimanjaro",
  "사파": "Sa Pa",
  "안나푸르나": "Pokhara",
  "퀸스타운": "Queenstown",
  "밀포드사운드": "Milford Sound",
};

// S1: Open-Meteo(GeoNames)의 주 색인은 로마자다. language=ko 는 결과 라벨만 번역할 뿐
// 한글로 검색되게 해주지 않는다 → '서울'·'제주'·'경주'는 0건, '대구'·'전주'는 북한이 나온다.
// 그래서 한글 질의는 로마자로 바꿔 한 번 더 던진다. 사전이 1순위(표기 정확), 그 다음이
// 음절 단위 자동 변환(사전에 없는 지명 대응).
const KR_ROMAN = {
  서울: "Seoul", 부산: "Busan", 인천: "Incheon", 대구: "Daegu", 대전: "Daejeon",
  광주: "Gwangju", 울산: "Ulsan", 세종: "Sejong", 수원: "Suwon", 용인: "Yongin",
  성남: "Seongnam", 고양: "Goyang", 청주: "Cheongju", 천안: "Cheonan", 김해: "Gimhae",
  제주: "Jeju", 서귀포: "Seogwipo", 강릉: "Gangneung", 속초: "Sokcho", 양양: "Yangyang",
  평창: "Pyeongchang", 춘천: "Chuncheon", 경주: "Gyeongju", 전주: "Jeonju", 여수: "Yeosu",
  순천: "Suncheon", 통영: "Tongyeong", 거제: "Geoje", 안동: "Andong", 남해: "Namhae",
  태안: "Taean", 가평: "Gapyeong", 부여: "Buyeo", 공주: "Gongju", 목포: "Mokpo",
  포항: "Pohang", 군산: "Gunsan", 담양: "Damyang", 보령: "Boryeong", 영월: "Yeongwol",
  설악산: "Seoraksan", 지리산: "Jirisan", 한라산: "Hallasan", 북한산: "Bukhansan",
  오대산: "Odaesan", 내장산: "Naejangsan", 남산: "Namsan", 성산일출봉: "Seongsan Ilchulbong",
};

// 한글 음절 → 로마자 (개정 로마자 표기법 근사). 자음동화까지는 처리하지 않으므로
// 표기가 갈리는 지명은 위 사전이 우선한다.
const RR_INITIAL = ["g","kk","n","d","tt","r","m","b","pp","s","ss","","j","jj","ch","k","t","p","h"];
const RR_MEDIAL = ["a","ae","ya","yae","eo","e","yeo","ye","o","wa","wae","oe","yo","u","wo","we","wi","yu","eu","ui","i"];
const RR_FINAL = ["","k","k","k","n","n","n","t","l","k","m","p","l","l","p","l","m","p","p","t","t","ng","t","t","k","t","p","t"];

function romanize(q) {
  let out = "";
  let hadHangul = false;
  for (const ch of q) {
    const code = ch.charCodeAt(0) - 0xac00;
    if (code < 0 || code > 11171) {
      out += ch;
      continue;
    }
    hadHangul = true;
    out += RR_INITIAL[Math.floor(code / 588)] + RR_MEDIAL[Math.floor((code % 588) / 28)] + RR_FINAL[code % 28];
  }
  return hadHangul ? out : null;
}

function toRoman(q) {
  const key = q.replace(/\s/g, "");
  return KR_ROMAN[key] || romanize(key);
}

// 여행 대상이 될 수 없는 국가는 후보에서 제외 (한글 질의 시 북한 지명이 대량으로 올라옴)
const BLOCKED_COUNTRIES = new Set(["KP"]);

// GeoNames feature code 우선순위 — 수도 > 광역 > 시·군 > 마을.
// 이게 없으면 '부산'이 경상북도 마을로, '인천'이 전라남도 마을로 잡힌다.
// 도시(PPL*)를 자연 지형(MT·PRK)보다 앞에 둔다 — "경주"처럼 같은 이름의 국립공원이
// 함께 잡히는 경우, 인구 24만 도시가 인구 0인 공원에 밀리면 안 되기 때문.
const FEATURE_RANK = { PPLC: 0, PPLA: 1, PPLA2: 2, PPLA3: 3, PPLA4: 4, PPL: 5, PPLX: 6, MT: 7, PRK: 7 };

// Known natural / activity-type destinations. `keys` matched as case-insensitive
// substrings against the (space-stripped) place name, in Korean or English —
// Open-Meteo geocoding often returns English names even for language=ko queries.
const ACTIVITY_DESTINATIONS = [
  { keys: ["그랜드캐년", "그랜드캐니언", "grandcanyon"], type: "activity", activity: "트레킹(림 트레일 / 브라이트 엔젤 트레일)" },
  { keys: ["융프라우", "jungfrau"], type: "activity", activity: "설산 하이킹 · 전망대 투어" },
  { keys: ["요세미티", "yosemite"], type: "activity", activity: "트레킹" },
  { keys: ["옐로스톤", "yellowstone"], type: "activity", activity: "국립공원 트레킹" },
  { keys: ["세도나", "sedona"], type: "activity", activity: "레드록 하이킹" },
  { keys: ["앤텔로프", "antelope"], type: "activity", activity: "캐년 투어" },
  { keys: ["자이언", "zion"], type: "activity", activity: "캐년 트레킹" },
  { keys: ["브라이스", "bryce"], type: "activity", activity: "캐년 트레킹" },
  { keys: ["모뉴먼트밸리", "monumentvalley"], type: "activity", activity: "사막 투어" },
  { keys: ["나이아가라", "niagara"], type: "mixed", activity: "폭포 관광 · 보트 투어" },
  { keys: ["마추픽추", "machupicchu", "aguascalientes"], type: "activity", activity: "잉카 트레일 · 고산 트레킹" },
  { keys: ["우유니", "uyuni"], type: "activity", activity: "소금사막 투어" },
  { keys: ["킬리만자로", "kilimanjaro"], type: "activity", activity: "고산 트레킹" },
  { keys: ["파타고니아", "patagonia", "torresdelpaine", "elcalafate", "elchalten"], type: "activity", activity: "트레킹" },
  { keys: ["반프", "banff"], type: "activity", activity: "로키 트레킹 · 호수 투어" },
  { keys: ["인터라켄", "interlaken"], type: "mixed", activity: "알프스 하이킹 · 패러글라이딩" },
  { keys: ["체르마트", "zermatt"], type: "activity", activity: "마터호른 하이킹 · 스키" },
  { keys: ["샤모니", "chamonix", "몽블랑", "montblanc"], type: "activity", activity: "고산 트레킹 · 케이블카 투어" },
  { keys: ["돌로미티", "dolomites", "dolomiti"], type: "activity", activity: "돌로미티 트레킹" },
  { keys: ["플리트비체", "plitvice"], type: "activity", activity: "국립공원 트레일 워킹" },
  { keys: ["카파도키아", "cappadocia", "göreme", "goreme"], type: "mixed", activity: "열기구 투어 · 계곡 하이킹" },
  { keys: ["파묵칼레", "pamukkale"], type: "mixed", activity: "석회붕 온천 워킹" },
  { keys: ["하와이", "hawaii"], type: "mixed", activity: "해변 · 화산 트레킹" },
  { keys: ["퀸스타운", "queenstown"], type: "mixed", activity: "액티비티(번지·트레킹) · 도심 관광" },
  { keys: ["밀포드", "milford"], type: "activity", activity: "피오르드 크루즈 · 트레킹" },
  { keys: ["스위스", "switzerland"], type: "mixed", activity: "산악 하이킹 · 도시 관광" },
  { keys: ["안나푸르나", "annapurna", "pokhara"], type: "activity", activity: "고산 트레킹" },
  { keys: ["사파", "sapa"], type: "activity", activity: "계단식 논 트레킹" },
  { keys: ["엘니도", "elnido"], type: "mixed", activity: "아일랜드 호핑 · 스노클링" },
  { keys: ["보라카이", "boracay"], type: "mixed", activity: "해변 액티비티" },
  { keys: ["아이슬란드", "iceland", "reykjavik", "레이캬비크"], type: "mixed", activity: "빙하 하이킹 · 오로라 투어" },
];

const CITY_TIPS = {
  "파리": [
    "성당(노트르담·사크레쾨르 등) 방문 시 어깨와 무릎을 가리는 옷을 권장합니다.",
    "고급 레스토랑은 스마트 캐주얼 이상을 요구하는 곳이 많습니다.",
    "지하철·관광지 소매치기가 많아 지퍼 있는 크로스백이 안전합니다.",
    "카페 테라스 문화가 발달해 저녁에는 야외 착석 대비 겉옷이 유용합니다.",
  ],
  "도쿄": [
    "신사·사찰에서는 과도하게 노출된 옷차림을 피하는 것이 좋습니다.",
    "장마철(6~7월)에는 접이식 우산과 발수 신발이 사실상 필수입니다.",
    "고급 스시야·료칸은 단정한 캐주얼 이상을 기대합니다.",
    "식당·료칸에서 신발을 벗는 경우가 많아 깨끗한 양말을 신경 쓰세요.",
  ],
  "교토": [
    "사찰·신사 위주 일정이라면 하루 2만보 이상 걷게 됩니다 — 길들인 편한 신발이 필수입니다.",
    "다다미·사찰 내부에서 신발을 벗는 일이 잦아 양말 상태를 신경 쓰세요.",
    "기모노·유카타 대여 시 안에 얇고 딱 붙는 옷을 입으면 편합니다.",
  ],
  "오사카": [
    "도톤보리 등 번화가는 캐주얼이 기본 — 격식 차릴 일이 거의 없습니다.",
    "여름 습도가 매우 높아 통기성 좋은 소재가 중요합니다.",
  ],
  "런던": [
    "비가 자주 오지만 짧게 지나가는 편이라 우산보다 후드 달린 방수 자켓이 실용적입니다.",
    "고급 레스토랑·바는 스마트 캐주얼 드레스코드가 흔합니다.",
    "한여름에도 아침저녁은 쌀쌀해 얇은 니트나 자켓이 필요합니다.",
  ],
  "뉴욕": [
    "파인다이닝은 재킷 착용을 요구하는 곳이 있습니다 — 예약 시 드레스코드를 확인하세요.",
    "겨울 빌딩풍이 매서워 방풍 아우터와 목도리가 체감온도를 크게 좌우합니다.",
    "지하철·거리 이동이 많아 뉴요커처럼 편한 신발 + 갈아신을 신발 조합이 일반적입니다.",
  ],
  "방콕": [
    "왕궁·왓프라깨우는 복장 규정이 엄격합니다 — 민소매·반바지·레깅스 입장 불가.",
    "사원 방문용으로 긴 바지나 롱스커트를 하루 일정에 맞춰 준비하세요.",
    "실내(쇼핑몰·식당) 냉방이 강해 얇은 겉옷이 있으면 좋습니다.",
    "우기(5~10월) 스콜 대비 샌들이나 빨리 마르는 신발이 편합니다.",
  ],
  "싱가포르": [
    "연중 고온다습 — 통기성 좋은 옷 + 실내 냉방 대비 얇은 겉옷 조합이 정석입니다.",
    "사원·모스크 방문 시 어깨와 무릎을 가려야 합니다.",
    "고급 루프탑 바는 스마트 캐주얼(샌들·반바지 제한)인 곳이 많습니다.",
  ],
  "두바이": [
    "공공장소에서는 어깨와 무릎을 가리는 복장이 예의로 여겨집니다.",
    "모스크 방문 시 여성은 스카프로 머리를 가려야 하는 경우가 많습니다.",
    "쇼핑몰 등 실내는 냉방이 강해 얇은 겉옷을 챙기는 것이 좋습니다.",
  ],
  "로마": [
    "바티칸·성당 방문 시 민소매·반바지 착용은 입장이 제한될 수 있습니다.",
    "돌길이 많아 굽 높은 신발보다는 편한 신발이 유리합니다.",
    "관광지 주변 소매치기 대비 지퍼 가방이 안전합니다.",
  ],
  "피렌체": [
    "두오모 성당 입장 시 어깨·무릎을 가려야 합니다.",
    "돌길이 많아 쿠션 좋은 신발이 필수입니다.",
  ],
  "베네치아": [
    "다리와 계단이 많아 캐리어보다 배낭, 힐보다 플랫이 압도적으로 편합니다.",
    "겨울~봄에는 아쿠아 알타(침수)가 있을 수 있어 방수 신발이 유용합니다.",
    "성당 방문 시 복장 규정(어깨·무릎)이 적용됩니다.",
  ],
  "바르셀로나": [
    "성가족성당은 어깨를 가려야 입장 가능합니다 — 얇은 스카프가 유용합니다.",
    "람블라스 거리 등 소매치기 최다 지역 — 앞으로 메는 가방을 권장합니다.",
    "해변과 시내를 오가는 일정이라면 원마일웨어 스타일이 편합니다.",
  ],
  "이스탄불": [
    "모스크(블루모스크 등) 방문 시 여성은 머리 스카프, 남녀 모두 무릎 아래 길이가 필요합니다.",
    "보수적인 지역도 있어 과한 노출은 피하는 것이 편합니다.",
    "언덕과 돌길이 많아 접지력 좋은 신발이 유리합니다.",
  ],
  "발리": [
    "사원 방문 시 사롱(허리에 두르는 천)을 둘러야 합니다 — 대부분 입구에서 대여 가능합니다.",
    "우기(11~3월)에는 스콜 대비 빨리 마르는 소재와 샌들이 편합니다.",
    "비치클럽·파인다이닝은 스마트 캐주얼을 요구하기도 합니다.",
  ],
  "다낭": [
    "사원·성당 방문 시 어깨·무릎을 가리는 것이 예의입니다.",
    "우기(9~12월) 스콜 대비 샌들과 우비가 유용합니다.",
    "호이안 구시가는 돌길 — 편한 신발이 좋습니다.",
  ],
  "프라하": [
    "구시가 전체가 울퉁불퉁한 돌길입니다 — 힐은 피하고 쿠션 좋은 신발을 신으세요.",
    "겨울 체감온도가 낮아 모자·장갑이 큰 차이를 만듭니다.",
  ],
  "홍콩": [
    "실내외 온도차가 매우 큽니다 — 여름에도 냉방 대비 겉옷이 필요합니다.",
    "미쉐린 레스토랑 다수가 스마트 캐주얼 드레스코드를 운영합니다.",
    "언덕과 계단이 많아 편한 신발이 유리합니다.",
  ],
  "타이베이": [
    "우천이 잦아 접이식 우산을 상시 휴대하는 것이 현지 스타일입니다.",
    "야시장 위주 일정은 캐주얼이 기본입니다.",
  ],
  "인터라켄": [
    "산악 날씨는 급변합니다 — 한여름에도 방풍 자켓을 배낭에 넣어 다니세요.",
    "융프라우요흐 정상은 한여름에도 0도 안팎입니다 — 경량 패딩을 챙기세요.",
  ],
  "퀸스타운": [
    "하루에 사계절이 있다는 곳 — 레이어링이 필수입니다.",
    "액티비티(번지·제트보트)는 젖을 수 있어 여벌 옷이 유용합니다.",
  ],
};

// Country-level fallback when there is no city entry. Keys follow the Korean
// country names returned by Open-Meteo geocoding (language=ko).
const COUNTRY_TIPS = {
  "프랑스": ["성당 방문 시 어깨·무릎을 가리는 복장이 필요합니다.", "관광지 소매치기 대비 지퍼 가방을 권장합니다."],
  "이탈리아": ["성당·두오모 입장 시 복장 규정(어깨·무릎)이 적용됩니다.", "구시가 돌길이 많아 편한 신발이 필수입니다."],
  "스페인": ["성당 방문 시 어깨를 가리는 복장이 필요합니다.", "관광지 소매치기가 많아 앞으로 메는 가방이 안전합니다."],
  "일본": ["신사·사찰에서는 노출이 심한 옷차림을 피하는 것이 좋습니다.", "식당·료칸에서 신발을 벗는 일이 많아 양말을 신경 쓰세요."],
  "태국": ["사원 복장 규정이 엄격합니다 — 민소매·반바지 불가인 곳이 많습니다.", "실내 냉방이 강해 얇은 겉옷을 챙기세요."],
  "베트남": ["사원·성당 방문 시 어깨·무릎을 가리세요.", "우기 스콜 대비 빨리 마르는 신발이 편합니다."],
  "인도네시아": ["사원 방문 시 사롱 착용이 필요한 곳이 많습니다.", "우기에는 스콜 대비 우비·샌들이 유용합니다."],
  "튀르키예": ["모스크 방문 시 여성은 스카프, 남녀 모두 무릎을 가려야 합니다."],
  "아랍에미리트": ["공공장소에서 어깨·무릎을 가리는 것이 예의입니다.", "실내 냉방이 강해 얇은 겉옷이 필요합니다."],
  "그리스": ["수도원·교회 방문 시 복장 규정이 있습니다 — 여성은 긴 치마를 요구하는 곳도 있습니다."],
  "영국": ["비가 잦아 방수 자켓이 우산보다 실용적입니다.", "펍·레스토랑에 따라 스마트 캐주얼을 요구합니다."],
  "미국": ["실내 냉방이 강한 편이라 여름에도 얇은 겉옷이 유용합니다.", "국립공원 일정이 있다면 레이어링과 트레킹화를 준비하세요."],
  "스위스": ["산악 날씨는 급변합니다 — 한여름에도 방풍 자켓과 경량 패딩을 챙기세요."],
  "뉴질랜드": ["하루에 사계절이 온다는 날씨 — 레이어링이 기본입니다.", "자외선이 매우 강해 선크림·모자가 필수입니다."],
  "호주": ["자외선이 매우 강합니다 — 모자와 선글라스를 챙기세요."],
  "캐나다": ["실내외 온도차가 커 레이어링이 기본입니다.", "국립공원 일정에는 방풍 자켓과 트레킹화가 필요합니다."],
};

const GENERIC_TIPS = [
  "종교 시설 방문 예정이 있다면 어깨·무릎을 가릴 수 있는 얇은 겉옷이나 스카프를 챙기세요.",
  "격식 있는 레스토랑 예약이 있다면 스마트 캐주얼 한 벌을 별도로 준비하는 것을 권장합니다.",
];

const STYLE_LABELS = {
  minimal: "미니멀 · 뉴트럴 톤",
  casual: "캐주얼 · 편안함 우선",
  classic: "클래식 · 단정함",
  street: "스트릿 · 개성 있는 룩",
};

// Item pools per style × temp band. Outfits are composed per day from these,
// so consecutive days in the same band still get different combinations.
// An empty string in `outer` means "no outer layer that day".
const OUTFIT_POOLS = {
  minimal: {
    freezing: { outer: ["무채색 롱패딩", "울 맥시코트"], top: ["캐시미어 니트", "터틀넥 니트", "하이넥 스웨터"], bottom: ["기모 와이드 팬츠", "울 슬랙스"], shoes: ["미니멀 레더 부츠", "첼시부츠"] },
    cold: { outer: ["울 코트", "무스탕", "패딩 베스트+코트"], top: ["터틀넥", "얇은 니트+셔츠 레이어드"], bottom: ["슬랙스", "스트레이트 데님"], shoes: ["첼시부츠", "레더 스니커즈"] },
    cool: { outer: ["트렌치코트", "니트 가디건", "울 셔츠자켓"], top: ["셔츠", "얇은 니트", "모크넥 티"], bottom: ["스트레이트 팬츠", "와이드 슬랙스"], shoes: ["로퍼", "레더 스니커즈"] },
    mild: { outer: ["셔츠 자켓", "라이트 블루종", ""], top: ["심플 티셔츠", "얇은 셔츠", "니트 베스트+티"], bottom: ["와이드 팬츠", "치노 팬츠"], shoes: ["스니커즈", "로퍼"] },
    warm: { outer: ["", "얇은 셔츠 걸치기"], top: ["리넨 셔츠", "코튼 티셔츠", "슬리브리스+셔츠"], bottom: ["와이드 팬츠", "리넨 팬츠"], shoes: ["샌들", "캔버스 스니커즈"] },
    hot: { outer: [""], top: ["루즈핏 코튼 티", "슬리브리스 니트", "리넨 반팔 셔츠"], bottom: ["리넨 반바지", "와이드 리넨 팬츠"], shoes: ["샌들", "가벼운 스니커즈"] },
  },
  casual: {
    freezing: { outer: ["숏패딩", "롱패딩"], top: ["후드티", "맨투맨", "기모 후드"], bottom: ["기모 청바지", "조거 팬츠"], shoes: ["어그부츠", "하이탑 스니커즈"] },
    cold: { outer: ["후리스 자켓", "패딩 점퍼", "코듀로이 자켓"], top: ["맨투맨", "니트", "후드티"], bottom: ["청바지", "코듀로이 팬츠"], shoes: ["스니커즈+두꺼운 양말", "워커"] },
    cool: { outer: ["바람막이", "데님 자켓", "가디건"], top: ["스웨트셔츠", "긴팔티", "셔츠"], bottom: ["청바지", "카고팬츠"], shoes: ["스니커즈", "슬립온"] },
    mild: { outer: ["가디건", "얇은 셔츠", ""], top: ["반팔티", "긴팔티"], bottom: ["청바지", "카고팬츠", "면바지"], shoes: ["스니커즈", "캔버스화"] },
    warm: { outer: ["", "얇은 셔츠 레이어드"], top: ["반팔티", "피케 셔츠"], bottom: ["반바지", "얇은 면바지"], shoes: ["스니커즈", "샌들"] },
    hot: { outer: [""], top: ["반팔티", "민소매", "메쉬 티"], bottom: ["반바지", "얇은 조거"], shoes: ["통풍 스니커즈", "샌들"] },
  },
  classic: {
    freezing: { outer: ["울 코트", "캐시미어 코트"], top: ["니트", "터틀넥"], bottom: ["울 슬랙스", "플란넬 팬츠"], shoes: ["가죽 부츠", "더비 슈즈+울양말"] },
    cold: { outer: ["트렌치코트+니트", "울 코트", "발마칸 코트"], top: ["니트+셔츠", "터틀넥"], bottom: ["슬랙스", "울 팬츠"], shoes: ["더비 슈즈", "첼시부츠"] },
    cool: { outer: ["블레이저", "트렌치코트", "니트 가디건"], top: ["셔츠", "폴로 니트"], bottom: ["슬랙스", "치노 팬츠"], shoes: ["로퍼", "더비 슈즈"] },
    mild: { outer: ["얇은 블레이저", "니트 걸치기", ""], top: ["셔츠", "얇은 니트", "폴로 셔츠"], bottom: ["슬랙스", "치노 팬츠"], shoes: ["로퍼", "스웨이드 스니커즈"] },
    warm: { outer: ["", "리넨 자켓"], top: ["리넨 셔츠", "반팔 셔츠"], bottom: ["슬랙스", "리넨 팬츠"], shoes: ["로퍼", "보트 슈즈"] },
    hot: { outer: [""], top: ["얇은 셔츠", "니트 폴로", "리넨 셔츠"], bottom: ["리넨 슬랙스", "얇은 치노"], shoes: ["로퍼(맨발)", "가벼운 스니커즈"] },
  },
  street: {
    freezing: { outer: ["롱패딩", "오버사이즈 코트"], top: ["후드 레이어드", "니트+머플러"], bottom: ["와이드 팬츠", "카고 팬츠"], shoes: ["워커", "패딩 부츠"] },
    cold: { outer: ["레더 자켓+후드", "스웨이드 자켓", "MA-1"], top: ["후드티", "터틀넥+티 레이어드"], bottom: ["카고팬츠", "와이드 데님"], shoes: ["워커", "청키 스니커즈"] },
    cool: { outer: ["오버사이즈 자켓", "코치 자켓", "데님 자켓"], top: ["그래픽 티+긴팔 레이어드", "후드티"], bottom: ["와이드 데님", "카고팬츠"], shoes: ["청키 스니커즈", "스케이트 슈즈"] },
    mild: { outer: ["바람막이", "셔츠자켓", ""], top: ["그래픽 티", "크롭 상의 레이어드", "저지 티"], bottom: ["와이드 데님", "트랙 팬츠"], shoes: ["스니커즈", "슬립온"] },
    warm: { outer: ["", "오버셔츠 걸치기"], top: ["반팔 그래픽 티", "저지 반팔"], bottom: ["와이드 쇼츠", "패러슈트 팬츠"], shoes: ["청키 스니커즈", "샌들+양말"] },
    hot: { outer: [""], top: ["탱크탑", "크롭 티", "오버핏 반팔"], bottom: ["와이드 쇼츠", "메쉬 쇼츠"], shoes: ["샌들", "가벼운 스니커즈"] },
  },
};

// When the day's plan is 트레킹/액티비티, functional gear replaces outer & shoes.
const ACTIVITY_GEAR = {
  outer: ["방풍 바람막이", "방수 자켓"],
  shoes: ["트레킹화", "접지력 좋은 운동화"],
};

// When the day includes a dressy occasion, one point item is added on top.
const DRESSY_POINTS = {
  minimal: ["울 자켓", "실버 액세서리"],
  casual: ["깔끔한 셔츠", "면 자켓"],
  classic: ["블레이저", "스카프"],
  street: ["레더 자켓", "볼드 주얼리"],
};

// D3: 목적지 유형(지형)만으로는 여행의 '목적'이 표현되지 않는다는 페르소나 피드백에
// 따라, 상위 유형 아래에 다중선택 목적 칩을 둔다. 한 여행에 2~3개 선택을 상정.
const TRIP_PURPOSES = {
  city: ["미식", "감성·기록", "쇼핑", "전시·문화", "야경·나이트"],
  activity: ["트레킹·등산", "숲길·산책", "해변·물놀이", "캠핑"],
  mixed: ["온천·스파", "리조트·호캉스", "로컬 체험", "격식·이벤트"],
};

// 각 목적이 옷차림/준비물에 주는 실제 변화. shoes/outer 는 그날 추천을 덮어쓰고,
// packing 은 여행 전체 준비물에 추가된다.
const PURPOSE_EFFECTS = {
  "미식": {
    note: "좌식 식당이 있을 수 있어요 — 벗기 편한 신발과 여유 있는 허리선이 편해요. 냄새 잘 배는 소재(울·기모)는 피하세요.",
    packing: [{ name: "물티슈", category: "기타" }],
  },
  "감성·기록": {
    note: "사진에 남는 여행이라면 무채색 배경에 포인트 컬러 하나만 더하는 조합이 가장 잘 나와요.",
    packing: [{ name: "카메라·여분 배터리", category: "전자기기" }],
  },
  "쇼핑": {
    note: "피팅이 잦아요 — 탈착 쉬운 겉옷과 벗기 편한 신발을 권장해요.",
    packing: [{ name: "접이식 에코백", category: "기타" }],
  },
  "전시·문화": {
    note: "전시장 냉방이 강해요 — 얇은 레이어 한 장을 가방에 넣어두세요.",
  },
  "야경·나이트": {
    note: "해가 진 뒤 기온이 크게 떨어져요 — 낮에 덥더라도 겉옷 하나는 필수예요.",
  },
  "트레킹·등산": {
    note: "기능성 우선 — 땀 배출 잘 되는 이너에 방풍 아우터를 겹치세요.",
    shoes: "트레킹화",
    outer: "방풍 바람막이",
    packing: [{ name: "등산 양말", category: "의류" }, { name: "물통", category: "기타" }],
  },
  "숲길·산책": {
    note: "저강도 산책이라 트레킹화는 과해요 — 쿠션 좋은 운동화면 충분해요.",
    shoes: "쿠션 좋은 운동화",
  },
  "해변·물놀이": {
    note: "자외선이 강해요 — 속건 소재와 모자를 챙기세요.",
    shoes: "샌들",
    packing: [
      { name: "수영복", category: "의류" },
      { name: "비치 타월", category: "기타" },
      { name: "자외선 차단제", category: "상비약" },
    ],
  },
  "캠핑": {
    note: "밤 기온이 낮보다 크게 떨어져요 — 경량 패딩 한 벌이 짐 대비 효율이 가장 좋아요.",
    packing: [{ name: "경량 패딩", category: "의류" }, { name: "헤드랜턴", category: "전자기기" }],
  },
  "온천·스파": {
    note: "입고 벗기 간편한 옷이 유리해요 — 복잡한 레이어드는 피하세요.",
    packing: [{ name: "여벌 속옷", category: "의류" }, { name: "세면도구", category: "기타" }],
  },
  "리조트·호캉스": {
    note: "실내 냉방이 강해요 — 여름이어도 얇은 겉옷을 챙기세요.",
    packing: [{ name: "슬리퍼", category: "신발" }],
  },
  "로컬 체험": {
    note: "활동성과 예의를 함께 지켜야 해요 — 과한 노출은 피하고 움직이기 편한 옷을 고르세요.",
  },
  "격식·이벤트": {
    note: "격식 있는 일정이 있어요 — 재킷과 구두 한 벌을 별도로 준비하세요.",
    packing: [{ name: "재킷", category: "의류" }, { name: "구두", category: "신발" }],
  },
};

// D4: 기본 풀은 성별 중립이다. 성별을 고르면 그 성별에서 실제로 선택지가 늘어나는
// 항목만 덧붙인다 (풀 전체를 성별로 복제하지 않음 — 관리 비용 대비 이득이 없다).
const GENDER_EXTRAS = {
  female: {
    bottom: {
      freezing: ["기모 롱스커트 + 두꺼운 타이츠"],
      cold: ["울 미디 스커트 + 타이츠"],
      cool: ["미디 스커트"],
      mild: ["플리츠 스커트"],
      warm: ["린넨 스커트"],
      hot: ["코튼 스커트"],
    },
    shoes: { cool: ["앵클부츠"], mild: ["플랫 슈즈"], warm: ["스트랩 샌들"] },
  },
  male: {
    bottom: { warm: ["치노 반바지"], hot: ["코튼 반바지"] },
    shoes: { cold: ["첼시부츠"], mild: ["스웨이드 스니커즈"] },
  },
};

function poolFor(stylePref, bandKey, gender) {
  const base = OUTFIT_POOLS[stylePref][bandKey];
  const extra = GENDER_EXTRAS[gender];
  if (!extra) return base;
  const merged = { ...base };
  ["outer", "top", "bottom", "shoes"].forEach((slot) => {
    const add = extra[slot] && extra[slot][bandKey];
    if (add) merged[slot] = [...base[slot], ...add];
  });
  return merged;
}

function pick(arr, n) {
  return arr[((n % arr.length) + arr.length) % arr.length];
}

function composeOutfit(stylePref, bandKey, activity, dayIndex, purposes = [], gender = "") {
  const pool = poolFor(stylePref, bandKey, gender);
  let outer = pick(pool.outer, dayIndex);
  const top = pick(pool.top, dayIndex);
  const bottom = pick(pool.bottom, dayIndex + 1);
  let shoes = pick(pool.shoes, dayIndex);
  let extra = "";

  if (activity === "액티비티") {
    outer = pick(ACTIVITY_GEAR.outer, dayIndex);
    shoes = pick(ACTIVITY_GEAR.shoes, dayIndex);
    extra = T("기능성 우선 — 땀 배출 잘 되는 소재로 상의를 고르세요.");
  } else if (activity === "식사·격식") {
    extra = t("dressyPoint", T(pick(DRESSY_POINTS[stylePref], dayIndex)));
  } else {
    extra = T("도보 이동이 많다면 신발은 편한 쪽을 우선하세요.");
  }

  // 목적 칩이 신발/아우터를 덮어쓴다 (뒤에 선택된 목적이 우선)
  purposes.forEach((p) => {
    const eff = PURPOSE_EFFECTS[p];
    if (!eff) return;
    if (eff.shoes) shoes = eff.shoes;
    if (eff.outer && outer) outer = eff.outer;
  });

  const clothing = [outer, top, bottom].filter(Boolean);
  const items = [
    ...clothing.map((name) => ({ name, category: "의류" })),
    { name: shoes, category: "신발" },
  ];
  // items(상태)는 한국어 원문을 유지하고, 화면에 나가는 line 만 현재 언어로 만든다
  const parts = clothing.map(T).join(" + ");
  return { line: `${parts}, ${T(shoes)}`, extra, items };
}

// D1: 준비물의 중심이 옷이 아니라는 피드백 → 여행 전체 단위 준비물을 자동 생성.
// 옷/신발은 날짜별 코디에서 오고, 여기서는 그 외 전부를 담당한다.
function buildEssentials({ isOverseas, nights, hist, purposes }) {
  const items = [];
  const add = (name, category) => items.push({ name, category, status: "own" });

  if (isOverseas) {
    add("여권 (유효기간 6개월 이상)", "서류·결제");
    add("항공권 e티켓", "서류·결제");
    add("해외 결제 가능 카드", "서류·결제");
    add("현지 통화 현금", "서류·결제");
    add("여행자 보험 증서", "서류·결제");
    add("멀티 어댑터", "전자기기");
  } else {
    add("신분증", "서류·결제");
    add("교통·숙소 예약 확인", "서류·결제");
  }

  add("휴대폰 충전기", "전자기기");
  if (nights >= 2) add("보조배터리", "전자기기");
  add("상비약 (진통제·소화제·밴드)", "상비약");
  add("세면도구", "기타");

  if (hist.precipChance >= 35) add("접이식 우산", "기타");
  if (hist.avgHigh >= 26) add("자외선 차단제", "상비약");
  if (hist.avgLow <= 5) add("보온 이너웨어", "의류");
  if (hist.diurnal >= 10) add("얇은 겉옷 (아침저녁용)", "의류");

  purposes.forEach((p) => {
    (PURPOSE_EFFECTS[p]?.packing || []).forEach((it) => add(it.name, it.category));
  });

  // 목적 칩이 중복 추가하는 항목 제거
  const seen = new Set();
  return items.filter((it) => {
    const k = itemKey(it.name);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ---------- State ----------

let selectedCity = null; // { name, lat, lon, country }
let selectedType = "city";
let geocodeTimer = null;
let selectedPurposes = []; // D3: 다중선택된 여행 목적 칩

// wardrobe planner state: date -> { activity, stylePref, bandKey, dayIndex, items:[{name,category,status}] }
// status: "own" (보유) | "buy" (사야 함); item.editing = true while renaming inline
let wardrobeState = {};
let essentialsState = []; // D1: 여행 전체 단위 준비물 (옷/신발 외)
let editingFocus = null; // { date, idx } to refocus after a redraw
let lastPlanContext = null; // { hist, isOverseas, nights } — 목적 변경 시 준비물 재생성용

// ---------- D2: 온도 단위 & 기준 도시 ----------

function detectHome() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (HOME_BASELINES[tz]) return { ...HOME_BASELINES[tz], tz };
  } catch {
    /* noop */
  }
  return { ...DEFAULT_HOME, tz: null };
}

function detectUnit() {
  const langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ""];
  for (const l of langs) {
    const region = (l.split("-")[1] || "").toUpperCase();
    if (region) return FAHRENHEIT_REGIONS.has(region) ? "F" : "C";
  }
  return "C";
}

const homeCity = detectHome();
let tempUnit = localStorage.getItem("wc-unit") || detectUnit();

// ---------- D6: 언어 ----------
// 상태에는 항상 한국어 원문을 저장하고, 그릴 때만 번역한다. 저장 리스트와 마지막
// 스냅샷이 언어와 무관하게 유지되고, 언어를 바꿔도 다시 계산할 필요가 없다.

let lang = localStorage.getItem("wc-lang") || (String(navigator.language || "").toLowerCase().startsWith("ko") ? "ko" : "en");

// 화면 문장 (없는 키는 한국어로 폴백)
function t(key, ...args) {
  const v = (UI[lang] && UI[lang][key]) ?? UI.ko[key];
  return typeof v === "function" ? v(...args) : v;
}

// 데이터에 박힌 한국어 용어 → 현재 언어. 사용자가 직접 입력한 아이템은 사전에
// 없으므로 원문 그대로 나간다.
function T(s) {
  if (lang === "ko" || s == null) return s;
  return TERMS[s] || s;
}

function toUnit(c) {
  return tempUnit === "F" ? c * 9 / 5 + 32 : c;
}

// 절대 온도 표기 (예: 12.3°C / 54.1°F)
function fmtTemp(c, digits = 0) {
  return `${toUnit(c).toFixed(digits)}°${tempUnit}`;
}

// 온도 '차이' 표기 — 화씨 변환 시 +32 오프셋을 적용하면 안 되므로 분리
function fmtDelta(c, digits = 0) {
  const v = tempUnit === "F" ? c * 9 / 5 : c;
  return `${v.toFixed(digits)}°`;
}

// ---------- DOM ----------

const cityInput = document.getElementById("city-input");
const suggestionsBox = document.getElementById("city-suggestions");
const startDateInput = document.getElementById("start-date");
const endDateInput = document.getElementById("end-date");
const typeToggle = document.getElementById("type-toggle");
const typeHint = document.getElementById("type-hint");
const purposeBox = document.getElementById("purpose-chips");
const unitToggle = document.getElementById("unit-toggle");
const langToggle = document.getElementById("lang-toggle");
const genderSelect = document.getElementById("gender-pref");
const savedCard = document.getElementById("saved-card");
const styleSelect = document.getElementById("style-pref");
const photoInput = document.getElementById("photo-input");
const uploadBtn = document.getElementById("upload-btn");
const photoPreview = document.getElementById("photo-preview");
const styleAnalysis = document.getElementById("style-analysis");
const submitBtn = document.getElementById("submit-btn");
const errorMsg = document.getElementById("error-msg");
const resultsSection = document.getElementById("results");
const loading = document.getElementById("loading");
const loadingText = document.getElementById("loading-text");

const todayStr = new Date().toISOString().slice(0, 10);
startDateInput.min = todayStr;
endDateInput.min = todayStr;

// ---------- Destination type detection ----------

function detectType(cityName) {
  const norm = cityName.replace(/\s/g, "").toLowerCase();
  const found = ACTIVITY_DESTINATIONS.find((d) => d.keys.some((k) => norm.includes(k.toLowerCase())));
  return found ? { type: found.type, activity: found.activity } : { type: "city", activity: null };
}

function setType(type, auto) {
  selectedType = type;
  [...typeToggle.children].forEach((btn) => {
    btn.classList.toggle("selected", btn.dataset.type === type);
  });
  typeHint.textContent = auto ? t("typeAuto", selectedCity ? selectedCity.name : "", typeLabel(type)) : "";
  drawPurposes();
}

function typeLabel(type) {
  return t(type === "activity" ? "typeActivity" : type === "mixed" ? "typeMixed" : "typeCity");
}

typeToggle.addEventListener("click", (e) => {
  const btn = e.target.closest(".type-btn");
  if (!btn) return;
  setType(btn.dataset.type, false);
});

// D3: 상위 유형의 목적 칩을 우선 노출하되, 여행은 대개 섞이므로 다른 유형의 목적도
// 함께 고를 수 있게 전부 보여준다 (선택된 유형 것이 앞에 오도록 정렬).
function drawPurposes() {
  const order = [selectedType, ...Object.keys(TRIP_PURPOSES).filter((t) => t !== selectedType)];
  purposeBox.innerHTML = order
    .map((t) => {
      const chips = TRIP_PURPOSES[t]
        .map((p) => {
          const on = selectedPurposes.includes(p);
          return `<button type="button" class="purpose-chip${on ? " on" : ""}" data-purpose="${esc(p)}">${esc(T(p))}</button>`;
        })
        .join("");
      return `<div class="purpose-group${t === selectedType ? " primary" : ""}">
          <span class="purpose-group-label">${typeLabel(t)}</span>
          <div class="purpose-chip-row">${chips}</div>
        </div>`;
    })
    .join("");
}

purposeBox.addEventListener("click", (e) => {
  const btn = e.target.closest(".purpose-chip");
  if (!btn) return;
  const p = btn.dataset.purpose;
  const i = selectedPurposes.indexOf(p);
  if (i >= 0) selectedPurposes.splice(i, 1);
  else selectedPurposes.push(p);
  drawPurposes();
  // 결과가 이미 떠 있으면 목적 변경을 즉시 반영
  if (lastPlanContext) {
    rebuildEssentials();
    drawPlan();
    renderTips(lastPlanContext.cityName, lastPlanContext.country, lastPlanContext.hist, selectedType, lastPlanContext.activity);
  }
});

// D2: 온도 단위 토글 — 기본값은 로케일 자동 감지, 사용자가 바꾸면 기억한다.
function drawUnitToggle() {
  [...unitToggle.children].forEach((b) => b.classList.toggle("selected", b.dataset.unit === tempUnit));
  document.getElementById("home-baseline").textContent = t("baseline", T(homeCity.name), tempUnit);
}

// D6: 정적 텍스트를 현재 언어로 채운다. data-i18n(텍스트) / -html(태그 포함) / -placeholder.
function applyStaticI18n() {
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    el.innerHTML = t(el.dataset.i18nHtml);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  [...styleSelect.options].forEach((o) => {
    o.textContent = T(STYLE_LABELS[o.value]);
  });
  [...langToggle.children].forEach((b) => b.classList.toggle("selected", b.dataset.lang === lang));
  drawUnitToggle();
}

// 언어를 바꾸면 화면 전체를 다시 그린다 — 상태는 한국어로 남아 있으므로 재조회는 없다.
langToggle.addEventListener("click", (e) => {
  const btn = e.target.closest(".unit-btn");
  if (!btn || btn.dataset.lang === lang) return;
  lang = btn.dataset.lang;
  localStorage.setItem("wc-lang", lang);
  applyStaticI18n();
  drawPurposes();
  drawSaved();
  if (selectedCity) setType(selectedType, false);
  if (lastPlanContext) {
    const c = lastPlanContext;
    renderWeather(c.hist, c.forecast, c.cityName, c.homeHist);
    renderReference(c.cityName, selectedType, c.activity, c.hist);
    drawPlan();
    renderTips(c.cityName, c.country, c.hist, selectedType, c.activity);
  }
});

unitToggle.addEventListener("click", (e) => {
  const btn = e.target.closest(".unit-btn");
  if (!btn || btn.dataset.unit === tempUnit) return;
  tempUnit = btn.dataset.unit;
  localStorage.setItem("wc-unit", tempUnit);
  drawUnitToggle();
  if (lastPlanContext) {
    const c = lastPlanContext;
    renderWeather(c.hist, c.forecast, c.cityName, c.homeHist);
    drawPlan();
    renderTips(c.cityName, c.country, c.hist, selectedType, c.activity);
  }
});

// D4: 성별은 추천 아이템 풀만 넓힌다 (스커트/반바지/부츠 등). 이미 결과가 떠 있으면 즉시 반영.
genderSelect.addEventListener("change", () => {
  if (!lastPlanContext) return;
  Object.keys(wardrobeState).forEach((date) => seedItems(date));
  drawPlan();
});

// ---------- 뷰 전환 (검색 / 준비 리스트 / 저장) ----------
// 모바일에서 입력·결과·저장이 한 페이지에 쌓여 스크롤이 길어지는 문제를 뷰 분리로 해결.

const appNav = document.getElementById("app-nav");

function showView(name) {
  document.body.dataset.view = name; // 결과·저장 뷰에서는 히어로 헤더를 축소해 화면을 아낀다
  document.querySelectorAll(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${name}`));
  [...appNav.children].forEach((b) => b.classList.toggle("active", b.dataset.view === name));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

appNav.addEventListener("click", (e) => {
  const btn = e.target.closest(".nav-btn");
  if (btn) showView(btn.dataset.view);
});

// ---------- D4: 저장 리스트 ----------
// 1인용 구조를 유지하되, 가족 여행처럼 "기준을 바꿔 다시 검색"해야 하는 경우를
// 저장 리스트로 해결한다. localStorage에 남으므로 창을 닫아도 결과가 사라지지 않는다.

const SAVED_KEY = "wc-saved";

function loadSaved() {
  try {
    const v = JSON.parse(localStorage.getItem(SAVED_KEY));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

let savedTrips = loadSaved();

function persistSaved() {
  localStorage.setItem(SAVED_KEY, JSON.stringify(savedTrips));
}

function genderLabel(g) {
  return t(g === "female" ? "genderFemale" : g === "male" ? "genderMale" : "savedGenderNone");
}

function saveCurrentTrip() {
  if (!selectedCity || !lastPlanContext) return;
  savedTrips.unshift({
    id: `t${Date.now()}`,
    city: { ...selectedCity },
    start: startDateInput.value,
    end: endDateInput.value,
    type: selectedType,
    purposes: [...selectedPurposes],
    style: styleSelect.value,
    gender: genderSelect.value,
    buyCount: buildPackingList().filter((i) => i.status === "buy").length,
    total: buildPackingList().length,
  });
  savedTrips = savedTrips.slice(0, 20);
  persistSaved();
  drawSaved();
}

function drawSaved() {
  const badge = document.getElementById("nav-saved-count");
  badge.textContent = savedTrips.length;
  badge.classList.toggle("hidden", !savedTrips.length);
  document.getElementById("saved-empty").classList.toggle("hidden", savedTrips.length > 0);

  if (!savedTrips.length) {
    savedCard.classList.add("hidden");
    savedCard.innerHTML = "";
    return;
  }
  savedCard.classList.remove("hidden");
  const rows = savedTrips
    .map(
      (s) => `<li class="saved-row">
        <div class="saved-main">
          <span class="saved-city">${esc(s.city.name)}</span>
          <span class="saved-meta">${esc(s.start)} ~ ${esc(s.end)} · ${esc(genderLabel(s.gender))}${
        s.purposes.length ? ` · ${esc(s.purposes.map(T).join(", "))}` : ""
      }</span>
          <span class="saved-meta">${esc(t("savedCount", s.total, s.buyCount))}</span>
        </div>
        <button type="button" class="saved-load" data-saved-id="${s.id}">${t("savedLoad")}</button>
        <button type="button" class="saved-del" data-saved-del="${s.id}" aria-label="${t("ariaDelete")}">✕</button>
      </li>`
    )
    .join("");
  savedCard.innerHTML = `
    <div class="saved-head">
      <h3>${t("savedTitle")}</h3>
      <span class="hint">${t("savedHint")}</span>
    </div>
    <ul class="saved-list">${rows}</ul>
  `;
}

savedCard.addEventListener("click", (e) => {
  const del = e.target.closest(".saved-del");
  if (del) {
    savedTrips = savedTrips.filter((t) => t.id !== del.dataset.savedDel);
    persistSaved();
    drawSaved();
    return;
  }
  const load = e.target.closest(".saved-load");
  if (!load) return;
  const t = savedTrips.find((x) => x.id === load.dataset.savedId);
  if (!t) return;
  selectedCity = { ...t.city };
  cityInput.value = t.city.name;
  startDateInput.value = t.start;
  endDateInput.value = t.end;
  styleSelect.value = t.style;
  genderSelect.value = t.gender || "";
  selectedPurposes = [...t.purposes];
  setType(t.type, false);
  suggestionsBox.classList.add("hidden");
  submitBtn.click();
});

drawSaved();

// ---------- 마지막 결과 자동 보존 ----------
// 저장 버튼을 누르지 않아도 마지막으로 만든 준비 리스트는 남아야 한다.
// (브라우저 탭을 옮겼다 돌아오거나 새로고침해도 사라지지 않도록 localStorage에 스냅샷)
// 날씨 응답까지 통째로 담으므로 복원 시 네트워크 요청이 없다.

const LAST_KEY = "wc-last";

function persistLast() {
  if (!lastPlanContext || !selectedCity) return;
  try {
    localStorage.setItem(
      LAST_KEY,
      JSON.stringify({
        city: selectedCity,
        start: startDateInput.value,
        end: endDateInput.value,
        type: selectedType,
        purposes: selectedPurposes,
        style: styleSelect.value,
        gender: genderSelect.value,
        ctx: lastPlanContext,
        wardrobeState,
        essentialsState,
      })
    );
  } catch {
    /* 용량 초과 등은 무시 — 보존은 부가 기능이므로 앱을 막지 않는다 */
  }
}

function restoreLast() {
  let s;
  try {
    s = JSON.parse(localStorage.getItem(LAST_KEY));
  } catch {
    return;
  }
  if (!s || !s.ctx || !s.wardrobeState) return;

  selectedCity = s.city;
  cityInput.value = s.city.name;
  startDateInput.value = s.start;
  endDateInput.value = s.end;
  styleSelect.value = s.style;
  genderSelect.value = s.gender || "";
  selectedPurposes = s.purposes || [];
  setType(s.type, false);

  lastPlanContext = s.ctx;
  wardrobeState = s.wardrobeState;
  essentialsState = s.essentialsState || [];

  const c = s.ctx;
  renderWeather(c.hist, c.forecast, c.cityName, c.homeHist);
  renderReference(c.cityName, s.type, c.activity, c.hist);
  drawPlan();
  renderTips(c.cityName, c.country, c.hist, s.type, c.activity);

  resultsSection.classList.remove("hidden");
  document.getElementById("results-empty").classList.add("hidden");
}

// ---------- Geocoding & autocomplete ----------

cityInput.addEventListener("input", () => {
  selectedCity = null;
  const q = cityInput.value.trim();
  clearTimeout(geocodeTimer);
  if (q.length < 2) {
    suggestionsBox.classList.add("hidden");
    return;
  }
  geocodeTimer = setTimeout(() => searchCity(q), 300);
});

let searchAbort = null;

async function geocode(q, labelLang, signal) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=10&language=${labelLang}&format=json`;
  const res = await fetch(url, { signal });
  const data = await res.json();
  return data.results || [];
}

// 규모를 행정등급보다 먼저 본다. 등급만 보면 인구 7,864명의 York(영국식 PPLA2)가
// 인구 880만 뉴욕시(PPL)를 이기고, 이름이 겹치는 벽지 지명이 광역시를 밀어낸다.
function popBucket(r) {
  const p = r.population || 0;
  if (p >= 500000) return 0;
  if (p >= 100000) return 1;
  if (p >= 10000) return 2;
  return 3;
}

function rankResults(results) {
  const seen = new Set();
  return results
    .filter((r) => {
      if (BLOCKED_COUNTRIES.has(r.country_code)) return false;
      // 질의를 여러 번 던지므로 같은 곳이 중복으로 들어온다
      const key = `${r.latitude.toFixed(2)},${r.longitude.toFixed(2)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort(
      (a, b) =>
        popBucket(a) - popBucket(b) ||
        (FEATURE_RANK[a.feature_code] ?? 8) - (FEATURE_RANK[b.feature_code] ?? 8) ||
        (b.population || 0) - (a.population || 0)
    )
    .slice(0, 6);
}

function resolveAlias(q) {
  const norm = q.replace(/\s/g, "").toLowerCase();
  const entries = Object.entries(KOREAN_ALIASES);
  const exact = entries.find(([k]) => k.toLowerCase() === norm);
  if (exact) return exact[1];
  // 짧은 키(‘빈’·‘대만’)가 아무 데나 걸리지 않도록 부분일치는 길이 조건을 둔다
  const prefix = norm.length >= 2 && entries.find(([k]) => k.toLowerCase().startsWith(norm));
  if (prefix) return prefix[1];
  const partial = entries.find(([k]) => k.length >= 3 && norm.includes(k.toLowerCase()));
  return partial ? partial[1] : null;
}

async function searchCity(q) {
  // 이전 요청을 취소하지 않으면 늦게 도착한 응답이 최신 후보를 덮어쓴다
  if (searchAbort) searchAbort.abort();
  searchAbort = new AbortController();
  const { signal } = searchAbort;

  // 한 질의로는 안 된다. language 파라미터가 라벨뿐 아니라 '매칭'에도 영향을 주기
  // 때문이다 — "부산"은 한글 색인에서 전라남도 마을을, "Busan"은 광역시를 찾는다.
  // 그래서 원문·별칭·로마자를 모두 던지고 결과를 합친 뒤 규모 기준으로 고른다.
  // 라벨 언어도 두 벌 던진다 — UI가 한국어일 때 "New York"을 language=ko로 물으면
  // 뉴욕시가 아예 후보에 없다. UI 언어 결과를 앞에 두어 라벨은 UI 언어를 우선한다.
  const variants = [...new Set([q, resolveAlias(q), toRoman(q)].filter(Boolean))];
  const langs = [lang, lang === "ko" ? "en" : "ko"];

  try {
    const pages = await Promise.all(
      langs.flatMap((l) => variants.map((name) => geocode(name, l, signal).catch(() => [])))
    );
    const results = rankResults(pages.flat());
    if (results.length) renderSuggestions(results);
    else renderNoMatch(q);
  } catch (err) {
    if (err.name !== "AbortError") suggestionsBox.classList.add("hidden");
  }
}

function renderNoMatch(q) {
  suggestionsBox.innerHTML = `<div class="suggestion-empty">${esc(t("noMatch", q))}</div>`;
  suggestionsBox.classList.remove("hidden");
}

function renderSuggestions(results) {
  suggestionsBox.innerHTML = "";
  results.forEach((r) => {
    const div = document.createElement("div");
    div.className = "suggestion-item";
    const region = [r.admin1, r.country].filter(Boolean).join(", ");
    // 동명 지명이 많아 규모까지 보여야 광역시와 시골 마을이 구분된다
    // 1만 미만은 "인구 0만"으로 표시되므로 문구를 바꾼다
    const scale = r.population >= 10000 ? t("popScale", r.population) : t("popSmall");
    div.innerHTML = `<span class="sugg-name">${esc(r.name)}</span><span class="sugg-meta">${esc(region)} · ${scale}</span>`;
    div.addEventListener("click", () => {
      selectedCity = { name: r.name, lat: r.latitude, lon: r.longitude, country: r.country || "" };
      cityInput.value = r.name;
      suggestionsBox.classList.add("hidden");
      const detected = detectType(r.name);
      setType(detected.type, true);
    });
    suggestionsBox.appendChild(div);
  });
  suggestionsBox.classList.remove("hidden");
}

document.addEventListener("click", (e) => {
  if (!e.target.closest(".field")) suggestionsBox.classList.add("hidden");
});

// ---------- Style photo analysis (Phase 1: client-side color heuristic) ----------

uploadBtn.addEventListener("click", () => photoInput.click());

photoInput.addEventListener("change", async () => {
  const files = [...photoInput.files].slice(0, 6);
  if (!files.length) return;

  photoPreview.innerHTML = "";
  photoPreview.classList.remove("hidden");

  const stats = { total: 0, neutral: 0, colorful: 0, satSum: 0, lightSum: 0 };
  const colorBins = new Map(); // quantized rgb -> { count, r, g, b }

  for (const file of files) {
    const img = await loadImage(file);
    photoPreview.appendChild(img.thumb);
    collectColorStats(img.el, stats, colorBins);
  }

  if (!stats.total) return;

  const neutralRatio = stats.neutral / stats.total;
  const avgLight = stats.lightSum / stats.total;
  const avgSat = stats.colorful ? stats.satSum / stats.colorful : 0;

  let style;
  if (neutralRatio > 0.72) {
    style = avgLight > 0.52 ? "minimal" : "classic";
  } else if (avgSat > 0.45 && stats.colorful / stats.total > 0.4) {
    style = "street";
  } else {
    style = "casual";
  }

  const palette = [...colorBins.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((c) => `rgb(${Math.round(c.r / c.count)}, ${Math.round(c.g / c.count)}, ${Math.round(c.b / c.count)})`);

  styleSelect.value = style;
  styleAnalysis.classList.remove("hidden");
  const satLabel = t(avgSat > 0.45 ? "satHigh" : avgSat > 0.25 ? "satMid" : "satLow");
  styleAnalysis.innerHTML = `
    ${t("photoResult", files.length, Math.round(neutralRatio * 100), satLabel, T(STYLE_LABELS[style]))}
    <div class="palette">${palette.map((c) => `<span class="swatch" style="background:${c}"></span>`).join("")}</div>
  `;
});

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const el = new Image();
    el.onload = () => {
      const thumb = document.createElement("img");
      thumb.src = url;
      resolve({ el, thumb });
    };
    el.onerror = reject;
    el.src = url;
  });
}

function collectColorStats(imgEl, stats, colorBins) {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(imgEl, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const s = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));

    stats.total++;
    stats.lightSum += l;
    if (s <= 0.22 || l < 0.08 || l > 0.95) {
      stats.neutral++;
    } else {
      stats.colorful++;
      stats.satSum += s;
    }

    // quantize to 4 levels/channel for the palette
    const key = `${data[i] >> 6},${data[i + 1] >> 6},${data[i + 2] >> 6}`;
    const bin = colorBins.get(key) || { count: 0, r: 0, g: 0, b: 0 };
    bin.count++;
    bin.r += data[i];
    bin.g += data[i + 1];
    bin.b += data[i + 2];
    colorBins.set(key, bin);
  }
}

// ---------- Date helpers ----------

function isLeap(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function shiftYear(dateStr, delta) {
  const [y, m, d] = dateStr.split("-").map(Number);
  let newY = y + delta;
  let newD = d;
  if (m === 2 && d === 29 && !isLeap(newY)) newD = 28;
  return `${newY}-${String(m).padStart(2, "0")}-${String(newD).padStart(2, "0")}`;
}

function daysBetween(start, end) {
  const list = [];
  let cur = new Date(start + "T00:00:00Z");
  const last = new Date(end + "T00:00:00Z");
  while (cur <= last) {
    list.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return list;
}

// ---------- Weather fetching ----------

async function fetchHistoricalAverage(lat, lon, startDate, endDate, yearsBack = 10) {
  const requests = [];
  for (let i = 1; i <= yearsBack; i++) {
    const s = shiftYear(startDate, -i);
    const e = shiftYear(endDate, -i);
    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${s}&end_date=${e}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
    requests.push(
      fetch(url)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
    );
  }
  const results = await Promise.all(requests);
  const highs = [];
  const lows = [];
  let rainyDays = 0;
  let totalDays = 0;

  results.forEach((data) => {
    if (!data || !data.daily) return;
    const { temperature_2m_max, temperature_2m_min, precipitation_sum } = data.daily;
    temperature_2m_max.forEach((v, idx) => {
      if (v == null || temperature_2m_min[idx] == null) return;
      highs.push(v);
      lows.push(temperature_2m_min[idx]);
      totalDays++;
      if ((precipitation_sum[idx] || 0) >= 1) rainyDays++;
    });
  });

  if (!totalDays) return null;

  const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
  return {
    avgHigh: avg(highs),
    avgLow: avg(lows),
    diurnal: avg(highs) - avg(lows),
    precipChance: Math.round((rainyDays / totalDays) * 100),
    sampleYears: yearsBack,
    sampleDays: totalDays,
  };
}

async function fetchForecast(lat, lon, startDate, endDate) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&start_date=${startDate}&end_date=${endDate}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function daysUntil(dateStr) {
  const diff = new Date(dateStr + "T00:00:00") - new Date(todayStr + "T00:00:00");
  return Math.round(diff / 86400000);
}

// ---------- Temp bands ----------

function tempBand(avgHigh) {
  if (avgHigh < 3) return { key: "freezing", label: "한겨울 추위" };
  if (avgHigh < 10) return { key: "cold", label: "쌀쌀함" };
  if (avgHigh < 17) return { key: "cool", label: "선선함" };
  if (avgHigh < 23) return { key: "mild", label: "온화함" };
  if (avgHigh < 29) return { key: "warm", label: "더움" };
  return { key: "hot", label: "무더움" };
}

// ---------- Rendering ----------

function renderWeather(hist, forecast, cityName, homeHist) {
  const box = document.getElementById("weather-summary");
  const band = tempBand(hist.avgHigh);

  // D2: 비교 기준은 서울 고정이 아니라 접속 위치로 추정한 거주 도시
  let compareLine = "";
  if (homeHist) {
    const diff = hist.avgHigh - homeHist.avgHigh;
    const r = Math.round(diff);
    const home = T(homeCity.name);
    if (Math.abs(r) <= 2) {
      compareLine = t("cmpSame", home);
    } else if (r > 0) {
      compareLine = t("cmpWarmer", home, fmtDelta(diff));
    } else {
      compareLine = t("cmpColder", home, fmtDelta(Math.abs(diff)));
      if (diff <= -15) compareLine += t("cmpMuchColder");
    }
  }

  let forecastHtml = "";
  if (forecast && forecast.daily) {
    const fh = forecast.daily.temperature_2m_max;
    const fl = forecast.daily.temperature_2m_min;
    const avgFH = fh.reduce((a, b) => a + b, 0) / fh.length;
    const avgFL = fl.reduce((a, b) => a + b, 0) / fl.length;
    forecastHtml = `<div class="forecast-note">${esc(t("forecastNote", fmtTemp(avgFH), fmtTemp(avgFL)))}</div>`;
  }

  box.innerHTML = `
    <p class="weather-headline">${esc(t("weatherHeadline", cityName, hist.sampleYears, T(band.label)))}</p>
    <p class="weather-compare">${esc(compareLine)}</p>
    <div class="weather-grid">
      <div class="weather-stat"><span class="label">${t("statHigh")}</span><span class="value">${fmtTemp(hist.avgHigh, 1)}</span></div>
      <div class="weather-stat"><span class="label">${t("statLow")}</span><span class="value">${fmtTemp(hist.avgLow, 1)}</span></div>
      <div class="weather-stat"><span class="label">${t("statDiurnal")}</span><span class="value">${fmtDelta(hist.diurnal, 1)}</span></div>
      <div class="weather-stat"><span class="label">${t("statRain")}</span><span class="value">${hist.precipChance}%</span></div>
    </div>
    ${forecastHtml}
  `;
}

// Search-link builders. Pinterest is outfit-centric so its results are the
// cleanest; Google queries get negative keywords + photo-only filter (tbs=itp:photos)
// to cut maps/hotels/food out of image results.
const GOOGLE_NEGATIVES = "-map -hotel -restaurant -food -menu -flight -ticket -shopping -haul -지도 -호텔 -맛집";

function pinterestUrl(query) {
  return `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(query)}`;
}

function googleImagesUrl(query) {
  return `https://www.google.com/search?tbm=isch&tbs=itp:photos&q=${encodeURIComponent(query + " " + GOOGLE_NEGATIVES)}`;
}

function instagramTagUrl(tag) {
  return `https://www.instagram.com/explore/tags/${encodeURIComponent(tag)}/`;
}

// The KILLER feature: reference searches must reflect the ACTUAL temperature band
// (from 10-yr avg / forecast), not just the calendar month — month is unreliable
// for the southern hemisphere, high altitude, deserts, etc. These keywords are
// injected into every image query so results match how warm/cold it really is.
const WEATHER_SEARCH = {
  freezing: { en: "winter freezing cold heavy coat puffer outfit", ko: "겨울 두꺼운 패딩 코트" },
  cold: { en: "cold weather coat wool layered outfit", ko: "쌀쌀한 코트 레이어드" },
  cool: { en: "autumn fall light jacket layered outfit", ko: "간절기 자켓 레이어드" },
  mild: { en: "mild spring light layers outfit", ko: "봄가을 가벼운 옷" },
  warm: { en: "warm summer breathable outfit", ko: "더운 여름 옷" },
  hot: { en: "hot humid summer linen shorts outfit", ko: "무더운 여름 린넨 반팔" },
};

function renderReference(cityName, type, activity, hist) {
  const box = document.getElementById("reference-content");
  const monthName = new Date(startDateInput.value + "T00:00:00Z").toLocaleString("en-US", { month: "long" });
  const band = tempBand(hist.avgHigh);
  const w = WEATHER_SEARCH[band.key];
  const wx = w.en; // weather keywords injected into English image queries
  const bandLabel = T(band.label);
  const act = activity ? T(activity) : T("액티비티");
  const tempTag = t("refTempTag", Math.round(hist.avgLow), Math.round(hist.avgHigh));
  const weatherLine = t("refWeatherLine", tempTag, bandLabel, monthName);

  let comment = "";
  let links = [];

  if (type === "activity") {
    comment = t("refActivity", cityName, act, weatherLine);
    links = [
      { label: t("refPinHike", cityName, bandLabel), sub: t("refSubPin"), url: pinterestUrl(`${cityName} hiking ${wx} what to wear`) },
      { label: t("refGoogleHike", cityName, tempTag), sub: t("refSubGoogle", bandLabel), url: googleImagesUrl(`${cityName} ${monthName} hiking trail ${wx} ootd`) },
      { label: t("refGoogleReview", cityName), sub: t("refSubReview"), url: `https://www.google.com/search?q=${encodeURIComponent(`${cityName} ${monthName} trail what to wear ${lang === "ko" ? w.ko : wx} packing tips`)}` },
    ];
  } else if (type === "mixed") {
    comment = t("refMixed", cityName, act, weatherLine);
    links = [
      { label: t("refPinTravel", cityName, bandLabel), sub: t("refSubPin"), url: pinterestUrl(`${cityName} travel ${wx} ootd`) },
      { label: t("refPinActivity", cityName, bandLabel), sub: t("refSubPinActivity"), url: pinterestUrl(`${cityName} hiking ${wx}`) },
      { label: t("refGoogleTourist", cityName, tempTag), sub: t("refSubGoogle", bandLabel), url: googleImagesUrl(`${cityName} ${monthName} tourist ${wx} ootd what to wear`) },
    ];
  } else {
    comment = t("refCity", cityName, weatherLine);
    links = [
      { label: t("refPinTravel", cityName, bandLabel), sub: t("refSubPin"), url: pinterestUrl(`${cityName} travel ${wx} ootd`) },
      { label: t("refGoogleTourist", cityName, tempTag), sub: t("refSubGoogle", bandLabel), url: googleImagesUrl(`${cityName} ${monthName} tourist ${wx} ootd what to wear`) },
      { label: t("refGoogleStreet", cityName, bandLabel), sub: t("refSubStreet"), url: googleImagesUrl(`${cityName} street style ${wx} -runway -fashionweek`) },
    ];
  }

  // Instagram: hashtag/location exploration (API 제약으로 직접 수집 불가 → 탐색 링크)
  // 해시태그도 언어를 따라간다 — #경주여행룩 은 한국어 사용자에게만 의미가 있다.
  const igTag = cityName.replace(/\s/g, "") + (lang === "ko" ? "여행룩" : "travel");
  links.push({
    label: `Instagram — #${igTag}`,
    sub: t("refSubInsta"),
    url: instagramTagUrl(igTag),
  });

  box.innerHTML = `
    <p class="ref-comment">${comment}</p>
    <div class="ref-links">
      ${links
        .map((l) => `<a class="ref-link" href="${l.url}" target="_blank" rel="noopener">${l.label}<span>${l.sub}</span></a>`)
        .join("")}
    </div>
  `;
}

// Seeds per-day plan state (weather + recommended items) from the data, then draws.
function renderPlan(dates, hist, forecast, stylePref) {
  wardrobeState = {};
  const forecastMap = {};
  if (forecast && forecast.daily) {
    forecast.daily.time.forEach((t, idx) => {
      forecastMap[t] = {
        high: forecast.daily.temperature_2m_max[idx],
        low: forecast.daily.temperature_2m_min[idx],
        precipProb: forecast.daily.precipitation_probability_max
          ? forecast.daily.precipitation_probability_max[idx]
          : null,
      };
    });
  }

  dates.forEach((date, dayIndex) => {
    const f = forecastMap[date];
    const high = f ? f.high : hist.avgHigh;
    const low = f ? f.low : hist.avgLow;
    const band = tempBand(high);
    // 노트는 완성된 문장이 아니라 {키, 값}으로 저장한다 — 언어를 바꿔도 다시
    // 계산할 필요가 없고, 저장된 스냅샷이 특정 언어에 묶이지 않는다.
    const notes = [];
    const diurnal = high - low;
    if (diurnal >= 10) notes.push({ k: "noteDiurnal", v: Math.round(diurnal) });
    const precip = f && f.precipProb != null ? f.precipProb : hist.precipChance;
    if (precip >= 50) notes.push({ k: "noteRainHigh", v: Math.round(precip) });
    else if (precip >= 35) notes.push({ k: "noteRainMid", v: Math.round(precip) });

    wardrobeState[date] = {
      activity: "관광",
      stylePref,
      bandKey: band.key,
      bandLabel: band.label,
      dayIndex,
      high,
      low,
      source: f ? "실제 예보" : "과거 평균",
      notes,
      items: [],
    };
    seedItems(date);
  });
  rebuildEssentials();
  drawPlan();
}

// (Re)build the recommended chips for one day from its style/band/activity.
function seedItems(date) {
  const d = wardrobeState[date];
  const { items } = composeOutfit(d.stylePref, d.bandKey, d.activity, d.dayIndex, selectedPurposes, genderSelect.value);
  d.items = items.map((it) => ({ ...it, status: "own" }));
}

// 목적 칩이 바뀌면 준비물을 다시 만들되, 사용자가 직접 추가했거나 상태를 바꾼 항목은 보존
function rebuildEssentials() {
  if (!lastPlanContext) return;
  const kept = essentialsState.filter((it) => it.custom || it.status === "buy");
  const keptKeys = new Set(kept.map((it) => itemKey(it.name)));
  const fresh = buildEssentials({
    isOverseas: lastPlanContext.isOverseas,
    nights: lastPlanContext.nights,
    hist: lastPlanContext.hist,
    purposes: selectedPurposes,
  }).filter((it) => !keptKeys.has(itemKey(it.name)));
  essentialsState = [...fresh, ...kept];
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function renderTips(cityName, country, hist, type, activity) {
  const box = document.getElementById("tips-content");

  // 1) place tips: city entry first, then country fallback, then generic
  // 지오코딩이 영문 이름을 돌려주는 경우가 많아 별칭 표를 먼저 거친다
  const cityAlias = TIP_ALIASES[cityName.toLowerCase()];
  const cityKey = cityAlias || Object.keys(CITY_TIPS).find((k) => cityName.includes(k) || k.includes(cityName));
  const countryAlias = country ? COUNTRY_ALIASES[country.toLowerCase()] : null;
  const countryKey = countryAlias || (country ? Object.keys(COUNTRY_TIPS).find((k) => country.includes(k)) : null);
  let placeTips, placeTitle;
  if (cityKey && CITY_TIPS[cityKey]) {
    placeTips = CITY_TIPS[cityKey];
    placeTitle = t("tipsCityTitle", cityName);
  } else if (countryKey && COUNTRY_TIPS[countryKey]) {
    placeTips = COUNTRY_TIPS[countryKey];
    placeTitle = t("tipsCountryTitle", country, cityName);
  } else {
    placeTips = GENERIC_TIPS;
    placeTitle = t("tipsGenericTitle", cityName);
  }
  placeTips = placeTips.map(T);

  // 2) weather-driven checkpoints from the actual 10-year data
  const weatherTips = [];
  if (hist.precipChance >= 40) {
    weatherTips.push(t("tipRainHigh", hist.precipChance));
  } else if (hist.precipChance >= 25) {
    weatherTips.push(t("tipRainMid", hist.precipChance));
  }
  if (hist.diurnal >= 10) {
    weatherTips.push(t("tipDiurnal", fmtDelta(hist.diurnal)));
  }
  if (hist.avgHigh >= 28) {
    weatherTips.push(T("한낮이 매우 더워요 — 통기성 좋은 리넨·코튼 소재와 자외선 차단(모자·선크림)을 챙기세요."));
  }
  if (hist.avgLow <= 5) {
    weatherTips.push(t("tipLowTemp", fmtTemp(hist.avgLow)));
  }
  if (hist.avgHigh < 3) {
    weatherTips.push(T("한겨울 추위예요 — 장갑·목도리·모자가 체감온도를 크게 좌우해요."));
  }

  // 3) activity gear tips
  const gearTips = [];
  if (type === "activity" || type === "mixed") {
    gearTips.push(T("트레킹화는 여행 전에 미리 길들여 가세요 — 새 신발은 물집의 지름길이에요."));
    gearTips.push(t("tipGear", activity ? T(activity) : T("액티비티")));
    if (type === "mixed") gearTips.push(T("도심 일정과 액티비티 일정의 신발을 분리해서 챙기면 짐이 크게 늘지 않아요."));
  }

  const section = (title, tips) =>
    tips.length
      ? `<p class="tips-city">${esc(title)}</p><ul class="tips-list">${tips.map((x) => `<li>${x}</li>`).join("")}</ul>`
      : "";

  // 4) 선택한 여행 목적별 팁
  const purposeTips = selectedPurposes
    .filter((p) => PURPOSE_EFFECTS[p])
    .map((p) => `<b>${esc(T(p))}</b> — ${esc(T(PURPOSE_EFFECTS[p].note))}`);

  box.innerHTML =
    section(placeTitle, placeTips.map(esc)) +
    section(t("tipsWeatherTitle"), weatherTips.map(esc)) +
    section(t("tipsPurposeTitle"), purposeTips) +
    section(t("tipsGearTitle"), gearTips.map(esc));
}

// ---------- Unified day plan: recommendation + editable wardrobe chips + packing list ----------

const ACTIVITY_OPTIONS = ["관광", "식사·격식", "액티비티"];
const ACTIVITY_LABELS = { "관광": "도심 관광", "식사·격식": "식사 · 격식", "액티비티": "트레킹 · 액티비티" };
// D1: 옷 중심 4분류 → 여행 준비 전반을 담는 분류로 확장
const PACK_CATEGORIES = ["의류", "신발", "악세서리", "서류·결제", "전자기기", "상비약", "기타"];

function drawPlan() {
  const list = document.getElementById("outfit-list");
  const purposeBanner = selectedPurposes.length
    ? `<div class="purpose-notes"><span class="purpose-notes-label">${t("purposeBannerLabel")}</span><ul>${selectedPurposes
        .filter((p) => PURPOSE_EFFECTS[p])
        .map((p) => `<li><b>${esc(T(p))}</b> ${esc(T(PURPOSE_EFFECTS[p].note))}</li>`)
        .join("")}</ul></div>`
    : "";
  list.innerHTML = purposeBanner + Object.entries(wardrobeState)
    .map(([date, d]) => {
      const { line, extra } = composeOutfit(d.stylePref, d.bandKey, d.activity, d.dayIndex, selectedPurposes, genderSelect.value);
      // 이전 버전이 남긴 문자열 노트도 그대로 그릴 수 있게 둘 다 받는다
      const noteText = (n) => (typeof n === "string" ? n : t(n.k, n.v));
      const notes = [extra, ...d.notes.map(noteText)]
        .filter(Boolean)
        .map((n) => `<span>· ${esc(n)}</span>`)
        .join("<br/>");
      const options = ACTIVITY_OPTIONS.map(
        (a) => `<option value="${a}" ${a === d.activity ? "selected" : ""}>${esc(T(ACTIVITY_LABELS[a]))}</option>`
      ).join("");
      const chips = d.items
        .map((it, i) => {
          if (it.editing) {
            // 이름을 고치면 사용자 표현이 되므로, 편집 중에는 번역된 이름을 보여준다
            return `<span class="ward-chip editing"><input class="chip-input" data-date="${date}" data-idx="${i}" value="${esc(T(it.name))}" /></span>`;
          }
          const cls = it.status === "buy" ? "buy" : "own";
          const badge = t(it.status === "buy" ? "badgeBuy" : "badgeOwn");
          return `<span class="ward-chip ${cls}">
              <button class="chip-toggle" data-act="toggle" data-date="${date}" data-idx="${i}">${esc(T(it.name))} · ${badge}</button>
              <button class="chip-edit" data-act="edit" data-date="${date}" data-idx="${i}" aria-label="${t("ariaRename")}">✎</button>
              <button class="chip-remove" data-act="remove" data-date="${date}" data-idx="${i}" aria-label="${t("ariaRemove")}">✕</button>
            </span>`;
        })
        .join("");
      return `<div class="day-card">
          <div class="day-card-header">
            <span class="date-label">${date}</span>
            <span class="temp-label">${fmtTemp(d.high)} / ${fmtTemp(d.low)} · ${esc(T(d.bandLabel))} (${esc(T(d.source))})</span>
          </div>
          <select class="ward-activity" data-date="${date}">${options}</select>
          <div class="day-outfit"><span class="rec-label">${t("recBadge")}</span> <strong>${esc(line)}</strong>${notes ? "<br/>" + notes : ""}</div>
          <div class="ward-chips">${chips}</div>
          <form class="ward-add" data-date="${date}">
            <input type="text" placeholder="${t("wardAddPlaceholder")}" />
            <button type="submit">${t("addBtn")}</button>
          </form>
        </div>`;
    })
    .join("");
  drawPackingList();

  if (editingFocus) {
    const el = list.querySelector(`.chip-input[data-date="${editingFocus.date}"][data-idx="${editingFocus.idx}"]`);
    if (el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
    editingFocus = null;
  }
}

// 날짜별 옷/신발 + 여행 전체 준비물을 하나의 리스트로 병합
function buildPackingList() {
  const groups = {};
  const put = (it, date) => {
    const key = itemKey(it.name);
    if (!groups[key]) groups[key] = { name: it.name, category: it.category, status: it.status, days: new Set(), trip: false };
    if (date) groups[key].days.add(date);
    else groups[key].trip = true;
    if (it.status === "buy") groups[key].status = "buy"; // 사야 함이 우선
  };
  Object.entries(wardrobeState).forEach(([date, day]) => day.items.forEach((it) => put(it, date)));
  essentialsState.forEach((it) => put(it, null));
  return Object.values(groups);
}

function drawPackingList() {
  const box = document.getElementById("packing-list");
  const all = buildPackingList();
  const buyCount = all.filter((i) => i.status === "buy").length;
  const catOptions = PACK_CATEGORIES.map((c) => `<option value="${esc(c)}">${esc(T(c))}</option>`).join("");

  const sections = PACK_CATEGORIES.map((cat) => {
    const items = all.filter((i) => i.category === cat).sort((a, b) => b.days.size - a.days.size);
    if (!items.length) return "";
    const rows = items
      .map((i) => {
        const when = i.days.size ? t("packDays", i.days.size) : t("packTrip");
        const tag = i.status === "buy" ? ` · <b class="buy-tag">${t("packBuyTag")}</b>` : "";
        const idx = essentialsState.findIndex((e) => itemKey(e.name) === itemKey(i.name));
        const del = i.trip && idx >= 0 ? `<button class="pack-remove" data-pack-idx="${idx}" aria-label="${t("ariaRemove")}">✕</button>` : "";
        return `<li class="pack-row ${i.status}" data-pack-name="${esc(i.name)}">
            <span class="pack-name">${esc(T(i.name))}</span>
            <span class="pack-meta">${esc(when)}${tag}</span>${del}
          </li>`;
      })
      .join("");
    return `<div class="pack-group"><h4>${esc(T(cat))} (${items.length})</h4><ul>${rows}</ul></div>`;
  }).join("");

  box.innerHTML = `
    <div class="pack-head">
      <h3>${t("packTitle")}</h3>
      <span class="pack-summary">${t("packSummary", all.length, buyCount)}</span>
      <div class="pack-actions">
        <button type="button" id="pack-copy">${t("packCopy")}</button>
        <button type="button" id="pack-save">${t("packSave")}</button>
      </div>
    </div>
    ${sections || `<p class="hint">${t("packEmpty")}</p>`}
    <form class="pack-add" id="pack-add">
      <input type="text" placeholder="${t("packAddPlaceholder")}" />
      <select>${catOptions}</select>
      <button type="submit">${t("addBtn")}</button>
    </form>
  `;
  // 모든 변경(코디 수정·준비물 추가/삭제·목적 변경)은 결국 이 함수를 거치므로 여기서 스냅샷
  persistLast();
}

// 준비물 추가/삭제 (여행 전체 단위)
const packingBox = document.getElementById("packing-list");

packingBox.addEventListener("submit", (e) => {
  const form = e.target.closest("#pack-add");
  if (!form) return;
  e.preventDefault();
  const input = form.querySelector("input");
  const name = input.value.trim();
  if (!name) return;
  essentialsState.push({ name, category: form.querySelector("select").value, status: "own", custom: true });
  input.value = "";
  drawPackingList();
});

// 페르소나 10명 전원이 이미 자기 도구(시트·메모·카톡)를 쓰고 있었으므로,
// 결과를 밖으로 꺼내는 경로는 최소한 텍스트 복사 하나는 있어야 한다.
function packingListText() {
  const c = lastPlanContext;
  const head = c ? `[${c.cityName}] ${startDateInput.value} ~ ${endDateInput.value}` : t("packTitle");
  const all = buildPackingList();
  const body = PACK_CATEGORIES.map((cat) => {
    const items = all.filter((i) => i.category === cat);
    if (!items.length) return "";
    const lines = items
      .map(
        (i) =>
          `- ${T(i.name)} (${i.days.size ? t("packDays", i.days.size) : t("packTrip")}${
            i.status === "buy" ? ` · ${t("packBuyTag")}` : ""
          })`
      )
      .join("\n");
    return `\n[${T(cat)}]\n${lines}`;
  })
    .filter(Boolean)
    .join("\n");
  return `${head}\n${body}\n`;
}

async function copyPackingList(btn) {
  const text = packingListText();
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
  btn.textContent = t("packCopied");
  setTimeout(() => drawPackingList(), 1200);
}

packingBox.addEventListener("click", (e) => {
  const copy = e.target.closest("#pack-copy");
  if (copy) {
    copyPackingList(copy);
    return;
  }
  const save = e.target.closest("#pack-save");
  if (save) {
    saveCurrentTrip();
    save.textContent = t("packSaved");
    setTimeout(() => drawPackingList(), 1200);
    return;
  }
  const del = e.target.closest(".pack-remove");
  if (del) {
    essentialsState.splice(+del.dataset.packIdx, 1);
    drawPackingList();
    return;
  }
  // 항목을 누르면 보유 ↔ 사야 함 전환 (여행 단위 준비물만)
  const row = e.target.closest(".pack-row");
  if (!row) return;
  const it = essentialsState.find((x) => itemKey(x.name) === itemKey(row.dataset.packName));
  if (!it) return;
  it.status = it.status === "buy" ? "own" : "buy";
  drawPackingList();
});

// event delegation for the unified plan (recommendation + wardrobe chips)
const planList = document.getElementById("outfit-list");

planList.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-act]");
  if (!btn) return;
  const { act, date, idx } = btn.dataset;
  const day = wardrobeState[date];
  if (!day) return;
  const it = day.items[+idx];
  if (act === "toggle") it.status = it.status === "buy" ? "own" : "buy";
  else if (act === "remove") day.items.splice(+idx, 1);
  else if (act === "edit") {
    it.editing = true;
    editingFocus = { date, idx };
  }
  drawPlan();
});

planList.addEventListener("change", (e) => {
  const sel = e.target.closest(".ward-activity");
  if (!sel) return;
  const day = wardrobeState[sel.dataset.date];
  day.activity = sel.value;
  seedItems(sel.dataset.date); // 일정 성격이 바뀌면 그 날 추천 아이템을 새로 구성
  drawPlan();
});

planList.addEventListener("submit", (e) => {
  const form = e.target.closest(".ward-add");
  if (!form) return;
  e.preventDefault();
  const input = form.querySelector("input");
  const name = input.value.trim();
  if (!name) return;
  wardrobeState[form.dataset.date].items.push({ name, category: "의류", status: "own" });
  input.value = "";
  drawPlan();
});

// normalized key so "와이드 린넨 팬츠" and "와이드린넨팬츠" merge as one item
function itemKey(name) {
  return name.replace(/\s/g, "").toLowerCase();
}

// inline chip name editing — renaming propagates to ALL same-named items across
// every day, so they stay merged (e.g. 스니커즈 2일 착용 keeps counting as one).
function commitEdit(input) {
  const { date, idx } = input.dataset;
  const it = wardrobeState[date] && wardrobeState[date].items[+idx];
  if (!it || !it.editing) return;
  const v = input.value.trim();
  if (v && v !== it.name) {
    const oldKey = itemKey(it.name);
    Object.values(wardrobeState).forEach((day) => {
      day.items.forEach((other) => {
        if (other !== it && itemKey(other.name) === oldKey) other.name = v;
      });
    });
    it.name = v;
  }
  it.editing = false;
  drawPlan();
}

planList.addEventListener("keydown", (e) => {
  const input = e.target.closest(".chip-input");
  if (!input) return;
  if (e.key === "Enter") {
    e.preventDefault();
    commitEdit(input);
  } else if (e.key === "Escape") {
    const { date, idx } = input.dataset;
    wardrobeState[date].items[+idx].editing = false;
    drawPlan();
  }
});

planList.addEventListener("focusout", (e) => {
  const input = e.target.closest(".chip-input");
  if (input) commitEdit(input);
});

// ---------- Tabs ----------

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");
  });
});

// ---------- Submit ----------

submitBtn.addEventListener("click", async () => {
  errorMsg.classList.add("hidden");

  if (!selectedCity) {
    // fall back to raw text if user typed but didn't pick a suggestion
    const q = cityInput.value.trim();
    if (!q) {
      showError(t("errNoCity"));
      return;
    }
    await searchCity(q);
    showError(t("errPickCity"));
    return;
  }
  if (!startDateInput.value || !endDateInput.value) {
    showError(t("errNoDates"));
    return;
  }
  if (startDateInput.value > endDateInput.value) {
    showError(t("errDateOrder"));
    return;
  }

  const start = startDateInput.value;
  const end = endDateInput.value;
  const stylePref = styleSelect.value;

  setLoading(true, t("loadingText"));
  try {
    // 목적지가 거주 도시와 사실상 같은 곳이면 비교 자체가 무의미하므로 건너뛴다
    const nearHome =
      Math.abs(selectedCity.lat - homeCity.lat) < 0.7 && Math.abs(selectedCity.lon - homeCity.lon) < 0.7;

    const [hist, homeHist, forecast] = await Promise.all([
      fetchHistoricalAverage(selectedCity.lat, selectedCity.lon, start, end),
      nearHome ? Promise.resolve(null) : fetchHistoricalAverage(homeCity.lat, homeCity.lon, start, end),
      daysUntil(start) <= 14 ? fetchForecast(selectedCity.lat, selectedCity.lon, start, end) : Promise.resolve(null),
    ]);

    if (!hist) {
      showError(t("errNoWeather"));
      setLoading(false);
      return;
    }

    const dates = daysBetween(start, end);
    const detected = detectType(selectedCity.name);
    const activity = detected.activity;
    const country = selectedCity.country || "";
    const isOverseas = !/대한민국|South Korea|Korea/i.test(country);

    lastPlanContext = {
      hist,
      forecast,
      homeHist,
      cityName: selectedCity.name,
      country,
      activity,
      isOverseas,
      nights: Math.max(0, dates.length - 1),
    };

    renderWeather(hist, forecast, selectedCity.name, homeHist);
    renderReference(selectedCity.name, selectedType, activity, hist);
    renderPlan(dates, hist, forecast, stylePref);
    renderTips(selectedCity.name, country, hist, selectedType, activity);

    resultsSection.classList.remove("hidden");
    document.getElementById("results-empty").classList.add("hidden");
    showView("results");
  } catch (err) {
    console.error(err);
    showError(t("errFetch"));
  } finally {
    setLoading(false);
  }
});

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.remove("hidden");
  showView("search"); // 오류 문구는 검색 뷰에 있으므로 다른 뷰에서 실패해도 보이게 한다
}

function setLoading(on, text) {
  loading.classList.toggle("hidden", !on);
  if (text) loadingText.textContent = text;
  submitBtn.disabled = on;
}

// init default type buttons unselected
applyStaticI18n();
setType("city", false);
typeHint.textContent = "";
restoreLast();
