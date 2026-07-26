// ---------- i18n ----------
// D6: 인바운드 페르소나(P3·P4·P5)는 링크는 열려도 검색어와 결과가 한국어라 읽지 못했다.
// 그래서 UI뿐 아니라 "결과 콘텐츠"(추천 아이템명·팁·목적)까지 전부 번역 대상이다.
//
// 구조는 두 갈래다.
//   TERMS — 데이터에 박혀 있는 한국어 문자열 → 영어. 상태(state)에는 한국어를 그대로
//           저장하고 그릴 때만 번역하므로, 언어를 바꿔도 저장된 리스트가 깨지지 않는다.
//   UI    — 화면 문장. 숫자·도시명이 끼어드는 문장은 함수로 두어 어순 차이를 흡수한다.

const TERMS = {
  // --- 온도 밴드 ---
  "한겨울 추위": "Freezing", "쌀쌀함": "Cold", "선선함": "Cool",
  "온화함": "Mild", "더움": "Warm", "무더움": "Hot & humid",

  // --- 준비물 분류 ---
  "의류": "Clothing", "신발": "Shoes", "악세서리": "Accessories",
  "서류·결제": "Documents & payment", "전자기기": "Electronics",
  "상비약": "Medicine", "기타": "Other",

  // --- 하루 활동 ---
  "관광": "Sightseeing", "식사·격식": "Dining / formal", "액티비티": "Trekking / activity",
  "도심 관광": "City sightseeing", "식사 · 격식": "Dining · formal", "트레킹 · 액티비티": "Trekking · activity",

  // --- 스타일 ---
  "미니멀 · 뉴트럴 톤": "Minimal · neutral tones",
  "캐주얼 · 편안함 우선": "Casual · comfort first",
  "클래식 · 단정함": "Classic · polished",
  "스트릿 · 개성 있는 룩": "Street · statement looks",

  // --- 데이터 출처 ---
  "실제 예보": "actual forecast", "과거 평균": "10-yr average",

  // --- 아우터 ---
  "무채색 롱패딩": "Neutral long puffer", "울 맥시코트": "Wool maxi coat",
  "울 코트": "Wool coat", "무스탕": "Shearling jacket", "패딩 베스트+코트": "Puffer vest + coat",
  "트렌치코트": "Trench coat", "니트 가디건": "Knit cardigan", "울 셔츠자켓": "Wool shirt jacket",
  "셔츠 자켓": "Shirt jacket", "라이트 블루종": "Light blouson", "얇은 셔츠 걸치기": "Light shirt worn open",
  "숏패딩": "Short puffer", "롱패딩": "Long puffer", "후리스 자켓": "Fleece jacket",
  "패딩 점퍼": "Puffer jacket", "코듀로이 자켓": "Corduroy jacket", "바람막이": "Windbreaker",
  "데님 자켓": "Denim jacket", "가디건": "Cardigan", "얇은 셔츠 레이어드": "Light shirt layered",
  "캐시미어 코트": "Cashmere coat", "트렌치코트+니트": "Trench coat + knit", "발마칸 코트": "Balmacaan coat",
  "블레이저": "Blazer", "얇은 블레이저": "Light blazer", "니트 걸치기": "Knit over shoulders",
  "리넨 자켓": "Linen jacket", "오버사이즈 코트": "Oversized coat", "레더 자켓+후드": "Leather jacket + hoodie",
  "스웨이드 자켓": "Suede jacket", "MA-1": "MA-1 bomber", "오버사이즈 자켓": "Oversized jacket",
  "코치 자켓": "Coach jacket", "셔츠자켓": "Shirt jacket", "오버셔츠 걸치기": "Overshirt worn open",
  "방풍 바람막이": "Windproof shell", "방수 자켓": "Waterproof jacket",

  // --- 상의 ---
  "캐시미어 니트": "Cashmere knit", "터틀넥 니트": "Turtleneck knit", "하이넥 스웨터": "High-neck sweater",
  "터틀넥": "Turtleneck", "얇은 니트+셔츠 레이어드": "Light knit over shirt",
  "셔츠": "Shirt", "얇은 니트": "Light knit", "모크넥 티": "Mock-neck tee",
  "심플 티셔츠": "Plain T-shirt", "얇은 셔츠": "Light shirt", "니트 베스트+티": "Knit vest + tee",
  "리넨 셔츠": "Linen shirt", "코튼 티셔츠": "Cotton T-shirt", "슬리브리스+셔츠": "Sleeveless + shirt",
  "루즈핏 코튼 티": "Loose cotton tee", "슬리브리스 니트": "Sleeveless knit", "리넨 반팔 셔츠": "Short-sleeve linen shirt",
  "후드티": "Hoodie", "맨투맨": "Sweatshirt", "기모 후드": "Fleece-lined hoodie",
  "니트": "Knit sweater", "스웨트셔츠": "Sweatshirt", "긴팔티": "Long-sleeve tee",
  "반팔티": "T-shirt", "피케 셔츠": "Piqué polo", "민소매": "Tank top", "메쉬 티": "Mesh tee",
  "니트+셔츠": "Knit over shirt", "폴로 니트": "Polo knit", "폴로 셔츠": "Polo shirt", "니트 폴로": "Knit polo",
  "후드 레이어드": "Layered hoodie", "니트+머플러": "Knit + scarf", "터틀넥+티 레이어드": "Turtleneck under tee",
  "그래픽 티+긴팔 레이어드": "Graphic tee over long sleeve", "그래픽 티": "Graphic tee",
  "크롭 상의 레이어드": "Layered crop top", "저지 티": "Jersey tee",
  "반팔 그래픽 티": "Graphic T-shirt", "저지 반팔": "Short-sleeve jersey",
  "탱크탑": "Tank top", "크롭 티": "Crop tee", "오버핏 반팔": "Oversized T-shirt",

  // --- 하의 ---
  "기모 와이드 팬츠": "Fleece-lined wide pants", "울 슬랙스": "Wool slacks",
  "슬랙스": "Slacks", "스트레이트 데님": "Straight denim", "스트레이트 팬츠": "Straight pants",
  "와이드 슬랙스": "Wide slacks", "와이드 팬츠": "Wide pants", "치노 팬츠": "Chinos",
  "리넨 팬츠": "Linen pants", "리넨 반바지": "Linen shorts", "와이드 리넨 팬츠": "Wide linen pants",
  "기모 청바지": "Fleece-lined jeans", "조거 팬츠": "Joggers", "청바지": "Jeans",
  "코듀로이 팬츠": "Corduroy pants", "카고팬츠": "Cargo pants", "카고 팬츠": "Cargo pants",
  "면바지": "Cotton pants", "반바지": "Shorts", "얇은 면바지": "Light cotton pants", "얇은 조거": "Light joggers",
  "플란넬 팬츠": "Flannel pants", "울 팬츠": "Wool pants", "리넨 슬랙스": "Linen slacks", "얇은 치노": "Light chinos",
  "와이드 데님": "Wide denim", "트랙 팬츠": "Track pants", "와이드 쇼츠": "Wide shorts",
  "패러슈트 팬츠": "Parachute pants", "메쉬 쇼츠": "Mesh shorts",
  "기모 롱스커트 + 두꺼운 타이츠": "Lined maxi skirt + thick tights",
  "울 미디 스커트 + 타이츠": "Wool midi skirt + tights", "미디 스커트": "Midi skirt",
  "플리츠 스커트": "Pleated skirt", "린넨 스커트": "Linen skirt", "코튼 스커트": "Cotton skirt",
  "치노 반바지": "Chino shorts", "코튼 반바지": "Cotton shorts",

  // --- 신발 ---
  "미니멀 레더 부츠": "Minimal leather boots", "첼시부츠": "Chelsea boots", "레더 스니커즈": "Leather sneakers",
  "로퍼": "Loafers", "스니커즈": "Sneakers", "샌들": "Sandals", "캔버스 스니커즈": "Canvas sneakers",
  "가벼운 스니커즈": "Lightweight sneakers", "어그부츠": "Shearling boots", "하이탑 스니커즈": "High-top sneakers",
  "스니커즈+두꺼운 양말": "Sneakers + thick socks", "워커": "Combat boots", "슬립온": "Slip-ons",
  "캔버스화": "Canvas shoes", "통풍 스니커즈": "Breathable sneakers", "가죽 부츠": "Leather boots",
  "더비 슈즈+울양말": "Derby shoes + wool socks", "더비 슈즈": "Derby shoes",
  "스웨이드 스니커즈": "Suede sneakers", "보트 슈즈": "Boat shoes", "로퍼(맨발)": "Loafers (no socks)",
  "패딩 부츠": "Padded boots", "청키 스니커즈": "Chunky sneakers", "스케이트 슈즈": "Skate shoes",
  "샌들+양말": "Sandals + socks", "앵클부츠": "Ankle boots", "플랫 슈즈": "Flats", "스트랩 샌들": "Strappy sandals",
  "트레킹화": "Hiking boots", "접지력 좋은 운동화": "Grippy trail shoes", "쿠션 좋은 운동화": "Cushioned sneakers",

  // --- 포인트 아이템 ---
  "울 자켓": "Wool jacket", "실버 액세서리": "Silver jewelry", "깔끔한 셔츠": "Crisp shirt",
  "면 자켓": "Cotton jacket", "스카프": "Scarf", "레더 자켓": "Leather jacket", "볼드 주얼리": "Bold jewelry",

  // --- 여행 목적 ---
  "미식": "Food & dining", "감성·기록": "Photos & mood", "쇼핑": "Shopping",
  "전시·문화": "Museums & culture", "야경·나이트": "Nightlife & night views",
  "트레킹·등산": "Trekking & hiking", "숲길·산책": "Forest walks", "해변·물놀이": "Beach & water",
  "캠핑": "Camping", "온천·스파": "Hot springs & spa", "리조트·호캉스": "Resort & staycation",
  "로컬 체험": "Local experiences", "격식·이벤트": "Formal events",

  // --- 목적별 노트 ---
  "좌식 식당이 있을 수 있어요 — 벗기 편한 신발과 여유 있는 허리선이 편해요. 냄새 잘 배는 소재(울·기모)는 피하세요.":
    "Some restaurants seat you on the floor — slip-off shoes and a relaxed waistband help. Avoid fabrics that hold smells (wool, fleece).",
  "사진에 남는 여행이라면 무채색 배경에 포인트 컬러 하나만 더하는 조합이 가장 잘 나와요.":
    "If the trip is about photos, a neutral base with a single accent color photographs best.",
  "피팅이 잦아요 — 탈착 쉬운 겉옷과 벗기 편한 신발을 권장해요.":
    "You'll be trying things on — pick outerwear and shoes that come off easily.",
  "전시장 냉방이 강해요 — 얇은 레이어 한 장을 가방에 넣어두세요.":
    "Galleries run their air conditioning cold — keep one thin layer in your bag.",
  "해가 진 뒤 기온이 크게 떨어져요 — 낮에 덥더라도 겉옷 하나는 필수예요.":
    "Temperatures drop sharply after sunset — bring one outer layer even if the day is warm.",
  "기능성 우선 — 땀 배출 잘 되는 이너에 방풍 아우터를 겹치세요.":
    "Function first — a moisture-wicking base layer under a windproof shell.",
  "저강도 산책이라 트레킹화는 과해요 — 쿠션 좋은 운동화면 충분해요.":
    "These are easy walks, so hiking boots are overkill — cushioned sneakers are enough.",
  "자외선이 강해요 — 속건 소재와 모자를 챙기세요.":
    "UV is strong — pack quick-drying fabrics and a hat.",
  "밤 기온이 낮보다 크게 떨어져요 — 경량 패딩 한 벌이 짐 대비 효율이 가장 좋아요.":
    "Nights are far colder than days — one lightweight puffer gives the best warmth per gram.",
  "입고 벗기 간편한 옷이 유리해요 — 복잡한 레이어드는 피하세요.":
    "Clothes you can get in and out of quickly win here — skip complicated layering.",
  "실내 냉방이 강해요 — 여름이어도 얇은 겉옷을 챙기세요.":
    "Indoor air conditioning is strong — bring a thin layer even in summer.",
  "활동성과 예의를 함께 지켜야 해요 — 과한 노출은 피하고 움직이기 편한 옷을 고르세요.":
    "You need both mobility and modesty — avoid anything revealing and choose clothes you can move in.",
  "격식 있는 일정이 있어요 — 재킷과 구두 한 벌을 별도로 준비하세요.":
    "There's a formal occasion — set aside one jacket and one pair of dress shoes.",

  // --- 준비물 ---
  "물티슈": "Wet wipes", "카메라·여분 배터리": "Camera + spare battery", "접이식 에코백": "Foldable tote",
  "등산 양말": "Hiking socks", "물통": "Water bottle", "수영복": "Swimsuit", "비치 타월": "Beach towel",
  "자외선 차단제": "Sunscreen", "경량 패딩": "Lightweight puffer", "헤드랜턴": "Headlamp",
  "여벌 속옷": "Spare underwear", "세면도구": "Toiletries", "슬리퍼": "Slippers",
  "재킷": "Jacket", "구두": "Dress shoes",
  "여권 (유효기간 6개월 이상)": "Passport (6+ months validity)", "항공권 e티켓": "Flight e-ticket",
  "해외 결제 가능 카드": "Card that works abroad", "현지 통화 현금": "Local currency in cash",
  "여행자 보험 증서": "Travel insurance certificate", "멀티 어댑터": "Universal power adapter",
  "신분증": "Photo ID", "교통·숙소 예약 확인": "Transport & lodging confirmations",
  "휴대폰 충전기": "Phone charger", "보조배터리": "Power bank",
  "상비약 (진통제·소화제·밴드)": "Basic medicine (painkillers, antacids, bandages)",
  "접이식 우산": "Folding umbrella", "보온 이너웨어": "Thermal base layer",
  "얇은 겉옷 (아침저녁용)": "Light jacket (mornings & evenings)",

  // --- 코디 코멘트 ---
  "기능성 우선 — 땀 배출 잘 되는 소재로 상의를 고르세요.":
    "Function first — choose a moisture-wicking top.",
  "도보 이동이 많다면 신발은 편한 쪽을 우선하세요.":
    "If you'll be walking a lot, prioritize comfort in your shoes.",

  // --- 거주 기준 도시 ---
  "서울": "Seoul", "도쿄": "Tokyo", "싱가포르": "Singapore", "홍콩": "Hong Kong", "타이베이": "Taipei",
  "상하이": "Shanghai", "방콕": "Bangkok", "호치민": "Ho Chi Minh City", "자카르타": "Jakarta",
  "마닐라": "Manila", "뭄바이": "Mumbai", "두바이": "Dubai", "런던": "London", "파리": "Paris",
  "베를린": "Berlin", "마드리드": "Madrid", "로마": "Rome", "뉴욕": "New York", "시카고": "Chicago",
  "덴버": "Denver", "로스앤젤레스": "Los Angeles", "토론토": "Toronto", "밴쿠버": "Vancouver",
  "시드니": "Sydney", "오클랜드": "Auckland",

  // --- 대표 활동 (자연·액티비티형 목적지) ---
  "트레킹(림 트레일 / 브라이트 엔젤 트레일)": "Trekking (Rim Trail / Bright Angel Trail)",
  "설산 하이킹 · 전망대 투어": "Snow hiking · observation decks",
  "트레킹": "Trekking", "국립공원 트레킹": "National park trekking", "레드록 하이킹": "Red rock hiking",
  "캐년 투어": "Canyon tour", "캐년 트레킹": "Canyon trekking", "사막 투어": "Desert tour",
  "폭포 관광 · 보트 투어": "Waterfall sightseeing · boat tour",
  "잉카 트레일 · 고산 트레킹": "Inca Trail · high-altitude trekking",
  "소금사막 투어": "Salt flat tour", "고산 트레킹": "High-altitude trekking",
  "로키 트레킹 · 호수 투어": "Rockies trekking · lake tours",
  "알프스 하이킹 · 패러글라이딩": "Alpine hiking · paragliding",
  "마터호른 하이킹 · 스키": "Matterhorn hiking · skiing",
  "고산 트레킹 · 케이블카 투어": "High-altitude trekking · cable cars",
  "돌로미티 트레킹": "Dolomites trekking", "국립공원 트레일 워킹": "National park trail walking",
  "열기구 투어 · 계곡 하이킹": "Hot-air balloon · valley hiking",
  "석회붕 온천 워킹": "Travertine terrace walking", "해변 · 화산 트레킹": "Beaches · volcano trekking",
  "액티비티(번지·트레킹) · 도심 관광": "Adventure sports · city sightseeing",
  "피오르드 크루즈 · 트레킹": "Fiord cruise · trekking", "산악 하이킹 · 도시 관광": "Mountain hiking · city sightseeing",
  "계단식 논 트레킹": "Rice terrace trekking", "아일랜드 호핑 · 스노클링": "Island hopping · snorkeling",
  "해변 액티비티": "Beach activities", "빙하 하이킹 · 오로라 투어": "Glacier hiking · northern lights",

  // --- 도시 팁 ---
  "성당(노트르담·사크레쾨르 등) 방문 시 어깨와 무릎을 가리는 옷을 권장합니다.":
    "Cathedrals (Notre-Dame, Sacré-Cœur) expect shoulders and knees covered.",
  "고급 레스토랑은 스마트 캐주얼 이상을 요구하는 곳이 많습니다.":
    "Many upscale restaurants require smart casual or better.",
  "지하철·관광지 소매치기가 많아 지퍼 있는 크로스백이 안전합니다.":
    "Pickpocketing is common on the metro and at sights — a zipped crossbody bag is safest.",
  "카페 테라스 문화가 발달해 저녁에는 야외 착석 대비 겉옷이 유용합니다.":
    "Terrace cafés are the norm, so an extra layer helps for sitting outside in the evening.",
  "신사·사찰에서는 과도하게 노출된 옷차림을 피하는 것이 좋습니다.":
    "At shrines and temples, avoid overly revealing clothing.",
  "장마철(6~7월)에는 접이식 우산과 발수 신발이 사실상 필수입니다.":
    "During the rainy season (June–July) a folding umbrella and water-repellent shoes are essentially required.",
  "고급 스시야·료칸은 단정한 캐주얼 이상을 기대합니다.":
    "High-end sushi counters and ryokan expect neat casual or better.",
  "식당·료칸에서 신발을 벗는 경우가 많아 깨끗한 양말을 신경 쓰세요.":
    "You'll take your shoes off often at restaurants and ryokan — bring presentable socks.",
  "사찰·신사 위주 일정이라면 하루 2만보 이상 걷게 됩니다 — 길들인 편한 신발이 필수입니다.":
    "A temple-heavy day easily passes 20,000 steps — broken-in comfortable shoes are essential.",
  "다다미·사찰 내부에서 신발을 벗는 일이 잦아 양말 상태를 신경 쓰세요.":
    "Shoes come off on tatami and inside temples, so mind the state of your socks.",
  "기모노·유카타 대여 시 안에 얇고 딱 붙는 옷을 입으면 편합니다.":
    "If you rent a kimono or yukata, thin close-fitting layers underneath are most comfortable.",
  "도톤보리 등 번화가는 캐주얼이 기본 — 격식 차릴 일이 거의 없습니다.":
    "Dotonbori and similar districts are casual by default — you'll rarely need to dress up.",
  "여름 습도가 매우 높아 통기성 좋은 소재가 중요합니다.":
    "Summer humidity is severe, so breathable fabrics matter.",
  "비가 자주 오지만 짧게 지나가는 편이라 우산보다 후드 달린 방수 자켓이 실용적입니다.":
    "Rain is frequent but brief — a hooded waterproof jacket beats an umbrella.",
  "고급 레스토랑·바는 스마트 캐주얼 드레스코드가 흔합니다.":
    "Upscale restaurants and bars commonly enforce a smart casual dress code.",
  "한여름에도 아침저녁은 쌀쌀해 얇은 니트나 자켓이 필요합니다.":
    "Even midsummer mornings and evenings are chilly — bring a light knit or jacket.",
  "파인다이닝은 재킷 착용을 요구하는 곳이 있습니다 — 예약 시 드레스코드를 확인하세요.":
    "Some fine dining rooms require a jacket — check the dress code when you book.",
  "겨울 빌딩풍이 매서워 방풍 아우터와 목도리가 체감온도를 크게 좌우합니다.":
    "Winter wind between buildings is brutal — a windproof coat and scarf change how cold it feels.",
  "지하철·거리 이동이 많아 뉴요커처럼 편한 신발 + 갈아신을 신발 조합이 일반적입니다.":
    "With this much subway and street walking, locals carry comfortable shoes plus a pair to change into.",
  "왕궁·왓프라깨우는 복장 규정이 엄격합니다 — 민소매·반바지·레깅스 입장 불가.":
    "The Grand Palace and Wat Phra Kaew enforce dress codes strictly — no sleeveless tops, shorts, or leggings.",
  "사원 방문용으로 긴 바지나 롱스커트를 하루 일정에 맞춰 준비하세요.":
    "Pack long pants or a long skirt for the day you visit temples.",
  "실내(쇼핑몰·식당) 냉방이 강해 얇은 겉옷이 있으면 좋습니다.":
    "Malls and restaurants are heavily air-conditioned — a thin layer helps.",
  "우기(5~10월) 스콜 대비 샌들이나 빨리 마르는 신발이 편합니다.":
    "For rainy-season downpours (May–Oct), sandals or quick-drying shoes are easiest.",
  "연중 고온다습 — 통기성 좋은 옷 + 실내 냉방 대비 얇은 겉옷 조합이 정석입니다.":
    "Hot and humid year-round — breathable clothes plus a thin layer for indoor AC is the standard combination.",
  "사원·모스크 방문 시 어깨와 무릎을 가려야 합니다.":
    "Temples and mosques require shoulders and knees covered.",
  "고급 루프탑 바는 스마트 캐주얼(샌들·반바지 제한)인 곳이 많습니다.":
    "Upscale rooftop bars usually require smart casual (no sandals or shorts).",
  "공공장소에서는 어깨와 무릎을 가리는 복장이 예의로 여겨집니다.":
    "In public spaces, covering shoulders and knees is considered polite.",
  "모스크 방문 시 여성은 스카프로 머리를 가려야 하는 경우가 많습니다.":
    "Mosques often require women to cover their hair with a scarf.",
  "쇼핑몰 등 실내는 냉방이 강해 얇은 겉옷을 챙기는 것이 좋습니다.":
    "Indoor spaces like malls run cold — bring a thin layer.",
  "바티칸·성당 방문 시 민소매·반바지 착용은 입장이 제한될 수 있습니다.":
    "Sleeveless tops and shorts can be refused entry at the Vatican and churches.",
  "돌길이 많아 굽 높은 신발보다는 편한 신발이 유리합니다.":
    "Cobblestones everywhere — comfortable shoes beat heels.",
  "관광지 주변 소매치기 대비 지퍼 가방이 안전합니다.":
    "Around tourist sites, a zipped bag protects against pickpockets.",
  "두오모 성당 입장 시 어깨·무릎을 가려야 합니다.":
    "Entering the Duomo requires shoulders and knees covered.",
  "돌길이 많아 쿠션 좋은 신발이 필수입니다.":
    "The cobblestones make cushioned shoes essential.",
  "다리와 계단이 많아 캐리어보다 배낭, 힐보다 플랫이 압도적으로 편합니다.":
    "With this many bridges and steps, a backpack beats a suitcase and flats beat heels by a wide margin.",
  "겨울~봄에는 아쿠아 알타(침수)가 있을 수 있어 방수 신발이 유용합니다.":
    "Acqua alta flooding is possible from winter into spring — waterproof shoes help.",
  "성당 방문 시 복장 규정(어깨·무릎)이 적용됩니다.":
    "Churches apply a dress code covering shoulders and knees.",
  "성가족성당은 어깨를 가려야 입장 가능합니다 — 얇은 스카프가 유용합니다.":
    "Sagrada Família requires covered shoulders — a thin scarf does the job.",
  "람블라스 거리 등 소매치기 최다 지역 — 앞으로 메는 가방을 권장합니다.":
    "La Rambla is a pickpocketing hotspot — wear your bag in front.",
  "해변과 시내를 오가는 일정이라면 원마일웨어 스타일이 편합니다.":
    "If you're moving between beach and city, easy one-mile-wear works best.",
  "모스크(블루모스크 등) 방문 시 여성은 머리 스카프, 남녀 모두 무릎 아래 길이가 필요합니다.":
    "At mosques such as the Blue Mosque, women need a head scarf and everyone needs below-the-knee length.",
  "보수적인 지역도 있어 과한 노출은 피하는 것이 편합니다.":
    "Some neighborhoods are conservative — modest clothing is easier.",
  "언덕과 돌길이 많아 접지력 좋은 신발이 유리합니다.":
    "Hills and cobblestones call for shoes with good grip.",
  "사원 방문 시 사롱(허리에 두르는 천)을 둘러야 합니다 — 대부분 입구에서 대여 가능합니다.":
    "Temples require a sarong around the waist — most lend them at the entrance.",
  "우기(11~3월)에는 스콜 대비 빨리 마르는 소재와 샌들이 편합니다.":
    "In the rainy season (Nov–Mar), quick-drying fabrics and sandals handle downpours best.",
  "비치클럽·파인다이닝은 스마트 캐주얼을 요구하기도 합니다.":
    "Beach clubs and fine dining may ask for smart casual.",
  "사원·성당 방문 시 어깨·무릎을 가리는 것이 예의입니다.":
    "Covering shoulders and knees is the polite norm at temples and churches.",
  "우기(9~12월) 스콜 대비 샌들과 우비가 유용합니다.":
    "For rainy-season showers (Sep–Dec), sandals and a rain poncho are useful.",
  "호이안 구시가는 돌길 — 편한 신발이 좋습니다.":
    "Hoi An's old town is cobbled — comfortable shoes are better.",
  "구시가 전체가 울퉁불퉁한 돌길입니다 — 힐은 피하고 쿠션 좋은 신발을 신으세요.":
    "The entire old town is uneven cobblestone — skip heels, wear cushioned shoes.",
  "겨울 체감온도가 낮아 모자·장갑이 큰 차이를 만듭니다.":
    "Winter feels much colder than the number — a hat and gloves make a real difference.",
  "실내외 온도차가 매우 큽니다 — 여름에도 냉방 대비 겉옷이 필요합니다.":
    "The gap between indoors and outdoors is extreme — you need a layer for AC even in summer.",
  "미쉐린 레스토랑 다수가 스마트 캐주얼 드레스코드를 운영합니다.":
    "Many Michelin restaurants here run a smart casual dress code.",
  "언덕과 계단이 많아 편한 신발이 유리합니다.":
    "Lots of hills and stairs — comfortable shoes pay off.",
  "우천이 잦아 접이식 우산을 상시 휴대하는 것이 현지 스타일입니다.":
    "Rain is frequent — locals carry a folding umbrella at all times.",
  "야시장 위주 일정은 캐주얼이 기본입니다.":
    "A night-market itinerary is casual by default.",
  "산악 날씨는 급변합니다 — 한여름에도 방풍 자켓을 배낭에 넣어 다니세요.":
    "Mountain weather turns fast — keep a windproof jacket in your pack even in midsummer.",
  "융프라우요흐 정상은 한여름에도 0도 안팎입니다 — 경량 패딩을 챙기세요.":
    "The top of Jungfraujoch hovers around 0°C even in midsummer — bring a light puffer.",
  "하루에 사계절이 있다는 곳 — 레이어링이 필수입니다.":
    "Four seasons in one day here — layering is mandatory.",
  "액티비티(번지·제트보트)는 젖을 수 있어 여벌 옷이 유용합니다.":
    "Activities like bungee and jet boats get you wet — bring a change of clothes.",

  // --- 국가 팁 ---
  "성당 방문 시 어깨·무릎을 가리는 복장이 필요합니다.": "Churches require shoulders and knees covered.",
  "관광지 소매치기 대비 지퍼 가방을 권장합니다.": "Use a zipped bag against pickpockets at tourist sites.",
  "성당·두오모 입장 시 복장 규정(어깨·무릎)이 적용됩니다.": "Churches and duomos apply a shoulders-and-knees dress code.",
  "구시가 돌길이 많아 편한 신발이 필수입니다.": "Old-town cobblestones make comfortable shoes essential.",
  "성당 방문 시 어깨를 가리는 복장이 필요합니다.": "Churches require covered shoulders.",
  "관광지 소매치기가 많아 앞으로 메는 가방이 안전합니다.": "Pickpocketing is common — wear your bag in front.",
  "신사·사찰에서는 노출이 심한 옷차림을 피하는 것이 좋습니다.": "Avoid revealing clothing at shrines and temples.",
  "식당·료칸에서 신발을 벗는 일이 많아 양말을 신경 쓰세요.": "You'll remove your shoes often — mind your socks.",
  "사원 복장 규정이 엄격합니다 — 민소매·반바지 불가인 곳이 많습니다.": "Temple dress codes are strict — sleeveless tops and shorts are often refused.",
  "실내 냉방이 강해 얇은 겉옷을 챙기세요.": "Indoor AC is strong — bring a thin layer.",
  "사원·성당 방문 시 어깨·무릎을 가리세요.": "Cover shoulders and knees at temples and churches.",
  "우기 스콜 대비 빨리 마르는 신발이 편합니다.": "Quick-drying shoes handle rainy-season downpours best.",
  "사원 방문 시 사롱 착용이 필요한 곳이 많습니다.": "Many temples require wearing a sarong.",
  "우기에는 스콜 대비 우비·샌들이 유용합니다.": "In the rainy season, a poncho and sandals are useful.",
  "모스크 방문 시 여성은 스카프, 남녀 모두 무릎을 가려야 합니다.": "Mosques require a scarf for women and covered knees for everyone.",
  "공공장소에서 어깨·무릎을 가리는 것이 예의입니다.": "Covering shoulders and knees in public is the polite norm.",
  "실내 냉방이 강해 얇은 겉옷이 필요합니다.": "Indoor AC is strong — you'll want a thin layer.",
  "수도원·교회 방문 시 복장 규정이 있습니다 — 여성은 긴 치마를 요구하는 곳도 있습니다.":
    "Monasteries and churches have dress codes — some require a long skirt for women.",
  "비가 잦아 방수 자켓이 우산보다 실용적입니다.": "Rain is frequent — a waterproof jacket is more practical than an umbrella.",
  "펍·레스토랑에 따라 스마트 캐주얼을 요구합니다.": "Some pubs and restaurants ask for smart casual.",
  "실내 냉방이 강한 편이라 여름에도 얇은 겉옷이 유용합니다.": "Indoor AC runs cold, so a thin layer helps even in summer.",
  "국립공원 일정이 있다면 레이어링과 트레킹화를 준비하세요.": "If national parks are on the itinerary, prepare layers and hiking boots.",
  "산악 날씨는 급변합니다 — 한여름에도 방풍 자켓과 경량 패딩을 챙기세요.":
    "Mountain weather changes fast — pack a windproof jacket and light puffer even in midsummer.",
  "하루에 사계절이 온다는 날씨 — 레이어링이 기본입니다.": "Four seasons in a day — layering is the baseline.",
  "자외선이 매우 강해 선크림·모자가 필수입니다.": "UV is extreme — sunscreen and a hat are essential.",
  "자외선이 매우 강합니다 — 모자와 선글라스를 챙기세요.": "UV is extreme — bring a hat and sunglasses.",
  "실내외 온도차가 커 레이어링이 기본입니다.": "The indoor/outdoor gap is large — layering is the baseline.",
  "국립공원 일정에는 방풍 자켓과 트레킹화가 필요합니다.": "National park days need a windproof jacket and hiking boots.",
  "종교 시설 방문 예정이 있다면 어깨·무릎을 가릴 수 있는 얇은 겉옷이나 스카프를 챙기세요.":
    "If religious sites are on the plan, bring a thin layer or scarf that covers shoulders and knees.",
  "격식 있는 레스토랑 예약이 있다면 스마트 캐주얼 한 벌을 별도로 준비하는 것을 권장합니다.":
    "If you have a reservation somewhere formal, set aside one smart casual outfit.",

  // --- 액티비티 팁 ---
  "트레킹화는 여행 전에 미리 길들여 가세요 — 새 신발은 물집의 지름길이에요.":
    "Break in hiking boots before the trip — new boots are the fastest route to blisters.",
  "도심 일정과 액티비티 일정의 신발을 분리해서 챙기면 짐이 크게 늘지 않아요.":
    "Keeping city shoes and activity shoes separate barely adds to your luggage.",
  "한낮이 매우 더워요 — 통기성 좋은 리넨·코튼 소재와 자외선 차단(모자·선크림)을 챙기세요.":
    "Midday heat is serious — breathable linen or cotton plus sun protection (hat, sunscreen).",
  "한겨울 추위예요 — 장갑·목도리·모자가 체감온도를 크게 좌우해요.":
    "This is deep winter cold — gloves, a scarf, and a hat drive how cold it actually feels.",
};

// 도시·국가 팁 조회는 원래 한국어 지명 키로만 맞았다. 로마자 검색이 기본이 되면서
// 지오코딩이 영문 이름을 돌려주는 경우가 많아, 영문 → 한국어 키 별칭을 둔다.
const TIP_ALIASES = {
  paris: "파리", tokyo: "도쿄", kyoto: "교토", osaka: "오사카", london: "런던",
  "new york": "뉴욕", bangkok: "방콕", singapore: "싱가포르", dubai: "두바이",
  rome: "로마", roma: "로마", florence: "피렌체", firenze: "피렌체",
  venice: "베네치아", venezia: "베네치아", barcelona: "바르셀로나",
  istanbul: "이스탄불", bali: "발리", denpasar: "발리", "da nang": "다낭",
  prague: "프라하", praha: "프라하", "hong kong": "홍콩", taipei: "타이베이",
  interlaken: "인터라켄", queenstown: "퀸스타운",
};

const COUNTRY_ALIASES = {
  france: "프랑스", italy: "이탈리아", spain: "스페인", japan: "일본",
  thailand: "태국", vietnam: "베트남", indonesia: "인도네시아",
  turkey: "튀르키예", türkiye: "튀르키예", "united arab emirates": "아랍에미리트",
  greece: "그리스", "united kingdom": "영국", "united states": "미국",
  switzerland: "스위스", "new zealand": "뉴질랜드", australia: "호주", canada: "캐나다",
};

const UI = {
  ko: {
    tagline: "그 도시, 그 날짜의 날씨에 맞춰 여행 준비물을 한 번에",
    labelCity: "여행지",
    placeholderCity: "예: 파리, 그랜드캐년, 도쿄",
    labelStart: "출발일",
    labelEnd: "도착일(귀국일)",
    labelType: "목적지 유형",
    typeCity: "도시형",
    typeActivity: "자연·액티비티형",
    typeMixed: "혼합·휴양형",
    labelPurpose: "여행 목적",
    purposeSub: "복수 선택 · 2~3개 권장",
    purposeHint: "목적에 따라 신발·아우터 추천과 준비 리스트가 달라집니다.",
    labelGender: "성별",
    genderSub: "추천 아이템 폭을 넓히는 용도예요",
    genderNone: "선택 안 함",
    genderFemale: "여성",
    genderMale: "남성",
    labelStyle: "내 스타일",
    uploadBtn: "📷 내 사진 업로드로 스타일 분석",
    uploadHint: "Phase 1은 사진의 색감·톤 기반 간단 분석이에요. Phase 2에서 AI 비전 분석으로 업그레이드됩니다.",
    submit: "여행 준비 리스트 만들기",
    tabWeather: "날씨",
    tabReference: "여행객 룩",
    tabOutfit: "여행 준비",
    tabTips: "팁",
    navSearch: "검색",
    navResults: "준비 리스트",
    navSaved: "저장",
    loadingText: "최근 10년 날씨 데이터를 불러오는 중...",
    wardrobeIntro:
      "날짜별 추천 코디와 <b>여행 준비 리스트</b>예요. 각 아이템을 눌러 <b>보유</b> / <b>사야 함</b>을 전환하고, <b>✎</b>로 이름을 내 옷에 맞게 수정할 수 있어요. 여러 날 쓰는 옷은 자동 병합되고, 여권·충전기·상비약 같은 준비물은 여행 조건에 맞춰 자동으로 채워집니다.",
    resultsEmpty: "아직 만든 준비 리스트가 없어요.<br /><b>검색</b> 탭에서 여행지와 날짜를 입력해 주세요.",
    savedEmpty: "아직 저장한 여행이 없어요.<br />준비 리스트를 만든 뒤 <b>[이 리스트 저장]</b>을 누르면 여기에 쌓입니다.",

    // 오류
    errNoCity: "여행지를 입력해 주세요.",
    errPickCity: "목록에서 여행지를 선택해 주세요.",
    errNoDates: "출발일과 도착일을 모두 입력해 주세요.",
    errDateOrder: "도착일은 출발일보다 뒤여야 해요.",
    errNoWeather: "날씨 데이터를 가져오지 못했어요. 여행지나 날짜를 다시 확인해 주세요.",
    errFetch: "데이터를 불러오는 중 오류가 발생했어요. 잠시 후 다시 시도해 주세요.",

    // 검색 제안
    noMatch: (q) => `"${q}"에 해당하는 곳을 찾지 못했어요. 영문 표기(예: Jeju, Osaka)로도 검색해 보세요.`,
    popScale: (p) => `인구 ${p >= 1e8 ? `${(p / 1e8).toFixed(1)}억` : `${Math.round(p / 10000)}만`}`,
    popSmall: "소규모 지명",
    typeAuto: (city, type) => `자동 판별: "${city}"은(는) ${type}으로 분류했어요. 필요하면 위에서 직접 바꿀 수 있어요.`,
    baseline: (city, unit) => `기준 ${city} · ${unit === "F" ? "화씨" : "섭씨"} (자동 감지)`,

    // 날씨
    weatherHeadline: (city, years, band) => `${city} · 최근 ${years}년 평균 (${band})`,
    cmpSame: (home) => `${home}의 같은 시기와 기온대가 비슷해요.`,
    cmpWarmer: (home, d) => `${home}의 같은 시기보다 평균 최고기온이 약 ${d} 높아요.`,
    cmpColder: (home, d) => `${home}의 같은 시기보다 평균 최고기온이 약 ${d} 낮아요. 아침저녁 체감은 더 쌀쌀할 수 있어요.`,
    cmpMuchColder: " 평소 옷장에 없는 두께가 필요할 수 있으니, 아래 준비 리스트에서 '사야 함'을 미리 확인하세요.",
    forecastNote: (h, l) => `출발이 2주 이내라 실제 예보도 확인했어요 — 예상 최고/최저 평균 ${h} / ${l}. 과거 평균과 크게 다르면 예보 쪽을 우선하세요.`,
    statHigh: "평균 최고기온",
    statLow: "평균 최저기온",
    statDiurnal: "일교차",
    statRain: "비 올 확률",

    // 레퍼런스
    refWeatherLine: (tempTag, band, month) =>
      `실제 기온(${tempTag}, ${band})을 검색어에 반영했어요 — 달력상 ${month}이 아니라 그 목적지가 실제로 얼마나 덥고 추운지를 기준으로 옷을 찾아요.`,
    refTempTag: (lo, hi) => `평균 ${lo}~${hi}°`,
    refActivity: (city, act, line) => `${city}은(는) 자연·액티비티형 목적지로 분류했어요. 대표 활동: ${act}. ${line}`,
    refMixed: (city, act, line) => `${city}은(는) 도심 관광과 액티비티(${act})가 함께 있는 혼합형 목적지예요. ${line}`,
    refCity: (city, line) => `${city}은(는) 도시형 목적지로 분류했어요. ${line}`,
    refPinHike: (city, band) => `Pinterest — ${city} ${band} 하이킹 룩`,
    refPinTravel: (city, band) => `Pinterest — ${city} ${band} 여행 룩`,
    refPinActivity: (city, band) => `Pinterest — ${city} ${band} 액티비티 복장`,
    refGoogleHike: (city, tag) => `구글 이미지 — ${city} 트레킹 복장 (${tag})`,
    refGoogleTourist: (city, tag) => `구글 이미지 — ${city} 여행객 옷차림 (${tag})`,
    refGoogleStreet: (city, band) => `구글 이미지 — ${city} ${band} 스트릿 스냅`,
    refGoogleReview: (city) => `구글 — ${city} 트레일 옷차림 후기`,
    refSubPin: "옷차림 콘텐츠 위주라 결과가 가장 깨끗해요",
    refSubPinActivity: "기온대에 맞는 하이킹·아웃도어 룩",
    refSubGoogle: (band) => `기온대(${band}) 키워드를 넣은 필터 검색`,
    refSubReview: "실제 다녀온 여행자들의 텍스트 후기",
    refSubStreet: "현지인 분위기 참고 (런웨이·패션위크 제외)",
    refSubInsta: "위치·해시태그로 여행객 실사용 스냅 탐색 (API 제약으로 직접 수집은 불가, 탐색 링크만 제공)",

    // 하루 계획
    recBadge: "추천",
    noteDiurnal: (d) => `일교차 ${d}° — 아침저녁용 겉옷을 따로 챙기세요.`,
    noteRainHigh: (p) => `비 확률 ${p}% — 접이식 우산과 방수 신발을 권장해요.`,
    noteRainMid: (p) => `비 확률 ${p}% — 접이식 우산을 가방에 넣어두세요.`,
    dressyPoint: (item) => `포인트: ${item}를 더해 격식을 높이세요.`,
    badgeOwn: "보유",
    badgeBuy: "사야 함",
    ariaRename: "이름 수정",
    ariaRemove: "제거",
    ariaDelete: "삭제",
    wardAddPlaceholder: "보유한 아이템 직접 추가 (예: 베이지 린넨 팬츠)",
    addBtn: "+ 추가",
    purposeBannerLabel: "선택한 여행 목적 반영",

    // 준비 리스트
    packTitle: "여행 준비 리스트",
    packSummary: (total, buy) => `총 ${total}개 · 사야 함 <b>${buy}</b>개`,
    packCopy: "텍스트 복사",
    packCopied: "복사됨 ✓",
    packSave: "이 리스트 저장",
    packSaved: "저장됨 ✓",
    packAddPlaceholder: "준비물 직접 추가 (예: 현금 3만엔)",
    packEmpty: "아직 항목이 없어요. 아래에서 준비물을 추가해 보세요.",
    packDays: (n) => `${n}일 착용`,
    packTrip: "여행 내내",
    packBuyTag: "사야 함",

    // 팁
    tipsCityTitle: (city) => `${city} 드레스코드 · 문화 팁`,
    tipsCountryTitle: (country, city) => `${country} 일반 팁 (${city} 상세 팁은 준비 중)`,
    tipsGenericTitle: (city) => `${city} 상세 팁은 아직 없어요 — 일반 가이드`,
    tipsWeatherTitle: "이번 여행 날씨 체크포인트",
    tipsPurposeTitle: "선택한 여행 목적",
    tipsGearTitle: "액티비티 준비물",
    tipRainHigh: (p) => `이 시기 비 올 확률이 ${p}%로 높아요 — 방수 신발과 접이식 우산을 기본으로 챙기세요.`,
    tipRainMid: (p) => `이 시기 비 올 확률 ${p}% — 접이식 우산 하나면 충분해요.`,
    tipDiurnal: (d) => `일교차가 평균 ${d}로 커요 — 낮 기준으로 입고 아침저녁용 겉옷을 더하는 레이어링이 정답이에요.`,
    tipLowTemp: (t) => `아침 기온이 ${t}까지 떨어져요 — 보온 이너웨어가 짐 대비 효율이 가장 좋아요.`,
    tipGear: (act) => `${act} 일정에는 방풍·방수 아우터와 땀 배출 잘 되는 이너를 조합하세요.`,

    // 저장 리스트
    savedTitle: "저장한 여행 준비",
    savedHint: "기준(성별·스타일·목적)을 바꿔 다시 검색하면 각각 따로 저장돼요.",
    savedLoad: "불러오기",
    savedGenderNone: "성별 미지정",
    savedCount: (total, buy) => `준비물 ${total}개 · 사야 함 ${buy}개`,

    // 사진 분석
    photoResult: (n, ratio, sat, style) =>
      `사진 ${n}장의 색감을 분석했어요 — 뉴트럴 톤 비중 ${ratio}%, 채도 ${sat}. <strong>${style}</strong> 스타일로 추천했어요. 아래에서 직접 바꿀 수 있어요.`,
    satHigh: "높음", satMid: "중간", satLow: "낮음",
  },

  en: {
    tagline: "Everything to pack for that city, on those dates",
    labelCity: "Destination",
    placeholderCity: "e.g. Paris, Grand Canyon, Tokyo",
    labelStart: "Departure",
    labelEnd: "Return",
    labelType: "Destination type",
    typeCity: "City",
    typeActivity: "Nature & activity",
    typeMixed: "Mixed & resort",
    labelPurpose: "Trip purpose",
    purposeSub: "Multi-select · 2–3 recommended",
    purposeHint: "Your choices change the shoe and outerwear picks and the packing list.",
    labelGender: "Gender",
    genderSub: "Only used to widen the item pool",
    genderNone: "Prefer not to say",
    genderFemale: "Female",
    genderMale: "Male",
    labelStyle: "My style",
    uploadBtn: "📷 Analyze my style from photos",
    uploadHint: "Phase 1 is a simple color and tone analysis. Phase 2 upgrades this to AI vision analysis.",
    submit: "Build my packing list",
    tabWeather: "Weather",
    tabReference: "Traveler looks",
    tabOutfit: "Packing",
    tabTips: "Tips",
    navSearch: "Search",
    navResults: "Packing list",
    navSaved: "Saved",
    loadingText: "Loading 10 years of weather data...",
    wardrobeIntro:
      "Daily outfit picks and your <b>packing list</b>. Tap an item to switch between <b>Have it</b> and <b>Need to buy</b>, and use <b>✎</b> to rename it to match what you actually own. Items worn on several days are merged automatically, and essentials like your passport, charger, and medicine are filled in from your trip details.",
    resultsEmpty: "No packing list yet.<br />Enter a destination and dates in the <b>Search</b> tab.",
    savedEmpty: "Nothing saved yet.<br />Build a packing list and press <b>[Save this list]</b> to collect it here.",

    errNoCity: "Please enter a destination.",
    errPickCity: "Please pick a destination from the list.",
    errNoDates: "Please enter both a departure and a return date.",
    errDateOrder: "The return date must come after the departure date.",
    errNoWeather: "Couldn't load weather data. Please check the destination and dates.",
    errFetch: "Something went wrong while loading data. Please try again shortly.",

    noMatch: (q) => `No place matched "${q}". Try the romanized spelling (e.g. Jeju, Osaka).`,
    popScale: (p) => (p >= 1e6 ? `pop. ${(p / 1e6).toFixed(1)}M` : `pop. ${Math.round(p / 1000)}k`),
    popSmall: "small locality",
    typeAuto: (city, type) => `Auto-detected: "${city}" was classified as ${type}. You can change it above.`,
    baseline: (city, unit) => `Baseline ${city} · ${unit === "F" ? "Fahrenheit" : "Celsius"} (auto-detected)`,

    weatherHeadline: (city, years, band) => `${city} · ${years}-year average (${band})`,
    cmpSame: (home) => `About the same as ${home} at this time of year.`,
    cmpWarmer: (home, d) => `Average highs run about ${d} warmer than ${home} at this time of year.`,
    cmpColder: (home, d) => `Average highs run about ${d} colder than ${home} at this time of year, and mornings and evenings will feel colder still.`,
    cmpMuchColder: " You may need warmth your wardrobe doesn't have — check the 'Need to buy' items in the packing list below.",
    forecastNote: (h, l) => `Departure is within two weeks, so the actual forecast is included — expected average high/low ${h} / ${l}. If it differs a lot from the historical average, trust the forecast.`,
    statHigh: "Average high",
    statLow: "Average low",
    statDiurnal: "Day/night swing",
    statRain: "Chance of rain",

    refWeatherLine: (tempTag, band, month) =>
      `Search terms reflect the real temperature (${tempTag}, ${band}) — not the calendar month of ${month}, but how warm or cold this destination actually gets.`,
    refTempTag: (lo, hi) => `avg ${lo}–${hi}°`,
    refActivity: (city, act, line) => `${city} is classified as a nature & activity destination. Typical activity: ${act}. ${line}`,
    refMixed: (city, act, line) => `${city} mixes city sightseeing with activities (${act}). ${line}`,
    refCity: (city, line) => `${city} is classified as a city destination. ${line}`,
    refPinHike: (city, band) => `Pinterest — ${city} ${band} hiking looks`,
    refPinTravel: (city, band) => `Pinterest — ${city} ${band} travel looks`,
    refPinActivity: (city, band) => `Pinterest — ${city} ${band} activity wear`,
    refGoogleHike: (city, tag) => `Google Images — ${city} trekking outfits (${tag})`,
    refGoogleTourist: (city, tag) => `Google Images — what travelers wear in ${city} (${tag})`,
    refGoogleStreet: (city, band) => `Google Images — ${city} ${band} street style`,
    refGoogleReview: (city) => `Google — ${city} trail clothing reviews`,
    refSubPin: "Outfit-focused, so the results stay clean",
    refSubPinActivity: "Hiking and outdoor looks for this temperature range",
    refSubGoogle: (band) => `Filtered search with ${band} temperature keywords`,
    refSubReview: "Written reports from travelers who actually went",
    refSubStreet: "Local everyday looks (runway and fashion week excluded)",
    refSubInsta: "Browse traveler snapshots by location and hashtag (API limits mean this is a browse link only)",

    recBadge: "Pick",
    noteDiurnal: (d) => `${d}° swing between day and night — pack a separate layer for mornings and evenings.`,
    noteRainHigh: (p) => `${p}% chance of rain — waterproof shoes and a folding umbrella recommended.`,
    noteRainMid: (p) => `${p}% chance of rain — keep a folding umbrella in your bag.`,
    dressyPoint: (item) => `Finishing touch: add ${item} to dress it up.`,
    badgeOwn: "Have it",
    badgeBuy: "Need to buy",
    ariaRename: "Rename",
    ariaRemove: "Remove",
    ariaDelete: "Delete",
    wardAddPlaceholder: "Add something you own (e.g. beige linen pants)",
    addBtn: "+ Add",
    purposeBannerLabel: "Applied from your trip purposes",

    packTitle: "Packing list",
    packSummary: (total, buy) => `${total} items · <b>${buy}</b> to buy`,
    packCopy: "Copy as text",
    packCopied: "Copied ✓",
    packSave: "Save this list",
    packSaved: "Saved ✓",
    packAddPlaceholder: "Add your own item (e.g. 30,000 yen in cash)",
    packEmpty: "Nothing here yet. Add an item below.",
    packDays: (n) => (n === 1 ? "worn 1 day" : `worn ${n} days`),
    packTrip: "whole trip",
    packBuyTag: "need to buy",

    tipsCityTitle: (city) => `${city} — dress code & culture`,
    tipsCountryTitle: (country, city) => `General tips for ${country} (${city} specifics coming soon)`,
    tipsGenericTitle: (city) => `No ${city}-specific tips yet — general guidance`,
    tipsWeatherTitle: "Weather checkpoints for this trip",
    tipsPurposeTitle: "Your trip purposes",
    tipsGearTitle: "Activity gear",
    tipRainHigh: (p) => `Rain is likely this time of year (${p}%) — treat waterproof shoes and a folding umbrella as defaults.`,
    tipRainMid: (p) => `${p}% chance of rain this time of year — one folding umbrella is enough.`,
    tipDiurnal: (d) => `The day/night swing averages ${d} — dress for the afternoon and add a layer for mornings and evenings.`,
    tipLowTemp: (t) => `Mornings drop to ${t} — a thermal base layer gives the most warmth for the space it takes.`,
    tipGear: (act) => `For ${act}, combine a windproof or waterproof shell with a moisture-wicking base layer.`,

    savedTitle: "Saved trips",
    savedHint: "Search again with different settings (gender, style, purpose) and each result is saved separately.",
    savedLoad: "Load",
    savedGenderNone: "gender not set",
    savedCount: (total, buy) => `${total} items · ${buy} to buy`,

    photoResult: (n, ratio, sat, style) =>
      `Analyzed the colors in ${n} photo${n === 1 ? "" : "s"} — ${ratio}% neutral tones, ${sat} saturation. Recommended the <strong>${style}</strong> style. You can change it below.`,
    satHigh: "high", satMid: "medium", satLow: "low",
  },
};
