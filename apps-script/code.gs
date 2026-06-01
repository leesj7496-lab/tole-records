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

    if (action === 'deleteTestData') {
      return jsonOk(deleteTestData());
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

// ── 테스트(목) 데이터 삭제 ─────────────────────────────────────────
/**
 * match_id 가 'td_' 로 시작하는 임시 테스트 경기·골 기록을 시트에서 제거합니다.
 * Apps Script 에디터에서 deleteTestData 실행 또는 POST action=deleteTestData
 */
function deleteTestData() {
  var spreadsheet = openSS();
  var matchSh     = spreadsheet.getSheetByName(SH.MATCHES);
  var goalSh      = spreadsheet.getSheetByName(SH.GOALS);
  var deleted     = { matches: 0, goals: 0 };

  var goalRows = goalSh.getDataRange().getValues();
  for (var i = goalRows.length - 1; i >= 1; i--) {
    var goalId  = String(goalRows[i][0]);
    var matchId = String(goalRows[i][1]);
    if (goalId.indexOf('td_') === 0 || matchId.indexOf('td_') === 0) {
      goalSh.deleteRow(i + 1);
      deleted.goals++;
    }
  }

  var matchRows = matchSh.getDataRange().getValues();
  for (var j = matchRows.length - 1; j >= 1; j--) {
    var mid = String(matchRows[j][0]);
    if (mid.indexOf('td_') === 0) {
      matchSh.deleteRow(j + 1);
      deleted.matches++;
    }
  }

  _invalidateGasCache();
  Logger.log('테스트 데이터 삭제 — 경기: %s건, 골: %s건', deleted.matches, deleted.goals);
  return { message: '테스트 데이터 삭제 완료', matches: deleted.matches, goals: deleted.goals };
}
