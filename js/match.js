const match = {
  calYear:   new Date().getFullYear(),
  calMonth:  new Date().getMonth(),      // 0-based
  listYear:  new Date().getFullYear(),
  listMonth: new Date().getMonth() + 1,  // 1-based

  // ── List View ────────────────────────────────────────────────

  renderList() {
    this.setView('list');
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

  // ── View Toggle ──────────────────────────────────────────────

  setView(view) {
    const listEl   = document.getElementById('match-list');
    const calEl    = document.getElementById('match-calendar');
    const filterEl = document.getElementById('list-filter-bar');
    const listBtn  = document.getElementById('btn-view-list');
    const calBtn   = document.getElementById('btn-view-cal');

    if (view === 'list') {
      listBtn?.classList.add('active');
      calBtn?.classList.remove('active');
      if (listEl)   listEl.style.display   = '';
      if (calEl)    calEl.style.display    = 'none';
      if (filterEl) filterEl.style.display = '';
      this._renderFilterBar();
      this._renderFilteredList();
    } else {
      listBtn?.classList.remove('active');
      calBtn?.classList.add('active');
      if (listEl)   listEl.style.display   = 'none';
      if (calEl)    calEl.style.display    = '';
      if (filterEl) filterEl.style.display = 'none';
      this.renderCalendar(this.calYear, this.calMonth);
    }
  },

  _renderFilterBar() {
    const bar = document.getElementById('list-filter-bar');
    if (!bar) return;

    const curYear  = new Date().getFullYear();
    const startYear = 2024;

    const yearOpts = [];
    for (let y = startYear; y <= curYear; y++) {
      yearOpts.push(`<option value="${y}" ${y === this.listYear ? 'selected' : ''}>${y}년</option>`);
    }

    const monthOpts = [];
    for (let m = 1; m <= 12; m++) {
      monthOpts.push(`<option value="${m}" ${m === this.listMonth ? 'selected' : ''}>${m}월</option>`);
    }

    bar.innerHTML = `
      <div class="list-filter">
        <select class="filter-select" id="filter-year" onchange="match.onFilterChange()">
          ${yearOpts.join('')}
        </select>
        <select class="filter-select" id="filter-month" onchange="match.onFilterChange()">
          ${monthOpts.join('')}
        </select>
      </div>`;
  },

  onFilterChange() {
    this.listYear  = parseInt(document.getElementById('filter-year').value);
    this.listMonth = parseInt(document.getElementById('filter-month').value);
    this._renderFilteredList();
  },

  _renderFilteredList() {
    const listEl = document.getElementById('match-list');
    if (!listEl) return;

    const pad    = n => String(n).padStart(2, '0');
    const prefix = `${this.listYear}-${pad(this.listMonth)}`;
    const matches = api.getMatches().filter(m => m.date.startsWith(prefix));

    if (!matches.length) {
      listEl.innerHTML = `<div class="no-data"><div class="icon">📋</div>해당 월에 경기가 없습니다.</div>`;
      return;
    }

    listEl.innerHTML = matches.map(m => this._cardHtml(m)).join('');

    setTimeout(() => {
      const last = listEl.lastElementChild;
      if (last) last.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 150);
  },

  // ── Calendar View ────────────────────────────────────────────

  renderCalendar(year, month) {
    this.calYear  = year;
    this.calMonth = month;

    const container = document.getElementById('match-calendar');
    const matches   = api.getMatches();

    // 날짜 → { id, result } 맵
    const dateMap = {};
    matches.forEach(m => { dateMap[m.date] = { id: m.match_id, result: m.result }; });

    const MONTHS   = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
    const DAYS     = ['일','월','화','수','목','금','토'];
    const pad      = n => String(n).padStart(2, '0');
    const prefix   = `${year}-${pad(month + 1)}`;
    const firstDow = new Date(year, month, 1).getDay();
    const dimCur   = new Date(year, month + 1, 0).getDate();
    const dimPrev  = new Date(year, month,  0).getDate();
    const todayStr = new Date().toISOString().slice(0, 10);

    // 셀 배열 구성
    const cells = [];
    for (let i = firstDow - 1; i >= 0; i--)
      cells.push({ day: dimPrev - i, cur: false });
    for (let d = 1; d <= dimCur; d++) {
      const dateStr = `${prefix}-${pad(d)}`;
      const entry   = dateMap[dateStr] || null;
      cells.push({ day: d, cur: true, dateStr, matchId: entry?.id || null, result: entry?.result || null, isToday: dateStr === todayStr });
    }
    let nd = 1;
    while (cells.length % 7 !== 0) cells.push({ day: nd++, cur: false });

    const headers = DAYS.map(d => `<div class="cal-day-name">${d}</div>`).join('');

    const cellsHtml = cells.map(c => {
      if (!c.cur)
        return `<div class="cal-day other-month"><span class="cal-day-num">${c.day}</span></div>`;

      const resultCls = c.result === '승' ? 'match-win' : c.result === '무' ? 'match-draw' : c.result === '패' ? 'match-loss' : '';
      const cls   = ['cal-day', c.isToday ? 'today' : '', resultCls].filter(Boolean).join(' ');
      const click = c.matchId ? `onclick="app.goMatchDetail('${c.matchId}')"` : '';
      return `
        <div class="${cls}" ${click}>
          <span class="cal-day-num">${c.day}</span>
        </div>`;
    }).join('');

    const hasMatches = matches.some(m => m.date.startsWith(prefix));

    container.innerHTML = `
      <div class="calendar">
        <div class="cal-header">
          <button class="cal-nav-btn" onclick="match.prevMonth()">&#8249;</button>
          <span class="cal-title">${year}년 ${MONTHS[month]}</span>
          <button class="cal-nav-btn" onclick="match.nextMonth()">&#8250;</button>
        </div>
        <div class="cal-grid">
          ${headers}
          ${cellsHtml}
        </div>
        ${!hasMatches ? '<div class="cal-no-match">이번 달 경기 없음</div>' : ''}
      </div>`;
  },

  prevMonth() {
    let y = this.calYear, m = this.calMonth - 1;
    if (m < 0) { m = 11; y--; }
    this.renderCalendar(y, m);
  },

  nextMonth() {
    let y = this.calYear, m = this.calMonth + 1;
    if (m > 11) { m = 0; y++; }
    this.renderCalendar(y, m);
  },

  // ── Detail View ──────────────────────────────────────────────

  renderDetail(matchId) {
    const container = document.getElementById('match-detail-content');
    const m = api.getMatch(matchId);
    if (!m) { container.innerHTML = '<div class="no-data">경기 정보를 찾을 수 없습니다.</div>'; return; }

    const goals      = api.getGoals(matchId);
    const { badge, cls } = this._resultInfo(m.result);
    const officials  = m.members.filter(n => !n.includes('(용병)'));
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
  }
};
