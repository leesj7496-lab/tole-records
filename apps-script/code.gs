/**
 * FC 똘레랑스 기록실 — Google Apps Script API
 *
 * 스프레드시트: https://docs.google.com/spreadsheets/d/18Wu44N_fUD8oVIpYCsVb8fi9jWn-vPqOKSLwGPEyPVo
 *
 * ─────────────────────────────────────────────────────────────
 * POST CORS 우회 방법 (브라우저 → GAS 직접 POST 시 주의사항)
 *   GAS 웹앱은 브라우저의 CORS preflight(OPTIONS)를 처리하지 않습니다.
 *   POST 요청 시 Content-Type을 'text/plain'으로 전송하면 preflight 없이
 *   Simple Request로 처리되어 CORS 오류를 우회할 수 있습니다.
 *   → api.js의 pushMatchToSheets() 구현 시 이 방식을 사용하세요.
 * ─────────────────────────────────────────────────────────────
 */

// ── 상수 ──────────────────────────────────────────────────────────

const SS_ID = '18Wu44N_fUD8oVIpYCsVb8fi9jWn-vPqOKSLwGPEyPVo';

const SH = {
  MATCHES: 'matches',
  GOALS:   'goals'
};

const HEADERS = {
  matches: ['match_id','date','location','opponent','our_score','opp_score','result','members','summary'],
  goals:   ['goal_id','match_id','scorer','assist','description']
};

// ── 응답 헬퍼 ──────────────────────────────────────────────────────

function jsonOk(data) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, data: data }))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonErr(message) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: false, error: message }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── 시트 헬퍼 ──────────────────────────────────────────────────────

function openSS() {
  return SpreadsheetApp.openById(SS_ID);
}

function getSheet(name) {
  return openSS().getSheetByName(name);
}

/**
 * 시트 데이터를 오브젝트 배열로 변환 (1행 = 헤더)
 */
function sheetToObjects(sheetName) {
  var sh   = getSheet(sheetName);
  var data = sh.getDataRange().getValues();
  if (data.length <= 1) return [];

  var headers = data[0].map(function(h) { return String(h).trim(); });
  return data.slice(1).map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) { obj[h] = row[i]; });
    return obj;
  });
}

/**
 * Date 객체 또는 문자열을 'yyyy-MM-dd' 형식으로 변환.
 * GAS getValues()가 반환하는 Date는 instanceof Date가 false일 수 있으므로
 * duck-typing(getFullYear 존재 여부)으로 판별한다.
 */
function fmtDate(val) {
  if (val && typeof val.getFullYear === 'function') {
    return Utilities.formatDate(val, 'Asia/Seoul', 'yyyy-MM-dd');
  }
  return String(val);
}

/**
 * 고유 ID 생성 (prefix + 타임스탬프 + 인덱스)
 */
function genId(prefix, index) {
  return prefix + Date.now() + (index !== undefined ? '_' + index : '');
}

// ── 시트 초기 세팅 ─────────────────────────────────────────────────

/**
 * matches / goals 시트가 없으면 생성하고 헤더를 설정합니다.
 * Apps Script 에디터에서 직접 실행하거나 GET ?action=setup 으로 호출합니다.
 */
function setupSheets() {
  var spreadsheet = openSS();

  Object.keys(HEADERS).forEach(function(name) {
    var sh = spreadsheet.getSheetByName(name);
    if (!sh) {
      sh = spreadsheet.insertSheet(name);
    }
    // 헤더가 비어 있으면 작성
    if (sh.getLastRow() === 0 || sh.getRange(1, 1).getValue() === '') {
      var hdrs = HEADERS[name];
      sh.getRange(1, 1, 1, hdrs.length).setValues([hdrs]);
      sh.getRange(1, 1, 1, hdrs.length)
        .setFontWeight('bold')
        .setBackground('#f3f3f3');
      sh.setFrozenRows(1);
    }
  });

  return { message: '시트 초기 설정 완료', sheets: Object.keys(HEADERS) };
}

// ── GET 핸들러 ─────────────────────────────────────────────────────
/**
 * 지원 action:
 *   setup          → 시트 초기 설정
 *   getMatches     → 전체 경기 목록 (기본값)
 *   getMatch       → 경기 상세 (?action=getMatch&matchId=m001)
 */
function doGet(e) {
  try {
    var action  = (e.parameter && e.parameter.action)  || 'getMatches';
    var matchId = (e.parameter && e.parameter.matchId) || null;

    if (action === 'setup') {
      return jsonOk(setupSheets());
    }

    if (action === 'getMatches') {
      return jsonOk(getAllMatches());
    }

    if (action === 'getAll') {
      return jsonOk(getAllData());
    }

    if (action === 'getMatch') {
      if (!matchId) return jsonErr('matchId 파라미터가 필요합니다.');
      return jsonOk(getMatchDetail(matchId));
    }

    return jsonErr('알 수 없는 action: ' + action);

  } catch (ex) {
    return jsonErr(ex.message);
  }
}

// ── POST 핸들러 ────────────────────────────────────────────────────
/**
 * 지원 action:
 *   saveMatch  → 새 경기 + 골 저장
 *
 * 요청 본문 예시:
 * {
 *   "action": "saveMatch",
 *   "match": {
 *     "date": "2026-06-01", "location": "상암풋살파크",
 *     "opponent": "FC 가나", "our_score": 3, "opp_score": 1,
 *     "result": "승",
 *     "members": ["이상재", "공현웅", ...],
 *     "summary": "..."
 *   },
 *   "goals": [
 *     { "scorer": "이상재", "assist": "공현웅", "description": "역습" }
 *   ]
 * }
 *
 * ※ Content-Type: text/plain 으로 전송해야 CORS 오류 없이 동작합니다.
 */
function doPost(e) {
  try {
    var body   = JSON.parse(e.postData.contents);
    var action = body.action || 'saveMatch';

    if (action === 'saveMatch') {
      var result = saveMatch(body.match, body.goals || []);
      return jsonOk(result);
    }

    return jsonErr('알 수 없는 action: ' + action);

  } catch (ex) {
    return jsonErr(ex.message);
  }
}

// ── 비즈니스 로직 ───────────────────────────────────────────────────

var GAS_CACHE_KEY = 'all_data';
var GAS_CACHE_TTL = 300; // 5분 (초 단위)

/**
 * [D] matches + goals 전체를 한 번에 반환.
 * CacheService로 스프레드시트 읽기를 캐싱해 실행 시간을 단축한다.
 */
function getAllData() {
  var cache  = CacheService.getScriptCache();
  var cached = cache.get(GAS_CACHE_KEY);
  if (cached) {
    try { return JSON.parse(cached); } catch(_) {}
  }

  var matches = getAllMatches();
  var goals   = sheetToObjects(SH.GOALS).map(function(g) {
    return {
      goal_id:     String(g.goal_id),
      match_id:    String(g.match_id),
      scorer:      String(g.scorer),
      assist:      String(g.assist),
      description: String(g.description || '')
    };
  });
  var data = { matches: matches, goals: goals };

  try { cache.put(GAS_CACHE_KEY, JSON.stringify(data), GAS_CACHE_TTL); } catch(_) {}
  return data;
}

function _invalidateGasCache() {
  try { CacheService.getScriptCache().remove(GAS_CACHE_KEY); } catch(_) {}
}

function getAllMatches() {
  return sheetToObjects(SH.MATCHES).map(function(m) {
    return {
      match_id:  String(m.match_id),
      date:      fmtDate(m.date),
      location:  String(m.location),
      opponent:  String(m.opponent),
      our_score: Number(m.our_score),
      opp_score: Number(m.opp_score),
      result:    String(m.result),
      members:   String(m.members).split(',').map(function(s) { return s.trim(); }).filter(Boolean),
      summary:   String(m.summary || '')
    };
  });
}

function getMatchDetail(matchId) {
  var matches = getAllMatches();
  var match   = null;
  for (var i = 0; i < matches.length; i++) {
    if (matches[i].match_id === matchId) { match = matches[i]; break; }
  }
  if (!match) throw new Error('경기를 찾을 수 없습니다: ' + matchId);

  var goals = sheetToObjects(SH.GOALS)
    .filter(function(g) { return String(g.match_id) === matchId; })
    .map(function(g) {
      return {
        goal_id:     String(g.goal_id),
        match_id:    String(g.match_id),
        scorer:      String(g.scorer),
        assist:      String(g.assist),
        description: String(g.description || '')
      };
    });

  return { match: match, goals: goals };
}

function saveMatch(matchData, goalsData) {
  var spreadsheet = openSS();
  var matchId     = genId('m');
  var now         = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');

  // matches 저장
  var matchSh = spreadsheet.getSheetByName(SH.MATCHES);
  matchSh.appendRow([
    matchId,
    matchData.date,
    matchData.location,
    matchData.opponent,
    Number(matchData.our_score),
    Number(matchData.opp_score),
    matchData.result,
    Array.isArray(matchData.members) ? matchData.members.join(',') : String(matchData.members),
    matchData.summary || ''
  ]);

  // goals 저장
  var goalSh = spreadsheet.getSheetByName(SH.GOALS);
  goalsData.forEach(function(g, i) {
    goalSh.appendRow([
      genId('g', i),
      matchId,
      g.scorer,
      g.assist || '없음',
      g.description || ''
    ]);
  });

  _invalidateGasCache(); // 새 경기 저장 후 캐시 무효화
  return { match_id: matchId, saved_at: now };
}

// ── 테스트 데이터 삽입 ─────────────────────────────────────────────
/**
 * 30경기 테스트 데이터를 matches / goals 시트에 추가합니다.
 * Apps Script 에디터에서 함수 목록에서 insertTestData 를 선택 후 ▶ 실행.
 * 기존 데이터는 유지하고 뒤에 추가(append)만 합니다.
 */
function insertTestData() {
  var spreadsheet = openSS();
  var matchSh     = spreadsheet.getSheetByName(SH.MATCHES);
  var goalSh      = spreadsheet.getSheetByName(SH.GOALS);

  // ── 선수단 ──────────────────────────────────────────────────────
  var PLAYERS = [
    '이상재','공현웅','곽상현','권이현','김강엽',
    '김용재','김우재','김종환','김준영',
    '박동민','박아론','박병현','박성순','박정수',
    '박지용','박현철','김준섭','오신근',
    '이종혁','이종호','임재빈','전기석','정승균',
    '정재훈','정진호','정환도','조병윤',
    '조현식','주상묵','최지운','정태광'
  ];

  // ── 결정적 시드 랜덤 (재실행해도 동일 데이터) ───────────────────
  var seed = 20240101;
  function rand() {
    seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
    return seed / 0x7fffffff;
  }
  function randInt(min, max) { return Math.floor(rand() * (max - min + 1)) + min; }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rand() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // ── 30경기 고정 데이터 ──────────────────────────────────────────
  // 형식: [날짜, 장소, 상대팀, 우리득점, 상대득점, 결과]
  var MATCHES = [
    ['2024-01-06','상암풋살파크',     'FC 가나',        3,1,'승'],
    ['2024-01-27','마포풋살장',       '블루스타 FC',    1,1,'무'],
    ['2024-02-10','서울풋살경기장',   '한강 FC',        2,0,'승'],
    ['2024-03-02','잠실풋살파크',     '드래곤즈 FC',    0,2,'패'],
    ['2024-03-23','은평풋살센터',     '선데이킥',       2,2,'무'],
    ['2024-04-06','강남풋살경기장',   '더킥 FC',        4,1,'승'],
    ['2024-04-27','상암풋살파크',     'FC 나이키',      1,3,'패'],
    ['2024-05-11','목동풋살파크',     '레전드 FC',      2,1,'승'],
    ['2024-06-01','영등포풋살장',     '아침이슬 FC',    0,0,'무'],
    ['2024-06-22','노원풋살경기장',   '풋볼클럽 제로',  3,2,'승'],
    ['2024-07-13','성남풋살파크',     '알파 FC',        1,2,'패'],
    ['2024-08-03','상암풋살파크',     '파이어 FC',      2,0,'승'],
    ['2024-08-24','서울풋살경기장',   '골든슈즈 FC',    0,1,'패'],
    ['2024-09-14','마포풋살장',       '서울 유나이티드',3,0,'승'],
    ['2024-10-05','잠실풋살파크',     '킥오프 FC',      2,2,'무'],
    ['2024-10-26','은평풋살센터',     'FC 마라톤',      1,0,'승'],
    ['2024-11-09','강남풋살경기장',   '스트라이커즈',   0,3,'패'],
    ['2024-12-07','목동풋살파크',     '탑풋볼 FC',      2,1,'승'],
    ['2025-01-11','영등포풋살장',     'FC 바람',        1,1,'무'],
    ['2025-02-01','노원풋살경기장',   '불꽃풋볼',       3,1,'승'],
    ['2025-03-08','성남풋살파크',     'FC 제트',        2,3,'패'],
    ['2025-03-29','상암풋살파크',     '스파르타 FC',    1,0,'승'],
    ['2025-04-12','서울풋살경기장',   'FC 가나',        0,2,'패'],
    ['2025-05-10','마포풋살장',       '블루스타 FC',    4,2,'승'],
    ['2025-06-07','잠실풋살파크',     '한강 FC',        1,1,'무'],
    ['2025-07-05','은평풋살센터',     '드래곤즈 FC',    3,0,'승'],
    ['2025-08-09','강남풋살경기장',   '선데이킥',       2,1,'승'],
    ['2025-10-04','목동풋살파크',     '더킥 FC',        0,1,'패'],
    ['2025-12-06','상암풋살파크',     '알파 FC',        2,0,'승'],
    ['2026-03-07','서울풋살경기장',   '파이어 FC',      1,2,'패']
  ];

  var SUMMARIES = [
    '전반부터 적극적인 압박으로 주도권을 잡았다. 체력 안배가 인상적인 경기였다.',
    '초반 실점 후 끝까지 포기하지 않고 동점에 성공했다. 정신력 승리.',
    '역습 전환 속도가 빠르고 수비 조직력도 안정적이었다. 이상적인 경기 운영.',
    '전반 내내 밀리다 후반 집중력으로 승부를 뒤집은 값진 역전승.',
    '골 결정력이 아쉬웠다. 슈팅 수는 많았지만 골로 연결이 부족했음.',
    '팀워크가 잘 맞은 경기. 특히 중원 싸움에서 우세를 점하며 흐름을 주도했다.',
    '상대의 강한 압박에 고전했지만 수비 집중력으로 실점을 최소화했다.',
    '전반 3골로 일찌감치 승부를 결정 지은 완벽한 경기.',
    '날씨가 더웠음에도 체력을 잘 유지하며 후반까지 강도 높은 플레이를 보여줬다.',
    '세트피스 수비에서 약점이 노출됐다. 코너킥 수비 훈련이 필요해 보인다.',
    '아쉬운 패배. 컨디션 난조가 영향을 줬지만 다음 경기를 기약하자.',
    '새로 합류한 멤버들과의 호흡이 점차 맞아가고 있어 앞으로가 기대된다.'
  ];

  var DESCS = [
    '역습 상황에서 침착하게 마무리',
    '왼쪽 측면 돌파 후 왼발 슈팅',
    '코너킥 헤더 연결',
    '프리킥 직접 골',
    '혼전 속 밀어넣기',
    '원투패스 이후 무회전 슈팅',
    '수비 실수를 빠르게 낚아채 마무리',
    '정확한 크로스에 발리 슈팅',
    '오른발 중거리 슈팅',
    '페널티킥'
  ];

  var inserted = { matches: 0, goals: 0 };

  for (var i = 0; i < MATCHES.length; i++) {
    var m       = MATCHES[i];
    var matchId = 'td_' + m[0].replace(/-/g, '') + '_' + (i + 1);

    // 참여 멤버 10~18명 랜덤 선택
    var memberCount = randInt(10, 18);
    var members     = shuffle(PLAYERS).slice(0, memberCount);

    // 총평: 약 40% 확률로 삽입
    var summary = rand() < 0.4 ? SUMMARIES[randInt(0, SUMMARIES.length - 1)] : '';

    matchSh.appendRow([
      matchId,
      m[0],           // date (문자열로 저장 → fmtDate bug 우회)
      m[1],           // location
      m[2],           // opponent
      m[3],           // our_score
      m[4],           // opp_score
      m[5],           // result
      members.join(','),
      summary
    ]);
    inserted.matches++;

    // 골 기록 (우리 팀 득점 수만큼)
    for (var g = 0; g < m[3]; g++) {
      var scorer = members[randInt(0, members.length - 1)];
      var assist = '없음';
      if (rand() > 0.3 && members.length > 1) {
        do { assist = members[randInt(0, members.length - 1)]; }
        while (assist === scorer);
      }
      var desc = rand() > 0.45 ? DESCS[randInt(0, DESCS.length - 1)] : '';

      goalSh.appendRow([
        'td_g_' + matchId + '_' + (g + 1),
        matchId,
        scorer,
        assist,
        desc
      ]);
      inserted.goals++;
    }
  }

  Logger.log('테스트 데이터 삽입 완료 — 경기: %s건, 골: %s건', inserted.matches, inserted.goals);
  return { message: '테스트 데이터 삽입 완료', matches: inserted.matches, goals: inserted.goals };
}
