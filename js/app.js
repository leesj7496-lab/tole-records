const PASSWORD = 'tole1234';

const app = {
  history: [],

  init() {
    this.showScreen('main');
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
  },

  checkPassword() {
    const input = document.getElementById('password-input').value;
    if (input === PASSWORD) {
      // 비밀번호 화면은 히스토리에 남기지 않고 메인으로 돌아가게
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
