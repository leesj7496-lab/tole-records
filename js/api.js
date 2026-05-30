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

const STORAGE_KEY = 'tole_records_v1';

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
    {
      match_id: "m001",
      date: "2025-05-18",
      location: "마포체육관 풋살장",
      opponent: "FC 가나",
      our_score: 5,
      opp_score: 3,
      result: "승",
      members: ["이상재","공현웅","곽상현","김강엽","김우재","박동민","이종혁","정승균","정재훈","조현식","주상묵"],
      summary: "전반 리드를 유지하며 후반에도 흔들리지 않은 완승. 이상재의 멀티골이 빛났다."
    },
    {
      match_id: "m002",
      date: "2025-04-27",
      location: "상암풋살파크",
      opponent: "블루아이즈",
      our_score: 2,
      opp_score: 2,
      result: "무",
      members: ["이상재","공현웅","김강엽","권이현","박지용","박현철","오신근","임재빈","정진호","조병윤","최지운"],
      summary: "후반 막판 동점 허용이 아쉬운 경기. 오신근의 활발한 움직임이 돋보였다."
    },
    {
      match_id: "m003",
      date: "2025-04-06",
      location: "마포체육관 풋살장",
      opponent: "레알마드랩",
      our_score: 3,
      opp_score: 1,
      result: "승",
      members: ["이상재","곽상현","김종환","박아론","박병현","박정수","이종혁","이종호","전기석","정재훈","조병윤"],
      summary: ""
    },
    {
      match_id: "m004",
      date: "2025-03-16",
      location: "상암풋살파크",
      opponent: "FC 나락",
      our_score: 1,
      opp_score: 4,
      result: "패",
      members: ["이상재","공현웅","권이현","김우재","박동민","박성순","정환도","주상묵","김준섭","최지운","정태광"],
      summary: "수비 조직력 붕괴로 대량 실점. 전면적인 전술 재정비가 필요하다."
    },
    {
      match_id: "m005",
      date: "2025-03-02",
      location: "월드컵공원 풋살장",
      opponent: "한강유나이티드",
      our_score: 4,
      opp_score: 2,
      result: "승",
      members: ["이상재","김강엽","김준영","박동민","박아론","전기석","이종혁","임재빈","정승균","최지운","주상묵","홍길동(용병)"],
      summary: "용병 홍길동의 활약이 돋보였던 경기. 팀 전체적으로 연결 플레이가 좋았다."
    }
  ],
  goals: [
    { goal_id: "g001", match_id: "m001", scorer: "이상재",      assist: "공현웅",  description: "역습 상황에서 중앙 돌파 후 침착한 마무리" },
    { goal_id: "g002", match_id: "m001", scorer: "김우재",      assist: "박동민",  description: "좌측 코너 패스를 받아 오른발 슛" },
    { goal_id: "g003", match_id: "m001", scorer: "이상재",      assist: "없음",    description: "상대 실수를 놓치지 않고 빈 골대에 마무리" },
    { goal_id: "g004", match_id: "m001", scorer: "정승균",      assist: "이종혁",  description: "세트피스 상황에서 헤더 골" },
    { goal_id: "g005", match_id: "m001", scorer: "조현식",      assist: "정재훈",  description: "역습 마무리, 환상적인 마지막 찌르기" },
    { goal_id: "g006", match_id: "m002", scorer: "김강엽",      assist: "오신근",  description: "스루패스를 받아 1대1 상황 냉정하게 마무리" },
    { goal_id: "g007", match_id: "m002", scorer: "임재빈",      assist: "없음",    description: "페널티 구역 밖 중거리 강슛" },
    { goal_id: "g008", match_id: "m003", scorer: "정재훈",      assist: "조병윤",  description: "코너킥 상황에서 헤더" },
    { goal_id: "g009", match_id: "m003", scorer: "박정수",      assist: "이상재",  description: "측면 크로스를 받아 발리슛" },
    { goal_id: "g010", match_id: "m003", scorer: "이종혁",      assist: "이종호",  description: "카운터어택 침투 후 마무리" },
    { goal_id: "g011", match_id: "m004", scorer: "주상묵",      assist: "김준섭",  description: "패배 속 유일한 득점, 중앙에서 강슛" },
    { goal_id: "g012", match_id: "m005", scorer: "이상재",      assist: "전기석",  description: "전반 선제골, 오른발 중거리 슛" },
    { goal_id: "g013", match_id: "m005", scorer: "김준영",      assist: "없음",    description: "혼전 속 몸싸움 이기고 밀어넣기" },
    { goal_id: "g014", match_id: "m005", scorer: "정승균",      assist: "이상재",  description: "역습 카운터, 환상적인 스루패스 연결" },
    { goal_id: "g015", match_id: "m005", scorer: "홍길동(용병)", assist: "박동민",  description: "용병의 화려한 개인기 후 마무리" }
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
    return this._load().matches.slice().sort((a, b) => b.date.localeCompare(a.date));
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
