const match = {

  renderList() {
    const container = document.getElementById('match-list');
    const matches = api.getMatches();

    if (!matches.length) {
      container.innerHTML = `<div class="no-data"><div class="icon">⚽</div>기록된 경기가 없습니다.</div>`;
      return;
    }

    container.innerHTML = matches.map(m => this._cardHtml(m)).join('');
  },

  _cardHtml(m) {
    const { badge, cls } = this._resultInfo(m.result);
    const [y, mo, d] = m.date.split('-');
    return `
      <div class="match-card" onclick="app.goMatchDetail('${m.match_id}')">
        <div class="match-card-date">
          <span class="month">${parseInt(mo)}월</span>
          ${parseInt(d)}일
        </div>
        <div class="match-card-center">
          <div class="match-card-opponent">${this._esc(m.opponent)}</div>
          <div class="match-card-location">${this._esc(m.location)}</div>
        </div>
        <div class="match-card-right">
          <div class="match-score">${m.our_score} - ${m.opp_score}</div>
          <div class="result-badge ${cls}">${badge}</div>
        </div>
      </div>`;
  },

  renderDetail(matchId) {
    const container = document.getElementById('match-detail-content');
    const m = api.getMatch(matchId);
    if (!m) { container.innerHTML = '<div class="no-data">경기 정보를 찾을 수 없습니다.</div>'; return; }

    const goals = api.getGoals(matchId);
    const { badge, cls } = this._resultInfo(m.result);
    const officials = m.members.filter(n => !n.includes('(용병)'));
    const mercenaries = m.members.filter(n => n.includes('(용병)'));

    const memberChips = [
      ...officials.map(n => `<span class="member-chip">${this._esc(n)}</span>`),
      ...mercenaries.map(n => `<span class="member-chip mercenary">${this._esc(n)}</span>`)
    ].join('');

    const goalItems = goals.length
      ? goals.map((g, i) => `
          <div class="goal-item">
            <div class="goal-number">GOAL ${i + 1}</div>
            <div class="goal-players">
              <div class="goal-player">
                <span class="goal-player-label">골</span>
                <span class="goal-player-name">${this._esc(g.scorer)}</span>
              </div>
              ${g.assist !== '없음' ? `
              <div class="goal-player">
                <span class="goal-player-label">어시</span>
                <span class="goal-player-name">${this._esc(g.assist)}</span>
              </div>` : ''}
            </div>
            ${g.description ? `<div class="goal-description">${this._esc(g.description)}</div>` : ''}
          </div>`).join('')
      : '<p style="color:var(--gray);font-size:0.88rem">득점 기록 없음</p>';

    const summarySection = m.summary ? `
      <div class="detail-section">
        <div class="detail-section-title">총평</div>
        <div class="summary-box">${this._esc(m.summary)}</div>
      </div>` : '';

    container.innerHTML = `
      <div class="detail-hero">
        <div class="detail-date">${this._fmtDate(m.date)}</div>
        <div class="detail-location">${this._esc(m.location)}</div>
        <div class="detail-opponent">vs <span>${this._esc(m.opponent)}</span></div>
        <div class="detail-score">
          ${m.our_score}<span class="sep">:</span>${m.opp_score}
        </div>
        <div class="detail-result-badge result-badge ${cls}">${badge}</div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">참여 멤버 (${m.members.length}명)</div>
        <div class="member-chips">${memberChips}</div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">공격 포인트 (${goals.length}골)</div>
        ${goalItems}
      </div>

      ${summarySection}`;
  },

  _resultInfo(result) {
    if (result === '승') return { badge: '승', cls: 'win' };
    if (result === '무') return { badge: '무', cls: 'draw' };
    return { badge: '패', cls: 'loss' };
  },

  _fmtDate(str) {
    const [y, m, d] = str.split('-');
    return `${y}년 ${parseInt(m)}월 ${parseInt(d)}일`;
  },

  _esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
};
