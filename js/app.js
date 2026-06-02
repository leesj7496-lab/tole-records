const PASSWORD = 'tole1234';

const app = {
  history: [],

  init() {
    this.showScreen('main');

    // Android 뒤로가기 지원
    // 페이지 진입 시 state 하나를 미리 쌓아 popstate가 항상 발화하도록 한다.
    history.pushState(null, null, null);
    window.addEventListener('popstate', () => {
      if (this.history.length === 0) {
        // 메인 화면 — 기본 동작(앱 종료/탭 닫기)에 맡긴다.
        return;
      }
      // 이전 화면으로 이동하고, 다음 뒤로가기를 위해 state를 다시 쌓는다.
      this.showScreen(this.history.pop());
      history.pushState(null, null, null);
    });

    // [C] 메인 화면을 보는 동안 백그라운드에서 데이터 프리패치
    api.loadData().catch(() => {});
  },

  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById('screen-' + id);
    if (el) el.classList.add('active');
    window.scrollTo(0, 0);
  },

  navigate(to, initFn) {
    this.history.push(this._currentScreen());
    this.showScreen(to);
    if (initFn) initFn();
  },

  back() {
    const prev = this.history.pop() || 'main';
    this.showScreen(prev);
  },

  _currentScreen() {
    const active = document.querySelector('.screen.active');
    return active ? active.id.replace('screen-', '') : 'main';
  },

  goMatches() {
    this.navigate('matches', () => match.init());
  },

  goMatchDetail(matchId) {
    this.navigate('match-detail', () => match.renderDetail(matchId));
  },

  goStats() {
    this.navigate('stats', () => stats.init());
  },

  goPassword() {
    this.navigate('password');
    document.getElementById('password-input').value = '';
    document.getElementById('password-error').style.display = 'none';
    this._renderDraftNoticeOnPassword();
  },

  _renderDraftNoticeOnPassword() {
    const el = document.getElementById('password-draft-notice');
    if (!el) return;
    const draft = record.peekDraft();
    if (!draft) {
      el.style.display = 'none';
      el.innerHTML = '';
      return;
    }
    el.style.display = 'block';
    el.innerHTML = `
      <p class="password-draft-label">작성 중인 경기 기록</p>
      ${record._draftPreviewHtml(draft)}
      <p class="password-draft-hint">비밀번호 확인 후 이어서 작성할 수 있습니다.</p>`;
  },

  checkPassword() {
    const input = document.getElementById('password-input').value;
    if (input === PASSWORD) {
      this.history = ['main'];
      this.showScreen('record');
      record.init();
    } else {
      document.getElementById('password-error').style.display = 'block';
      document.getElementById('password-input').value = '';
      document.getElementById('password-input').focus();
    }
  }
};

document.addEventListener('DOMContentLoaded', () => app.init());
