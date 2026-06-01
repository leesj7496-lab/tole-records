const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwml2e_MUar3DpuAMXySTRCTQeeiS48jgwlUAXLtotq6I9FX3bg7YW2gfumUfED_OImRQ/exec';
const STORAGE_KEY  = 'tole_gs_cache';
const CACHE_TS_KEY = 'tole_gs_cache_ts';
const CACHE_TTL    = 10 * 60 * 1000; // 10분

const PLAYERS = [
  "이상재","공현웅","곽상현","권이현","김강엽",
  "김용재","김우재","김종환","김준영",
  "박동민","박아론","박병현","박성순","박정수",
  "박지용","박현철","김준섭","오신근",
  "이종혁","이종호","임재빈","전기석","정승균",
  "정재훈","정진호","정환도","조병윤",
  "조현식","주상묵","최지운","정태광"
];

const api = {
  _loaded: false,

  // ── 로컬 캐시 ──────────────────────────────────────────────────

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch(e) {}
    return { matches: [], goals: [] };
  },

  _save(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
    } catch(e) {}
  },

  _isCacheFresh() {
    const ts = Number(localStorage.getItem(CACHE_TS_KEY) || 0);
    return (Date.now() - ts) < CACHE_TTL;
  },

  _invalidateCache() {
    this._loaded = false;
    localStorage.removeItem(CACHE_TS_KEY);
  },

  getPlayers() {
    return PLAYERS;
  },

  _normalizeDate(str) {
    str = String(str);
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    const MONTHS = { Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',
                     Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12' };
    const m = str.match(/(\w{3})\s+(\d{1,2})\s+(\d{4})/);
    if (m && MONTHS[m[1]]) {
      return `${m[3]}-${MONTHS[m[1]]}-${String(m[2]).padStart(2, '0')}`;
    }
    return str;
  },

  getMatches() {
    return this._load().matches
      .map(m => ({ ...m, date: this._normalizeDate(m.date) }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  getMatch(matchId) {
    const m = this._load().matches.find(m => m.match_id === matchId) || null;
    return m ? { ...m, date: this._normalizeDate(m.date) } : null;
  },

  getGoals(matchId) {
    return this._load().goals.filter(g => g.match_id === matchId);
  },

  // ── 비동기 Google Sheets API ──────────────────────────────────

  /**
   * [A] TTL 캐시: localStorage에 신선한 데이터가 있으면 API 호출 생략.
   * 만료됐거나 없을 때만 GAS를 호출하고 저장.
   */
  async loadData() {
    if (this._loaded) return;

    // localStorage 캐시가 신선하면 API 호출 없이 바로 반환
    const cached = this._load();
    if (cached.matches.length && this._isCacheFresh()) {
      this._loaded = true;
      return;
    }

    let data;
    try {
      const res  = await fetch(`${APPS_SCRIPT_URL}?action=getAll`);
      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch(_) {
        throw new Error('GAS 응답이 JSON이 아닙니다. 배포 URL 또는 실행 권한을 확인하세요.');
      }

      if (json.ok) {
        data = json.data;
      } else {
        // getAll 없는 구버전 배포 폴백
        const res2  = await fetch(`${APPS_SCRIPT_URL}?action=getMatches`);
        const json2 = await res2.json();
        if (!json2.ok) throw new Error(json2.error || 'API 오류');
        data = { matches: json2.data, goals: [] };
      }
    } catch(e) {
      const msg = e instanceof TypeError
        ? '네트워크 오류 (CORS 또는 인터넷 연결 확인)'
        : (e.message || 'API 오류');
      throw new Error(msg);
    }

    this._save(data); // 타임스탬프도 함께 저장
    this._loaded = true;
  },

  /**
   * 경기 상세(match + goals)를 GAS에서 직접 조회 (캐시 우회).
   * B 최적화로 인해 일반적으로는 호출되지 않음.
   */
  async fetchMatchDetail(matchId) {
    const res  = await fetch(`${APPS_SCRIPT_URL}?action=getMatch&matchId=${encodeURIComponent(matchId)}`);
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); }
    catch(_) { throw new Error('GAS getMatch 응답이 JSON이 아닙니다.'); }
    if (!json.ok) throw new Error(json.error || 'API 오류');
    const d = json.data;
    if (d.match) d.match.date = this._normalizeDate(d.match.date);
    return d; // { match, goals }
  },

  /**
   * 새 경기를 Sheets에 저장. 완료 후 캐시를 즉시 무효화.
   */
  async saveMatch(matchData, goalsData) {
    const body = JSON.stringify({
      action: 'saveMatch',
      match:  matchData,
      goals:  goalsData
    });
    const res = await fetch(APPS_SCRIPT_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'text/plain' },
      body
    });
    if (!res.ok) throw new Error(`서버 오류 (${res.status})`);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || '저장 실패');
    this._invalidateCache(); // 타임스탬프 제거 → 다음 loadData 시 강제 재조회
    return json.data.match_id;
  }
};
