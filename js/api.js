const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwml2e_MUar3DpuAMXySTRCTQeeiS48jgwlUAXLtotq6I9FX3bg7YW2gfumUfED_OImRQ/exec';
const STORAGE_KEY = 'tole_gs_cache';

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
    } catch(e) {}
  },

  getPlayers() {
    return PLAYERS;
  },

  getMatches() {
    return this._load().matches.slice().sort((a, b) => a.date.localeCompare(b.date));
  },

  getMatch(matchId) {
    return this._load().matches.find(m => m.match_id === matchId) || null;
  },

  getGoals(matchId) {
    return this._load().goals.filter(g => g.match_id === matchId);
  },

  // ── 비동기 Google Sheets API ──────────────────────────────────

  /**
   * 전체 경기 + 골 데이터를 Sheets에서 가져와 로컬 캐시에 저장.
   * 세션 내 첫 호출만 네트워크를 사용하고 이후는 캐시를 반환.
   * getAll 엔드포인트가 없으면 getMatches로 폴백 (통계 골/어시스트 미지원).
   */
  async loadData() {
    if (this._loaded) return;

    let data;
    try {
      const res  = await fetch(`${APPS_SCRIPT_URL}?action=getAll`);
      const json = await res.json();
      if (json.ok) {
        data = json.data;
      } else {
        // getAll 없는 구버전 배포 폴백: matches만 가져옴
        const res2  = await fetch(`${APPS_SCRIPT_URL}?action=getMatches`);
        const json2 = await res2.json();
        if (!json2.ok) throw new Error(json2.error || 'API 오류');
        data = { matches: json2.data, goals: [] };
      }
    } catch(e) {
      const msg = e instanceof TypeError ? '네트워크 오류' : (e.message || 'API 오류');
      throw new Error(msg);
    }

    this._save(data);
    this._loaded = true;
  },

  /**
   * 경기 상세(match + goals + photos)를 항상 최신으로 Sheets에서 가져옴.
   */
  async fetchMatchDetail(matchId) {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=getMatch&matchId=${encodeURIComponent(matchId)}`);
    if (!res.ok) throw new Error(`서버 오류 (${res.status})`);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'API 오류');
    return json.data; // { match, goals, photos }
  },

  /**
   * 사진 한 장을 base64로 Google Drive에 업로드. photos 시트에 자동 기록.
   */
  async uploadPhoto(matchId, dataUrl, fileName) {
    const body = JSON.stringify({
      action:   'uploadPhoto',
      matchId,
      base64:   dataUrl,
      fileName: fileName || 'photo.jpg'
    });
    const res = await fetch(APPS_SCRIPT_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'text/plain' },
      body
    });
    if (!res.ok) throw new Error(`서버 오류 (${res.status})`);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || '사진 업로드 실패');
    return json.data; // { photo_id, match_id, drive_url }
  },

  /**
   * 새 경기를 Sheets에 저장. 완료 후 로컬 캐시를 무효화.
   */
  async saveMatch(matchData, goalsData) {
    const body = JSON.stringify({
      action: 'saveMatch',
      match:  matchData,
      goals:  goalsData,
      photos: []
    });
    const res = await fetch(APPS_SCRIPT_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'text/plain' },
      body
    });
    if (!res.ok) throw new Error(`서버 오류 (${res.status})`);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || '저장 실패');
    this._loaded = false; // 다음 목록 진입 시 재로드
    return json.data.match_id;
  }
};
