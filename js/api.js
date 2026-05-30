/**
 * api.js - 데이터 레이어
 *
 * 현재: localStorage 사용 (더미 데이터 초기 탑재)
 * 추후: Google Sheets API로 교체 예정
 *
 * Google Sheets 연동 시 필요한 설정:
 *   - SHEET_ID: Google Spreadsheet ID
 *   - API_KEY: Google Sheets API Key (읽기) 또는 OAuth2 (읽기+쓰기)
 *
 * 시트 구조:
 *   matches 시트: match_id | date | location | opponent | our_score | opp_score | result | members | summary
 *   goals 시트:   goal_id  | match_id | scorer | assist | description
 *
 *   members 컬럼: 쉼표 구분 문자열 (예: "이상재,공현웅,홍길동(용병)")
 *   용병 구분: 이름 뒤에 "(용병)" 태그 사용
 */

const STORAGE_KEY = 'tole_records_v2';

const PLAYERS = [
  "이상재","공현웅","곽상현","권이현","김강엽",
  "김용재","김우재","김종환","김준영",
  "박동민","박아론","박병현","박성순","박정수",
  "박지용","박현철","김준섭","오신근",
  "이종혁","이종호","임재빈","전기석","정승균",
  "정재훈","정진호","정환도","조병윤",
  "조현식","주상묵","최지운","정태광"
];

const DUMMY_DATA = {
  matches: [
    // ── 2024년 ──────────────────────────────────────────────────
    {
      match_id:"m001", date:"2024-01-14", location:"상암풋살파크",
      opponent:"새벽별FC", our_score:2, opp_score:1, result:"승",
      members:["이상재","공현웅","김강엽","박동민","이종혁","정승균","정재훈","조현식","주상묵","최지운","정태광"],
      summary:"새해 첫 경기를 승리로 장식했다. 후반 추가 득점이 결정적이었다."
    },
    {
      match_id:"m002", date:"2024-02-04", location:"마포체육관 풋살장",
      opponent:"드래곤킥", our_score:1, opp_score:3, result:"패",
      members:["이상재","곽상현","권이현","김우재","박아론","임재빈","전기석","정재훈","조병윤","최지운","정진호"],
      summary:"첫 번째 패배. 수비 집중력 부재가 원인이었다."
    },
    {
      match_id:"m003", date:"2024-02-25", location:"월드컵공원 풋살장",
      opponent:"서울스타즈", our_score:2, opp_score:2, result:"무",
      members:["이상재","공현웅","김강엽","김준영","박동민","이종혁","이종호","임재빈","정승균","조현식","최지운"],
      summary:""
    },
    {
      match_id:"m004", date:"2024-03-17", location:"은평실내풋살장",
      opponent:"FC 봄바람", our_score:4, opp_score:0, result:"승",
      members:["이상재","곽상현","김용재","김종환","박아론","박병현","박정수","이종호","전기석","정환도","주상묵"],
      summary:"완벽한 팀플레이로 무실점 대승. 시즌 최고의 경기였다."
    },
    {
      match_id:"m005", date:"2024-04-07", location:"상암풋살파크",
      opponent:"강남유나이티드", our_score:1, opp_score:1, result:"무",
      members:["이상재","공현웅","권이현","김강엽","김우재","박동민","박지용","오신근","이종혁","정승균","최지운"],
      summary:""
    },
    {
      match_id:"m006", date:"2024-04-28", location:"마포체육관 풋살장",
      opponent:"번개FC", our_score:3, opp_score:1, result:"승",
      members:["이상재","공현웅","곽상현","김강엽","김준영","박아론","이종혁","임재빈","정재훈","조현식","최지운"],
      summary:"빠른 역습 축구가 빛을 발한 경기."
    },
    {
      match_id:"m007", date:"2024-05-19", location:"월드컵공원 풋살장",
      opponent:"FC 바람개비", our_score:0, opp_score:2, result:"패",
      members:["공현웅","권이현","김우재","박동민","박성순","이종혁","정환도","조병윤","주상묵","최지운","김준섭"],
      summary:"무득점 완패. 공격 마무리 능력 향상이 절실하다."
    },
    {
      match_id:"m008", date:"2024-06-09", location:"은평실내풋살장",
      opponent:"레전드77", our_score:2, opp_score:0, result:"승",
      members:["이상재","곽상현","김종환","박병현","박정수","전기석","이종호","정재훈","정진호","주상묵","최지운"],
      summary:""
    },
    {
      match_id:"m009", date:"2024-07-07", location:"강서풋살센터",
      opponent:"열정맨유", our_score:3, opp_score:3, result:"무",
      members:["이상재","공현웅","김강엽","김용재","박동민","박아론","오신근","임재빈","전기석","정승균","정태광"],
      summary:"3-1 리드를 지키지 못하고 동점을 허용했다. 아쉬운 무승부."
    },
    {
      match_id:"m010", date:"2024-07-28", location:"마포체육관 풋살장",
      opponent:"FC 블랙홀", our_score:5, opp_score:2, result:"승",
      members:["이상재","공현웅","곽상현","김강엽","김우재","박동민","이종혁","정승균","정재훈","조현식","주상묵","최지운"],
      summary:"화끈한 5골 대량 득점. 공격 라인 최고의 호흡을 보여줬다."
    },
    {
      match_id:"m011", date:"2024-08-18", location:"상암풋살파크",
      opponent:"천하무적FC", our_score:2, opp_score:1, result:"승",
      members:["이상재","권이현","김강엽","김준영","박아론","박정수","임재빈","전기석","이종혁","정재훈","최지운"],
      summary:""
    },
    {
      match_id:"m012", date:"2024-09-08", location:"월드컵공원 풋살장",
      opponent:"골든보이즈", our_score:1, opp_score:2, result:"패",
      members:["이상재","공현웅","곽상현","김우재","박동민","박성순","이종호","정환도","주상묵","최지운","정태광"],
      summary:""
    },
    {
      match_id:"m013", date:"2024-09-29", location:"마포체육관 풋살장",
      opponent:"FC 가나", our_score:3, opp_score:0, result:"승",
      members:["이상재","공현웅","김강엽","김종환","박아론","이종혁","이종호","임재빈","정승균","조현식","주상묵"],
      summary:"FC 가나를 상대로 무실점 완승. 수비와 공격 모두 완벽했다."
    },
    {
      match_id:"m014", date:"2024-10-20", location:"강서풋살센터",
      opponent:"블루아이즈", our_score:0, opp_score:1, result:"패",
      members:["이상재","곽상현","권이현","김용재","김우재","박병현","박정수","전기석","정재훈","조병윤","정태광"],
      summary:""
    },
    {
      match_id:"m015", date:"2024-11-10", location:"은평실내풋살장",
      opponent:"넥스트레벨", our_score:2, opp_score:2, result:"무",
      members:["이상재","공현웅","김강엽","김준섭","박동민","오신근","이종혁","임재빈","정승균","최지운","정태광"],
      summary:""
    },
    {
      match_id:"m016", date:"2024-12-01", location:"상암풋살파크",
      opponent:"FC 나락", our_score:4, opp_score:2, result:"승",
      members:["이상재","곽상현","권이현","김우재","박아론","박정수","이종호","전기석","정재훈","조현식","최지운"],
      summary:"복수전 성공. 4골을 넣으며 시원하게 설욕했다."
    },
    {
      match_id:"m017", date:"2024-12-22", location:"마포체육관 풋살장",
      opponent:"레알마드랩", our_score:2, opp_score:1, result:"승",
      members:["이상재","공현웅","김강엽","김종환","박동민","이종혁","이종호","정승균","조현식","주상묵","정태광"],
      summary:"연말 마지막 경기를 승리로 마무리. 한 해를 좋은 결과로 마쳤다."
    },
    // ── 2025년 ──────────────────────────────────────────────────
    {
      match_id:"m018", date:"2025-01-12", location:"월드컵공원 풋살장",
      opponent:"한강유나이티드", our_score:1, opp_score:0, result:"승",
      members:["이상재","공현웅","권이현","김강엽","박동민","임재빈","전기석","정재훈","조현식","주상묵","최지운"],
      summary:"신년 첫 경기 1-0 짜릿한 승리."
    },
    {
      match_id:"m019", date:"2025-02-02", location:"강서풋살센터",
      opponent:"독수리FC", our_score:3, opp_score:1, result:"승",
      members:["이상재","곽상현","김강엽","김준영","박아론","박정수","이종혁","전기석","정승균","최지운","주상묵"],
      summary:""
    },
    {
      match_id:"m020", date:"2025-02-23", location:"상암풋살파크",
      opponent:"FC 무지개", our_score:0, opp_score:0, result:"무",
      members:["공현웅","곽상현","권이현","김용재","김우재","박동민","오신근","임재빈","정진호","조병윤","최지운"],
      summary:"극도로 부진한 무득점 경기. 전략적 재점검이 필요하다."
    },
    {
      match_id:"m021", date:"2025-03-02", location:"월드컵공원 풋살장",
      opponent:"한강유나이티드", our_score:4, opp_score:2, result:"승",
      members:["이상재","김강엽","김준영","박동민","박아론","전기석","이종혁","임재빈","정승균","최지운","주상묵","홍길동(용병)"],
      summary:"용병 홍길동의 활약이 돋보였던 경기. 팀 전체적으로 연결 플레이가 좋았다."
    },
    {
      match_id:"m022", date:"2025-03-16", location:"상암풋살파크",
      opponent:"FC 나락", our_score:1, opp_score:4, result:"패",
      members:["이상재","공현웅","권이현","김우재","박동민","박성순","정환도","주상묵","김준섭","최지운","정태광"],
      summary:"수비 조직력 붕괴로 대량 실점. 전면적인 전술 재정비가 필요하다."
    },
    {
      match_id:"m023", date:"2025-04-06", location:"마포체육관 풋살장",
      opponent:"레알마드랩", our_score:3, opp_score:1, result:"승",
      members:["이상재","곽상현","김종환","박아론","박병현","박정수","이종혁","이종호","전기석","정재훈","조병윤"],
      summary:""
    },
    {
      match_id:"m024", date:"2025-04-27", location:"상암풋살파크",
      opponent:"블루아이즈", our_score:2, opp_score:2, result:"무",
      members:["이상재","공현웅","김강엽","권이현","박지용","박현철","오신근","임재빈","정진호","조병윤","최지운"],
      summary:"후반 막판 동점 허용이 아쉬운 경기. 오신근의 활발한 움직임이 돋보였다."
    },
    {
      match_id:"m025", date:"2025-05-18", location:"마포체육관 풋살장",
      opponent:"FC 가나", our_score:5, opp_score:3, result:"승",
      members:["이상재","공현웅","곽상현","김강엽","김우재","박동민","이종혁","정승균","정재훈","조현식","주상묵"],
      summary:"전반 리드를 유지하며 후반에도 흔들리지 않은 완승. 이상재의 멀티골이 빛났다."
    },
    {
      match_id:"m026", date:"2025-06-08", location:"은평실내풋살장",
      opponent:"챔피언FC", our_score:2, opp_score:0, result:"승",
      members:["이상재","공현웅","김강엽","김준영","이종혁","임재빈","전기석","정승균","조현식","최지운","박동민"],
      summary:""
    },
    {
      match_id:"m027", date:"2025-07-20", location:"강서풋살센터",
      opponent:"FC 서울드림", our_score:1, opp_score:1, result:"무",
      members:["이상재","곽상현","권이현","김용재","박아론","박정수","이종호","정재훈","정진호","조병윤","정태광"],
      summary:""
    },
    {
      match_id:"m028", date:"2025-09-14", location:"마곡풋살파크",
      opponent:"불꽃FC", our_score:3, opp_score:2, result:"승",
      members:["이상재","공현웅","김강엽","김우재","박동민","이종혁","이종호","임재빈","정승균","최지운","주상묵"],
      summary:""
    },
    // ── 2026년 ──────────────────────────────────────────────────
    {
      match_id:"m029", date:"2026-01-11", location:"상암풋살파크",
      opponent:"윈터킥", our_score:2, opp_score:3, result:"패",
      members:["이상재","곽상현","권이현","김준영","박아론","박성순","전기석","정재훈","조현식","주상묵","최지운"],
      summary:"후반 역전 허용. 체력 관리가 숙제로 남았다."
    },
    {
      match_id:"m030", date:"2026-03-22", location:"월드컵공원 풋살장",
      opponent:"FC 봄꽃", our_score:4, opp_score:1, result:"승",
      members:["이상재","공현웅","김강엽","김종환","박동민","박정수","이종혁","정승균","정재훈","조현식","최지운","주상묵"],
      summary:"봄 시즌 화끈한 대승으로 출발. 팀 분위기가 최고조에 달했다."
    },
  ],

  goals: [
    // m001 (2-1 승)
    { goal_id:"g001", match_id:"m001", scorer:"이상재",       assist:"공현웅",  description:"오른쪽 침투 후 클린 피니시" },
    { goal_id:"g002", match_id:"m001", scorer:"정재훈",       assist:"없음",   description:"혼전 상황 침착한 마무리" },
    // m002 (1-3 패)
    { goal_id:"g003", match_id:"m002", scorer:"김우재",       assist:"이상재",  description:"후반 만회골, 빠른 스루패스 연결" },
    // m003 (2-2 무)
    { goal_id:"g004", match_id:"m003", scorer:"이상재",       assist:"이종혁",  description:"측면 침투 후 슛" },
    { goal_id:"g005", match_id:"m003", scorer:"정승균",       assist:"없음",   description:"중거리 동점골" },
    // m004 (4-0 승)
    { goal_id:"g006", match_id:"m004", scorer:"박정수",       assist:"이종호",  description:"선제 헤더" },
    { goal_id:"g007", match_id:"m004", scorer:"이상재",       assist:"없음",   description:"카운터 돌파 마무리" },
    { goal_id:"g008", match_id:"m004", scorer:"전기석",       assist:"박아론",  description:"코너킥 연결 슛" },
    { goal_id:"g009", match_id:"m004", scorer:"김종환",       assist:"전기석",  description:"쐐기 추가골" },
    // m005 (1-1 무)
    { goal_id:"g010", match_id:"m005", scorer:"공현웅",       assist:"이상재",  description:"스루패스 받아 침착하게" },
    // m006 (3-1 승)
    { goal_id:"g011", match_id:"m006", scorer:"이상재",       assist:"조현식",  description:"빠른 발놀림으로 선제" },
    { goal_id:"g012", match_id:"m006", scorer:"이종혁",       assist:"정재훈",  description:"개인 돌파 후 마무리" },
    { goal_id:"g013", match_id:"m006", scorer:"조현식",       assist:"없음",   description:"역습 쐐기골" },
    // m007 (0-2 패): 득점 없음
    // m008 (2-0 승)
    { goal_id:"g014", match_id:"m008", scorer:"박정수",       assist:"이종호",  description:"전반 선제 헤더" },
    { goal_id:"g015", match_id:"m008", scorer:"정진호",       assist:"없음",   description:"추가 마무리" },
    // m009 (3-3 무)
    { goal_id:"g016", match_id:"m009", scorer:"이종혁",       assist:"이상재",  description:"패스 연결 선제" },
    { goal_id:"g017", match_id:"m009", scorer:"정승균",       assist:"없음",   description:"중거리 추가" },
    { goal_id:"g018", match_id:"m009", scorer:"임재빈",       assist:"박동민",  description:"크로스 받아 마무리" },
    // m010 (5-2 승)
    { goal_id:"g019", match_id:"m010", scorer:"이상재",       assist:"공현웅",  description:"역습 선제골" },
    { goal_id:"g020", match_id:"m010", scorer:"김우재",       assist:"박동민",  description:"패스 연결 추가" },
    { goal_id:"g021", match_id:"m010", scorer:"이상재",       assist:"없음",   description:"독주 마무리" },
    { goal_id:"g022", match_id:"m010", scorer:"정승균",       assist:"이종혁",  description:"세트피스 헤더" },
    { goal_id:"g023", match_id:"m010", scorer:"조현식",       assist:"정재훈",  description:"역습 쐐기" },
    // m011 (2-1 승)
    { goal_id:"g024", match_id:"m011", scorer:"김강엽",       assist:"이상재",  description:"스루패스 받아 마무리" },
    { goal_id:"g025", match_id:"m011", scorer:"임재빈",       assist:"전기석",  description:"측면 크로스 연결" },
    // m012 (1-2 패)
    { goal_id:"g026", match_id:"m012", scorer:"이상재",       assist:"박동민",  description:"만회골, 역습 마무리" },
    // m013 (3-0 승)
    { goal_id:"g027", match_id:"m013", scorer:"이종혁",       assist:"이상재",  description:"선제 돌파 마무리" },
    { goal_id:"g028", match_id:"m013", scorer:"임재빈",       assist:"없음",   description:"페널티 구역 중거리" },
    { goal_id:"g029", match_id:"m013", scorer:"정승균",       assist:"조현식",  description:"쐐기 추가골" },
    // m014 (0-1 패): 득점 없음
    // m015 (2-2 무)
    { goal_id:"g030", match_id:"m015", scorer:"이상재",       assist:"정승균",  description:"역습 선제" },
    { goal_id:"g031", match_id:"m015", scorer:"박동민",       assist:"이종혁",  description:"코너킥 동점" },
    // m016 (4-2 승)
    { goal_id:"g032", match_id:"m016", scorer:"이상재",       assist:"전기석",  description:"선제 중거리" },
    { goal_id:"g033", match_id:"m016", scorer:"박정수",       assist:"이상재",  description:"패스 연결 추가" },
    { goal_id:"g034", match_id:"m016", scorer:"이종혁",       assist:"없음",   description:"발리슛 추가" },
    { goal_id:"g035", match_id:"m016", scorer:"조현식",       assist:"정재훈",  description:"쐐기 4번째 골" },
    // m017 (2-1 승)
    { goal_id:"g036", match_id:"m017", scorer:"정승균",       assist:"이상재",  description:"패스 받아 선제" },
    { goal_id:"g037", match_id:"m017", scorer:"이종혁",       assist:"공현웅",  description:"역습 결승골" },
    // m018 (1-0 승)
    { goal_id:"g038", match_id:"m018", scorer:"임재빈",       assist:"조현식",  description:"후반 결승골" },
    // m019 (3-1 승)
    { goal_id:"g039", match_id:"m019", scorer:"이상재",       assist:"전기석",  description:"선제 중거리" },
    { goal_id:"g040", match_id:"m019", scorer:"정승균",       assist:"없음",   description:"중거리 추가" },
    { goal_id:"g041", match_id:"m019", scorer:"박정수",       assist:"이종혁",  description:"쐐기 마무리" },
    // m020 (0-0 무): 득점 없음
    // m021 (4-2 승)
    { goal_id:"g042", match_id:"m021", scorer:"이상재",       assist:"전기석",  description:"전반 선제골, 오른발 중거리 슛" },
    { goal_id:"g043", match_id:"m021", scorer:"김준영",       assist:"없음",   description:"혼전 속 몸싸움 이기고 밀어넣기" },
    { goal_id:"g044", match_id:"m021", scorer:"정승균",       assist:"이상재",  description:"역습 카운터, 환상적인 스루패스 연결" },
    { goal_id:"g045", match_id:"m021", scorer:"홍길동(용병)", assist:"박동민",  description:"용병의 화려한 개인기 후 마무리" },
    // m022 (1-4 패)
    { goal_id:"g046", match_id:"m022", scorer:"주상묵",       assist:"김준섭",  description:"패배 속 유일한 득점, 중앙에서 강슛" },
    // m023 (3-1 승)
    { goal_id:"g047", match_id:"m023", scorer:"정재훈",       assist:"조병윤",  description:"코너킥 상황에서 헤더" },
    { goal_id:"g048", match_id:"m023", scorer:"박정수",       assist:"이상재",  description:"측면 크로스를 받아 발리슛" },
    { goal_id:"g049", match_id:"m023", scorer:"이종혁",       assist:"이종호",  description:"카운터어택 침투 후 마무리" },
    // m024 (2-2 무)
    { goal_id:"g050", match_id:"m024", scorer:"김강엽",       assist:"오신근",  description:"스루패스를 받아 1대1 상황 냉정하게 마무리" },
    { goal_id:"g051", match_id:"m024", scorer:"임재빈",       assist:"없음",   description:"페널티 구역 밖 중거리 강슛" },
    // m025 (5-3 승)
    { goal_id:"g052", match_id:"m025", scorer:"이상재",       assist:"공현웅",  description:"역습 상황에서 중앙 돌파 후 침착한 마무리" },
    { goal_id:"g053", match_id:"m025", scorer:"김우재",       assist:"박동민",  description:"좌측 코너 패스를 받아 오른발 슛" },
    { goal_id:"g054", match_id:"m025", scorer:"이상재",       assist:"없음",   description:"상대 실수를 놓치지 않고 빈 골대에 마무리" },
    { goal_id:"g055", match_id:"m025", scorer:"정승균",       assist:"이종혁",  description:"세트피스 상황에서 헤더 골" },
    { goal_id:"g056", match_id:"m025", scorer:"조현식",       assist:"정재훈",  description:"역습 마무리, 환상적인 마지막 찌르기" },
    // m026 (2-0 승)
    { goal_id:"g057", match_id:"m026", scorer:"이종혁",       assist:"이상재",  description:"선제 돌파 마무리" },
    { goal_id:"g058", match_id:"m026", scorer:"정승균",       assist:"임재빈",  description:"쐐기 추가골" },
    // m027 (1-1 무)
    { goal_id:"g059", match_id:"m027", scorer:"정재훈",       assist:"조병윤",  description:"후반 동점골" },
    // m028 (3-2 승)
    { goal_id:"g060", match_id:"m028", scorer:"이상재",       assist:"이종혁",  description:"선제 역습 마무리" },
    { goal_id:"g061", match_id:"m028", scorer:"김강엽",       assist:"없음",   description:"중거리 추가골" },
    { goal_id:"g062", match_id:"m028", scorer:"임재빈",       assist:"박동민",  description:"역습 결승골" },
    // m029 (2-3 패)
    { goal_id:"g063", match_id:"m029", scorer:"이상재",       assist:"조현식",  description:"선제 침투골" },
    { goal_id:"g064", match_id:"m029", scorer:"주상묵",       assist:"없음",   description:"만회 헤더" },
    // m030 (4-1 승)
    { goal_id:"g065", match_id:"m030", scorer:"이상재",       assist:"이종혁",  description:"선제 역습" },
    { goal_id:"g066", match_id:"m030", scorer:"정승균",       assist:"없음",   description:"중거리 추가" },
    { goal_id:"g067", match_id:"m030", scorer:"조현식",       assist:"이상재",  description:"패스 연결 쐐기" },
    { goal_id:"g068", match_id:"m030", scorer:"박정수",       assist:"김강엽",  description:"마지막 쐐기골" },
  ]
};

const api = {
  // ──────────────────────────────────────────────────────────────
  // 로컬 저장소 레이어 (현재 사용 중)
  // ──────────────────────────────────────────────────────────────

  _load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DUMMY_DATA));
    return DUMMY_DATA;
  },

  _save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },

  getPlayers() {
    return PLAYERS;
  },

  getMatches() {
    // 오래된 경기가 위, 최근 경기가 아래 (날짜 오름차순)
    return this._load().matches.slice().sort((a, b) => a.date.localeCompare(b.date));
  },

  getMatch(matchId) {
    return this._load().matches.find(m => m.match_id === matchId) || null;
  },

  getGoals(matchId) {
    return this._load().goals.filter(g => g.match_id === matchId);
  },

  saveMatch(matchData, goalsData) {
    const data = this._load();
    const matchId = 'm' + Date.now();
    data.matches.push({ match_id: matchId, ...matchData });

    goalsData.forEach((g, i) => {
      data.goals.push({ goal_id: 'g' + Date.now() + '_' + i, match_id: matchId, ...g });
    });

    this._save(data);
    return matchId;
  },

  // ──────────────────────────────────────────────────────────────
  // Google Sheets API 스텁 (추후 연동 시 이 함수들을 구현)
  // ──────────────────────────────────────────────────────────────

  /*
  SHEET_ID: 'YOUR_GOOGLE_SHEET_ID',
  API_KEY:  'YOUR_GOOGLE_API_KEY',
  BASE_URL: 'https://sheets.googleapis.com/v4/spreadsheets',

  async fetchMatchesFromSheets() {
    const url = `${this.BASE_URL}/${this.SHEET_ID}/values/matches!A2:I?key=${this.API_KEY}`;
    const res = await fetch(url);
    const json = await res.json();
    return (json.values || []).map(row => ({
      match_id:  row[0], date:      row[1], location:  row[2],
      opponent:  row[3], our_score: Number(row[4]), opp_score: Number(row[5]),
      result:    row[6], members:   row[7].split(','),
      summary:   row[8] || ''
    }));
  },

  async fetchGoalsFromSheets(matchId) {
    const url = `${this.BASE_URL}/${this.SHEET_ID}/values/goals!A2:E?key=${this.API_KEY}`;
    const res = await fetch(url);
    const json = await res.json();
    return (json.values || [])
      .filter(row => row[1] === matchId)
      .map(row => ({
        goal_id: row[0], match_id: row[1], scorer: row[2],
        assist:  row[3], description: row[4] || ''
      }));
  },

  async pushMatchToSheets(matchData, goalsData) {
    // OAuth2 토큰 필요 (googleapis 라이브러리 또는 서버사이드 처리 권장)
    // POST to ${this.BASE_URL}/${this.SHEET_ID}/values/matches!A:I:append
  },
  */
};
