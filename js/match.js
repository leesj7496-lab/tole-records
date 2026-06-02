const match = {
  listYear: new Date().getFullYear(),

  init() {
    this.listYear = new Date().getFullYear();
    this._renderFilterBar();
    this._renderFilteredList().catch(e => console.error(e));
  },

  // ── List View ────────────────────────────────────────────────

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

  _renderFilterBar() {
    const bar = document.getElementById('list-filter-bar');
    if (!bar) return;

    const matches = api._loaded ? api.getMatches() : [];
    const curYear = new Date().getFullYear();

    let years;
    if (matches.length) {
      const yearSet = new Set(matches.map(m => parseInt(m.date.split('-')[0], 10)));
      yearSet.add(curYear);
      years = [...yearSet].sort((a, b) => a - b);
    } else {
      years = [curYear];
    }
    if (!years.includes(this.listYear)) this.listYear = curYear;

    const yearOpts = years.map(y =>
      `<option value="${y}" ${y === this.listYear ? 'selected' : ''}>${y}년</option>`
    ).join('');

    bar.innerHTML = `
      <div class="list-filter list-filter-year-only">
        <select class="filter-select" id="filter-year" onchange="match.onFilterChange()">
          ${yearOpts}
        </select>
      </div>`;
  },

  onFilterChange() {
    this.listYear = parseInt(document.getElementById('filter-year').value, 10);
    this._renderFilteredList().catch(e => console.error(e));
  },

  async _renderFilteredList() {
    const listEl = document.getElementById('match-list');
    if (!listEl) return;

    if (!api._loaded) {
      listEl.innerHTML = this._loadingHtml();
      try {
        await api.loadData();
      } catch(e) {
        listEl.innerHTML = this._errorHtml(e.message, () => this._renderFilteredList());
        return;
      }
      this._renderFilterBar();
    }

    const matches = api.getMatches()
      .filter(m => parseInt(m.date.split('-')[0], 10) === this.listYear)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (!matches.length) {
      const card = document.getElementById('match-stat-card');
      if (card) card.innerHTML = '';
      const now = new Date();
      const isCurYear = this.listYear === now.getFullYear();
      const msg = isCurYear ? '올해 경기 기록이 없습니다.' : '해당 연도에 경기가 없습니다.';
      listEl.innerHTML = `<div class="no-data"><div class="icon">📋</div>${msg}</div>`;
      return;
    }

    this._renderStatCard(matches);
    listEl.innerHTML = matches.map(m => this._cardHtml(m)).join('');
    this._scrollToLatestMatch();
  },

  _renderStatCard(matches) {
    const card = document.getElementById('match-stat-card');
    if (!card) return;
    if (!matches.length) { card.innerHTML = ''; return; }

    const total  = matches.length;
    const wins   = matches.filter(m => m.result === '승').length;
    const draws  = matches.filter(m => m.result === '무').length;
    const losses = matches.filter(m => m.result === '패').length;
    const rate   = Math.round(wins / total * 100);

    card.innerHTML = `
      <div class="stat-summary-card">
        <div class="stat-summary-item">
          <span class="stat-summary-num">${total}</span>
          <span class="stat-summary-label">경기</span>
        </div>
        <div class="stat-summary-divider"></div>
        <div class="stat-summary-item">
          <span class="stat-summary-num win-color">${wins}</span>
          <span class="stat-summary-label">승</span>
        </div>
        <div class="stat-summary-item">
          <span class="stat-summary-num draw-color">${draws}</span>
          <span class="stat-summary-label">무</span>
        </div>
        <div class="stat-summary-item">
          <span class="stat-summary-num loss-color">${losses}</span>
          <span class="stat-summary-label">패</span>
        </div>
        <div class="stat-summary-divider"></div>
        <div class="stat-summary-item">
          <span class="stat-summary-num">${rate}%</span>
          <span class="stat-summary-label">승률</span>
        </div>
      </div>`;
  },

  _scrollToLatestMatch() {
    setTimeout(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 200);
  },

  // ── Detail View ──────────────────────────────────────────────

  /**
   * [B] 캐시 우선 렌더링:
   *  1) api._loaded → 캐시에서 즉시 렌더 (로딩 없음)
   *  2) 캐시 없음   → loadData() (TTL 캐시 포함) 후 캐시 렌더
   *  3) 그래도 없음 → fetchMatchDetail 직접 호출 (fallback)
   */
  async renderDetail(matchId) {
    const container = document.getElementById('match-detail-content');

    // 캐시에 데이터 있으면 즉시 렌더 (로딩 스피너 없음)
    if (api._loaded) {
      const m     = api.getMatch(matchId);
      const goals = api.getGoals(matchId);
      if (m) { container.innerHTML = this._detailHtml(m, goals); return; }
    }

    // 캐시 없음 → loadData() → 재시도
    container.innerHTML = this._loadingHtml();
    try {
      await api.loadData();
      const m     = api.getMatch(matchId);
      const goals = api.getGoals(matchId);
      if (m) { container.innerHTML = this._detailHtml(m, goals); return; }

      // loadData에 해당 match_id 없는 경우 (직접 URL 접근 등) → API fallback
      const data = await api.fetchMatchDetail(matchId);
      if (!data.match) {
        container.innerHTML = '<div class="no-data">경기 정보를 찾을 수 없습니다.</div>';
        return;
      }
      container.innerHTML = this._detailHtml(data.match, data.goals || []);
    } catch(e) {
      container.innerHTML = this._errorHtml(e.message, () => this.renderDetail(matchId));
    }
  },

  _detailHtml(m, goals) {
    const { badge, cls } = this._resultInfo(m.result);
    const officials   = m.members.filter(n => !n.includes('(용병)'));
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
            ${g.description ? `<div class="goal-description multiline-text">${this._esc(g.description)}</div>` : ''}
          </div>`).join('')
      : '<p style="color:var(--gray);font-size:0.88rem">득점 기록 없음</p>';

    const summarySection = m.summary ? `
      <div class="detail-section">
        <div class="detail-section-title">총평</div>
        <div class="summary-box multiline-text">${this._esc(m.summary)}</div>
      </div>` : '';

    return `
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

  // ── Helpers ──────────────────────────────────────────────────

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
  },

  _loadingHtml() {
    return `
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <p class="loading-text">데이터를 불러오는 중...</p>
      </div>`;
  },

  _errorHtml(message, retryFn) {
    const id = 'retry-' + Date.now();
    setTimeout(() => {
      const btn = document.getElementById(id);
      if (btn) btn.onclick = retryFn;
    }, 0);
    return `
      <div class="error-container">
        <div class="error-icon">⚠️</div>
        <p class="error-text">데이터를 불러오지 못했습니다.</p>
        <p class="error-detail">${this._esc(message)}</p>
        <button id="${id}" class="error-retry-btn">다시 시도</button>
      </div>`;
  }
};
