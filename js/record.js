const record = {
  mercenaries: [],
  goalEntries: [],
  goalCounter: 0,
  selectedResult: '',

  init() {
    this.mercenaries = [];
    this.goalEntries = [];
    this.goalCounter = 0;
    this.selectedResult = '';
    this._renderForm();
  },

  _renderForm() {
    const players = api.getPlayers();
    const today = new Date().toISOString().slice(0, 10);

    const checkboxes = players.map(p => `
      <label class="member-check-label">
        <input type="checkbox" class="member-check" value="${p}">
        ${p}
      </label>`).join('');

    document.getElementById('record-form-content').innerHTML = `
      <div class="record-form">

        <div class="form-section">
          <div class="form-section-title">기본 정보</div>

          <div class="form-group">
            <label class="form-label">날짜</label>
            <input type="date" id="rec-date" class="form-input" value="${today}">
          </div>
          <div class="form-group">
            <label class="form-label">장소</label>
            <input type="text" id="rec-location" class="form-input" placeholder="경기 장소">
          </div>
          <div class="form-group">
            <label class="form-label">상대팀</label>
            <input type="text" id="rec-opponent" class="form-input" placeholder="상대팀 이름">
          </div>
          <div class="form-group">
            <label class="form-label">스코어 (우리 팀 : 상대 팀)</label>
            <div class="score-row">
              <input type="number" id="rec-our-score" class="form-input" min="0" placeholder="0"
                oninput="record._autoResult()">
              <span class="score-sep">:</span>
              <input type="number" id="rec-opp-score" class="form-input" min="0" placeholder="0"
                oninput="record._autoResult()">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">결과</label>
            <div class="result-row">
              <button type="button" class="btn-result" data-result="승"
                onclick="record._setResult('승')">승</button>
              <button type="button" class="btn-result" data-result="무"
                onclick="record._setResult('무')">무</button>
              <button type="button" class="btn-result" data-result="패"
                onclick="record._setResult('패')">패</button>
            </div>
          </div>
        </div>

        <div class="form-section">
          <div class="form-section-title">참여 멤버</div>
          <div class="members-grid" id="members-grid">${checkboxes}</div>
          <div id="mercenary-list" class="mercenary-list"></div>
          <button type="button" class="btn btn-secondary" onclick="record.addMercenary()">+ 용병 추가</button>
        </div>

        <div class="form-section">
          <div class="form-section-title">공격 포인트</div>
          <div id="goals-container"></div>
          <button type="button" class="btn btn-secondary" onclick="record.addGoalEntry()">+ 골 추가</button>
        </div>

        <div class="form-section">
          <div class="form-section-title">
            총평
            <span class="optional">(선택)</span>
          </div>
          <textarea id="rec-summary" class="form-textarea" placeholder="경기 총평을 입력하세요..."></textarea>
        </div>

        <button type="button" class="btn btn-primary btn-save" onclick="record.save()">저장하기</button>
      </div>`;
  },

  _autoResult() {
    const our = document.getElementById('rec-our-score').value;
    const opp = document.getElementById('rec-opp-score').value;
    if (our === '' || opp === '') return;
    const o = parseInt(our), p = parseInt(opp);
    const result = o > p ? '승' : o < p ? '패' : '무';
    this._setResult(result);
  },

  _setResult(result) {
    this.selectedResult = result;
    document.querySelectorAll('.btn-result').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.result === result);
    });
  },

  addMercenary() {
    const name = prompt('용병 이름을 입력하세요:');
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    if (this.mercenaries.includes(trimmed)) {
      alert('이미 추가된 용병입니다.'); return;
    }
    this.mercenaries.push(trimmed);
    this._renderMercenaryList();
    this._updateAllDropdowns();
  },

  removeMercenary(name) {
    this.mercenaries = this.mercenaries.filter(m => m !== name);
    this._renderMercenaryList();
    this._updateAllDropdowns();
  },

  _renderMercenaryList() {
    const el = document.getElementById('mercenary-list');
    if (!el) return;
    el.innerHTML = this.mercenaries.map(n => `
      <span class="mercenary-tag">
        ${n}
        <button type="button" onclick="record.removeMercenary('${n.replace(/'/g, "\\'")}')">×</button>
      </span>`).join('');
  },

  addGoalEntry() {
    const id = ++this.goalCounter;
    this.goalEntries.push({ id, scorer: '', assist: '없음', description: '' });
    this._renderGoalEntry(id);
    this._updateAllDropdowns();
  },

  removeGoalEntry(id) {
    this.goalEntries = this.goalEntries.filter(g => g.id !== id);
    document.getElementById('goal-entry-' + id)?.remove();
  },

  _renderGoalEntry(id) {
    const container = document.getElementById('goals-container');
    const div = document.createElement('div');
    div.className = 'goal-entry';
    div.id = 'goal-entry-' + id;
    div.innerHTML = `
      <div class="goal-entry-header">
        <span class="goal-entry-title">GOAL ${id}</span>
        <button type="button" class="btn-danger" onclick="record.removeGoalEntry(${id})">삭제</button>
      </div>
      <div class="form-group">
        <label class="form-label">득점 선수</label>
        <select class="form-select goal-scorer" id="scorer-${id}"
          onchange="record._updateGoalField(${id}, 'scorer', this.value)">
          <option value="">선수 선택</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">어시스트 선수</label>
        <select class="form-select goal-assist" id="assist-${id}"
          onchange="record._updateGoalField(${id}, 'assist', this.value)">
          <option value="없음">없음</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">상황 묘사 <span style="color:var(--gray);font-weight:400">(선택)</span></label>
        <input type="text" class="form-input goal-desc" id="desc-${id}" placeholder="예: 역습 상황에서 침착한 마무리"
          oninput="record._updateGoalField(${id}, 'description', this.value)">
      </div>`;
    container.appendChild(div);
  },

  _updateGoalField(id, field, value) {
    const entry = this.goalEntries.find(g => g.id === id);
    if (entry) entry[field] = value;
  },

  _getAvailablePlayers() {
    const checked = [...document.querySelectorAll('.member-check:checked')].map(el => el.value);
    const mercs = this.mercenaries.map(m => m + '(용병)');
    return [...checked, ...mercs];
  },

  _updateAllDropdowns() {
    const players = this._getAvailablePlayers();
    this.goalEntries.forEach(entry => {
      const scorer = document.getElementById('scorer-' + entry.id);
      const assist = document.getElementById('assist-' + entry.id);
      if (!scorer || !assist) return;

      const prevScorer = scorer.value;
      const prevAssist = assist.value;

      scorer.innerHTML = '<option value="">선수 선택</option>' +
        players.map(p => `<option value="${p}">${p}</option>`).join('');

      assist.innerHTML = '<option value="없음">없음</option>' +
        players.map(p => `<option value="${p}">${p}</option>`).join('');

      if (players.includes(prevScorer)) scorer.value = prevScorer;
      if (prevAssist === '없음' || players.includes(prevAssist)) assist.value = prevAssist;
    });
  },

  save() {
    const date     = document.getElementById('rec-date').value.trim();
    const location = document.getElementById('rec-location').value.trim();
    const opponent = document.getElementById('rec-opponent').value.trim();
    const ourScore = document.getElementById('rec-our-score').value;
    const oppScore = document.getElementById('rec-opp-score').value;
    const summary  = document.getElementById('rec-summary').value.trim();

    if (!date)     { alert('날짜를 입력하세요.'); return; }
    if (!location) { alert('장소를 입력하세요.'); return; }
    if (!opponent) { alert('상대팀 이름을 입력하세요.'); return; }
    if (ourScore === '' || oppScore === '') { alert('스코어를 입력하세요.'); return; }
    if (!this.selectedResult) { alert('결과를 선택하세요.'); return; }

    const checked = [...document.querySelectorAll('.member-check:checked')].map(el => el.value);
    const mercs = this.mercenaries.map(m => m + '(용병)');
    const members = [...checked, ...mercs];
    if (!members.length) { alert('참여 멤버를 1명 이상 선택하세요.'); return; }

    const goals = [];
    for (const entry of this.goalEntries) {
      const scorer = document.getElementById('scorer-' + entry.id)?.value;
      if (!scorer) { alert(`GOAL ${entry.id}: 득점 선수를 선택하세요.`); return; }
      goals.push({
        scorer,
        assist:      document.getElementById('assist-' + entry.id)?.value || '없음',
        description: document.getElementById('desc-' + entry.id)?.value.trim() || ''
      });
    }

    const matchData = {
      date, location, opponent,
      our_score: parseInt(ourScore),
      opp_score: parseInt(oppScore),
      result: this.selectedResult,
      members, summary
    };

    api.saveMatch(matchData, goals);
    alert('경기 기록이 저장됐습니다!');
    app.goMatches();
  }
};
