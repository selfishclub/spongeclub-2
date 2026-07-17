// ---------- Constants ----------

const REFERENCE_CITY = { name: "서울", lat: 37.5665, lon: 126.9780 };

// Korean → English aliases for destinations (mostly POIs / nature spots) that
// Open-Meteo geocoding fails to match with a Korean query.
const KOREAN_ALIASES = {
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

function pick(arr, n) {
  return arr[((n % arr.length) + arr.length) % arr.length];
}

function composeOutfit(stylePref, bandKey, activity, dayIndex) {
  const pool = OUTFIT_POOLS[stylePref][bandKey];
  let outer = pick(pool.outer, dayIndex);
  const top = pick(pool.top, dayIndex);
  const bottom = pick(pool.bottom, dayIndex + 1);
  let shoes = pick(pool.shoes, dayIndex);
  let extra = "";

  if (activity === "액티비티") {
    outer = pick(ACTIVITY_GEAR.outer, dayIndex);
    shoes = pick(ACTIVITY_GEAR.shoes, dayIndex);
    extra = "기능성 우선 — 땀 배출 잘 되는 소재로 상의를 고르세요.";
  } else if (activity === "식사·격식") {
    extra = `포인트: ${pick(DRESSY_POINTS[stylePref], dayIndex)}를 더해 격식을 높이세요.`;
  } else {
    extra = "도보 이동이 많다면 신발은 편한 쪽을 우선하세요.";
  }

  const parts = [outer, top, bottom].filter(Boolean).join(" + ");
  return { line: `${parts}, ${shoes}`, extra };
}

// ---------- State ----------

let selectedCity = null; // { name, lat, lon, country }
let selectedType = "city";
let geocodeTimer = null;

// ---------- DOM ----------

const cityInput = document.getElementById("city-input");
const suggestionsBox = document.getElementById("city-suggestions");
const startDateInput = document.getElementById("start-date");
const endDateInput = document.getElementById("end-date");
const typeToggle = document.getElementById("type-toggle");
const typeHint = document.getElementById("type-hint");
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
  typeHint.textContent = auto
    ? `자동 판별: "${selectedCity ? selectedCity.name : ""}"은(는) ${typeLabel(type)}으로 분류했어요. 필요하면 위에서 직접 바꿀 수 있어요.`
    : "";
}

function typeLabel(type) {
  return type === "activity" ? "자연·액티비티형" : type === "mixed" ? "혼합형" : "도시형";
}

typeToggle.addEventListener("click", (e) => {
  const btn = e.target.closest(".type-btn");
  if (!btn) return;
  setType(btn.dataset.type, false);
});

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

async function geocode(q, lang) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=${lang}&format=json`;
  const res = await fetch(url);
  const data = await res.json();
  return data.results || [];
}

function resolveAlias(q) {
  const norm = q.replace(/\s/g, "").toLowerCase();
  for (const [k, v] of Object.entries(KOREAN_ALIASES)) {
    const key = k.toLowerCase();
    if (norm.includes(key) || (norm.length >= 2 && key.startsWith(norm))) return v;
  }
  return null;
}

async function searchCity(q) {
  try {
    let results = await geocode(q, "ko");
    // Korean POI names (그랜드캐년 등) often miss — retry with English alias, then English search
    if (!results.length) {
      const alias = resolveAlias(q);
      if (alias) results = await geocode(alias, "ko");
    }
    if (!results.length) results = await geocode(q, "en");
    renderSuggestions(results);
  } catch (err) {
    suggestionsBox.classList.add("hidden");
  }
}

function renderSuggestions(results) {
  if (!results.length) {
    suggestionsBox.classList.add("hidden");
    return;
  }
  suggestionsBox.innerHTML = "";
  results.forEach((r) => {
    const div = document.createElement("div");
    div.className = "suggestion-item";
    const region = [r.admin1, r.country].filter(Boolean).join(", ");
    div.textContent = region ? `${r.name} (${region})` : r.name;
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
  styleAnalysis.innerHTML = `
    사진 ${files.length}장의 색감을 분석했어요 — 뉴트럴 톤 비중 ${Math.round(neutralRatio * 100)}%, 채도 ${avgSat > 0.45 ? "높음" : avgSat > 0.25 ? "중간" : "낮음"}.
    <strong>${STYLE_LABELS[style]}</strong> 스타일로 추천했어요. 아래에서 직접 바꿀 수 있어요.
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

function renderWeather(hist, forecast, cityName, seoulHist) {
  const box = document.getElementById("weather-summary");
  const band = tempBand(hist.avgHigh);

  let compareLine = "";
  if (seoulHist) {
    const diff = Math.round(hist.avgHigh - seoulHist.avgHigh);
    if (Math.abs(diff) <= 2) {
      compareLine = `서울의 같은 시기와 기온대가 비슷해요.`;
    } else if (diff > 0) {
      compareLine = `서울의 같은 시기보다 평균 최고기온이 약 ${diff}도 높아요.`;
    } else {
      compareLine = `서울의 같은 시기보다 평균 최고기온이 약 ${Math.abs(diff)}도 낮아요. 아침저녁 체감은 더 쌀쌀할 수 있어요.`;
    }
  }

  let forecastHtml = "";
  if (forecast && forecast.daily) {
    const fh = forecast.daily.temperature_2m_max;
    const fl = forecast.daily.temperature_2m_min;
    const avgFH = Math.round(fh.reduce((a, b) => a + b, 0) / fh.length);
    const avgFL = Math.round(fl.reduce((a, b) => a + b, 0) / fl.length);
    forecastHtml = `<div class="forecast-note">출발이 2주 이내라 실제 예보도 확인했어요 — 예상 최고/최저 평균 ${avgFH}° / ${avgFL}°. 과거 평균과 크게 다르면 예보 쪽을 우선하세요.</div>`;
  }

  box.innerHTML = `
    <p class="weather-headline">${cityName} · 최근 ${hist.sampleYears}년 평균 (${band.label})</p>
    <p class="weather-compare">${compareLine}</p>
    <div class="weather-grid">
      <div class="weather-stat"><span class="label">평균 최고기온</span><span class="value">${hist.avgHigh.toFixed(1)}°C</span></div>
      <div class="weather-stat"><span class="label">평균 최저기온</span><span class="value">${hist.avgLow.toFixed(1)}°C</span></div>
      <div class="weather-stat"><span class="label">일교차</span><span class="value">${hist.diurnal.toFixed(1)}°C</span></div>
      <div class="weather-stat"><span class="label">비 올 확률</span><span class="value">${hist.precipChance}%</span></div>
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

function renderReference(cityName, type, activity, hist) {
  const box = document.getElementById("reference-content");
  const monthName = new Date(startDateInput.value + "T00:00:00Z").toLocaleString("en-US", { month: "long" });
  const band = tempBand(hist.avgHigh);

  let comment = "";
  let links = [];

  if (type === "activity") {
    comment = `${cityName}은(는) 자연·액티비티형 목적지로 분류했어요. 대표 활동: ${activity || "액티비티"}. 이 시기 평균 기온대(${band.label})를 감안하면 여행객들은 레이어드와 기능성 아우터를 기본으로 챙기는 경우가 많아요.`;
    links = [
      { label: `Pinterest — ${cityName} 하이킹 룩`, sub: "옷차림 콘텐츠 위주라 결과가 가장 깨끗해요", url: pinterestUrl(`${cityName} hiking outfit what to wear`) },
      { label: `구글 이미지 — ${cityName} ${monthName} 트레킹 복장`, sub: "지도·호텔·음식 이미지를 제외한 필터 검색", url: googleImagesUrl(`${cityName} ${monthName} hiking trail outfit ootd`) },
      { label: `구글 — ${cityName} 트레일 옷차림 후기`, sub: "실제 다녀온 여행자들의 텍스트 후기", url: `https://www.google.com/search?q=${encodeURIComponent(cityName + " trail what to wear packing tips")}` },
    ];
  } else if (type === "mixed") {
    comment = `${cityName}은(는) 도심 관광과 액티비티(${activity || "액티비티"})가 함께 있는 혼합형 목적지예요. 일정 성격에 따라 코디를 나눠 준비하는 걸 추천해요.`;
    links = [
      { label: `Pinterest — ${cityName} ${monthName} 여행 룩`, sub: "옷차림 콘텐츠 위주라 결과가 가장 깨끗해요", url: pinterestUrl(`${cityName} ${monthName} travel outfit ootd`) },
      { label: `Pinterest — ${cityName} 액티비티 복장`, sub: "하이킹·아웃도어 룩 참고", url: pinterestUrl(`${cityName} hiking outfit`) },
      { label: `구글 이미지 — ${cityName} ${monthName} 여행객 옷차림`, sub: "지도·호텔·음식 이미지를 제외한 필터 검색", url: googleImagesUrl(`${cityName} ${monthName} tourist outfit ootd what to wear`) },
    ];
  } else {
    comment = `${cityName}은(는) 도시형 목적지로 분류했어요. 이 시기(${band.label}) 여행객들은 레이어드를 기본으로 하고, 현지 분위기에 맞추려면 신발이 포인트가 되는 경우가 많아요.`;
    links = [
      { label: `Pinterest — ${cityName} ${monthName} 여행 룩`, sub: "옷차림 콘텐츠 위주라 결과가 가장 깨끗해요", url: pinterestUrl(`${cityName} ${monthName} travel outfit ootd`) },
      { label: `구글 이미지 — ${cityName} ${monthName} 여행객 옷차림`, sub: "지도·호텔·음식 이미지를 제외한 필터 검색", url: googleImagesUrl(`${cityName} ${monthName} tourist outfit ootd what to wear`) },
      { label: `구글 이미지 — ${cityName} 스트릿 스냅`, sub: "현지인 분위기 참고 (런웨이·패션위크 제외)", url: googleImagesUrl(`${cityName} street style ${monthName} -runway -fashionweek`) },
    ];
  }

  box.innerHTML = `
    <p class="ref-comment">${comment}</p>
    <div class="ref-links">
      ${links
        .map((l) => `<a class="ref-link" href="${l.url}" target="_blank" rel="noopener">${l.label}<span>${l.sub}</span></a>`)
        .join("")}
    </div>
  `;
}

function renderOutfits(dates, hist, forecast, stylePref) {
  const list = document.getElementById("outfit-list");
  list.innerHTML = "";

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
    const dayForecast = forecastMap[date];
    const high = dayForecast ? dayForecast.high : hist.avgHigh;
    const low = dayForecast ? dayForecast.low : hist.avgLow;
    const band = tempBand(high);
    const source = dayForecast ? "실제 예보" : "과거 평균";

    const weatherNotes = [];
    const diurnal = high - low;
    if (diurnal >= 10) {
      weatherNotes.push(`일교차 ${Math.round(diurnal)}° — 아침저녁용 겉옷을 따로 챙기세요.`);
    }
    const precipProb = dayForecast && dayForecast.precipProb != null ? dayForecast.precipProb : hist.precipChance;
    if (precipProb >= 50) {
      weatherNotes.push(`비 확률 ${Math.round(precipProb)}% — 접이식 우산과 방수 신발을 권장해요.`);
    } else if (precipProb >= 35) {
      weatherNotes.push(`비 확률 ${Math.round(precipProb)}% — 접이식 우산을 가방에 넣어두세요.`);
    }

    const card = document.createElement("div");
    card.className = "day-card";
    card.innerHTML = `
      <div class="day-card-header">
        <span class="date-label">${date}</span>
        <span class="temp-label">${Math.round(high)}° / ${Math.round(low)}° · ${band.label} (${source})</span>
      </div>
      <select class="activity-select" data-date="${date}">
        <option value="관광">도심 관광</option>
        <option value="식사·격식">식사 · 격식 있는 자리</option>
        <option value="액티비티">트레킹 · 액티비티</option>
      </select>
      <div class="day-outfit" data-outfit-for="${date}"></div>
    `;
    list.appendChild(card);

    const select = card.querySelector(".activity-select");
    const outfitDiv = card.querySelector(".day-outfit");
    const updateOutfit = () => {
      const { line, extra } = composeOutfit(stylePref, band.key, select.value, dayIndex);
      const notes = [extra, ...weatherNotes].map((n) => `<span>· ${n}</span>`).join("<br/>");
      outfitDiv.innerHTML = `<strong>${line}</strong><br/>${notes}`;
    };
    select.addEventListener("change", updateOutfit);
    updateOutfit();
  });
}

function renderTips(cityName, country, hist, type, activity) {
  const box = document.getElementById("tips-content");

  // 1) place tips: city entry first, then country fallback, then generic
  const cityKey = Object.keys(CITY_TIPS).find((k) => cityName.includes(k) || k.includes(cityName));
  const countryKey = country ? Object.keys(COUNTRY_TIPS).find((k) => country.includes(k)) : null;
  let placeTips, placeTitle;
  if (cityKey) {
    placeTips = CITY_TIPS[cityKey];
    placeTitle = `${cityName} 드레스코드 · 문화 팁`;
  } else if (countryKey) {
    placeTips = COUNTRY_TIPS[countryKey];
    placeTitle = `${country} 일반 팁 (${cityName} 상세 팁은 준비 중)`;
  } else {
    placeTips = GENERIC_TIPS;
    placeTitle = `${cityName} 상세 팁은 아직 없어요 — 일반 가이드`;
  }

  // 2) weather-driven checkpoints from the actual 10-year data
  const weatherTips = [];
  if (hist.precipChance >= 40) {
    weatherTips.push(`이 시기 비 올 확률이 ${hist.precipChance}%로 높아요 — 방수 신발과 접이식 우산을 기본으로 챙기세요.`);
  } else if (hist.precipChance >= 25) {
    weatherTips.push(`이 시기 비 올 확률 ${hist.precipChance}% — 접이식 우산 하나면 충분해요.`);
  }
  if (hist.diurnal >= 10) {
    weatherTips.push(`일교차가 평균 ${hist.diurnal.toFixed(0)}°로 커요 — 낮 기준으로 입고 아침저녁용 겉옷을 더하는 레이어링이 정답이에요.`);
  }
  if (hist.avgHigh >= 28) {
    weatherTips.push("한낮이 매우 더워요 — 통기성 좋은 리넨·코튼 소재와 자외선 차단(모자·선크림)을 챙기세요.");
  }
  if (hist.avgLow <= 5) {
    weatherTips.push(`아침 기온이 ${hist.avgLow.toFixed(0)}°까지 떨어져요 — 보온 이너웨어가 짐 대비 효율이 가장 좋아요.`);
  }
  if (hist.avgHigh < 3) {
    weatherTips.push("한겨울 추위예요 — 장갑·목도리·모자가 체감온도를 크게 좌우해요.");
  }

  // 3) activity gear tips
  const gearTips = [];
  if (type === "activity" || type === "mixed") {
    gearTips.push("트레킹화는 여행 전에 미리 길들여 가세요 — 새 신발은 물집의 지름길이에요.");
    gearTips.push(`${activity || "액티비티"} 일정에는 방풍·방수 아우터와 땀 배출 잘 되는 이너를 조합하세요.`);
    if (type === "mixed") gearTips.push("도심 일정과 액티비티 일정의 신발을 분리해서 챙기면 짐이 크게 늘지 않아요.");
  }

  const section = (title, tips) =>
    tips.length ? `<p class="tips-city">${title}</p><ul class="tips-list">${tips.map((t) => `<li>${t}</li>`).join("")}</ul>` : "";

  box.innerHTML =
    section(placeTitle, placeTips) +
    section("이번 여행 날씨 체크포인트", weatherTips) +
    section("액티비티 준비물", gearTips);
}

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
      showError("여행지를 입력해 주세요.");
      return;
    }
    await searchCity(q);
    showError("목록에서 여행지를 선택해 주세요.");
    return;
  }
  if (!startDateInput.value || !endDateInput.value) {
    showError("출발일과 도착일을 모두 입력해 주세요.");
    return;
  }
  if (startDateInput.value > endDateInput.value) {
    showError("도착일은 출발일보다 뒤여야 해요.");
    return;
  }

  const start = startDateInput.value;
  const end = endDateInput.value;
  const stylePref = styleSelect.value;

  setLoading(true, "최근 10년 날씨 데이터를 불러오는 중...");
  try {
    const [hist, seoulHist, forecast] = await Promise.all([
      fetchHistoricalAverage(selectedCity.lat, selectedCity.lon, start, end),
      selectedCity.name !== REFERENCE_CITY.name
        ? fetchHistoricalAverage(REFERENCE_CITY.lat, REFERENCE_CITY.lon, start, end)
        : Promise.resolve(null),
      daysUntil(start) <= 14 ? fetchForecast(selectedCity.lat, selectedCity.lon, start, end) : Promise.resolve(null),
    ]);

    if (!hist) {
      showError("날씨 데이터를 가져오지 못했어요. 여행지나 날짜를 다시 확인해 주세요.");
      setLoading(false);
      return;
    }

    const dates = daysBetween(start, end);
    const detected = detectType(selectedCity.name);
    const activity = detected.activity;

    renderWeather(hist, forecast, selectedCity.name, seoulHist);
    renderReference(selectedCity.name, selectedType, activity, hist);
    renderOutfits(dates, hist, forecast, stylePref);
    renderTips(selectedCity.name, selectedCity.country, hist, selectedType, activity);

    resultsSection.classList.remove("hidden");
    resultsSection.scrollIntoView({ behavior: "smooth" });
  } catch (err) {
    console.error(err);
    showError("데이터를 불러오는 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.");
  } finally {
    setLoading(false);
  }
});

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.classList.remove("hidden");
}

function setLoading(on, text) {
  loading.classList.toggle("hidden", !on);
  if (text) loadingText.textContent = text;
  submitBtn.disabled = on;
}

// init default type buttons unselected
setType("city", false);
typeHint.textContent = "";
