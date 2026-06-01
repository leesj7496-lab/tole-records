const DRAFT_KEY = 'tole_record_draft';

const record = {
  mercenaries: [],
  goalEntries: [],
  goalCounter: 0,
  selectedResult: '',
  _saveTimer: null,
  _editMatchId: null,   // 수정 모드 시 자기 자신 match_id (중복 체크 제외용)

  init() {
    this.mercenaries = [];
    this.goalEntries = [];
    this.goalCounter = 0;
    this.selectedResult = '';
    this._saveTimer = null;
    this._pendingDraft = null;
    this._editMatchId = null;

    const draft = this._loadDraft();
    if (draft) {
      this._showDraftPrompt(draft);
    } else {
      this._renderForm();
    }
  },

  peekDraft() {
    return this._loadDraft();
  },

  _draftPreviewHtml(draft) {
    const date = draft.date
      ? draft.date.replace(/-/g, '.')
      : '날짜 미입력';
    const location = (draft.location || '').trim() || '장소 미입력';
    const opponent = (draft.opponent || '').trim() || '상대팀 미입력';
    return `
      <dl class="draft-preview">
        <div class="draft-preview-row">
          <dt>날짜</dt>
          <dd>${this._escHtml(date)}</dd>
        </div>
        <div class="draft-preview-row">
          <dt>장소</dt>
          <dd>${this._escHtml(location)}</dd>
        </div>
        <div class="draft-preview-row">
          <dt>상대팀</dt>
          <dd>${this._escHtml(opponent)}</dd>
        </div>
      </dl>`;
  },

  _escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  _showDraftPrompt(draft) {
    this._pendingDraft = draft;
    document.getElementById('record-form-content').innerHTML = `
      <div class="draft-prompt">
        <div class="draft-prompt-icon">📋</div>
        <h3 class="draft-prompt-title">이전 작성 중인 기록이 있습니다</h3>
        <p class="draft-prompt-time">마지막 저장: ${this._fmtDraftTime(draft.savedAt)}</p>
        ${this._draftPreviewHtml(draft)}
        <div class="draft-prompt-actions">
          <button class="btn btn-primary" onclick="record._resumeDraft()">이어서 작성</button>
          <button class="btn btn-step" onclick="record._startFresh()">새로 작성</button>
          <button class="btn btn-ghost" onclick="app.back()">돌아가기</button>
        </div>
      </div>`;
  },

  _resumeDraft() {
    const draft = this._pendingDraft;
    this._pendingDraft = null;
    this._restoreDraft(draft);
  },

  _startFresh() {
    this._clearDraft();
    this._pendingDraft = null;
    this._renderForm();
  },

  // ── Form Render ──────────────────────────────────────────────

  _renderForm() {
    const players = api.getPlayers();
    const today = new Date().toISOString().slice(0, 10);

    const checkboxes = players.map(p => `
      <label class="member-check-label">
        <input type="checkbox" class="member-check" value="${p}" onchange="record._autosaveDraft()">
        ${p}
      </label>`).join('');

    document.getElementById('record-form-content').innerHTML = `
      <div class="record-form">
        <div id="draft-indicator" class="draft-indicator"></div>

        <!-- STEP 1: 기본 정보 -->
        <div class="step-block" id="step-1">
          <div class="step-summary-bar" id="step-1-summary-bar">
            <div class="step-summary-content">
              <span class="step-badge">1</span>
              <span id="step-1-summary-text" class="step-summary-label"></span>
            </div>
            <button type="button" class="btn-step-edit" onclick="record.expandStep(1)">수정</button>
          </div>
          <div class="step-form" id="step-1-form">
            <div class="form-section">
              <div class="form-section-title">기본 정보</div>
              <div class="form-group">
                <label class="form-label">날짜</label>
                <input type="date" id="rec-date" class="form-input" value="${today}"
                  oninput="record._onDateChange()">
              </div>
              <div class="form-group">
                <label class="form-label">장소</label>
                <input type="text" id="rec-location" class="form-input" placeholder="경기 장소"
                  oninput="record._autosaveDraft()">
              </div>
              <div class="form-group">
                <label class="form-label">상대팀</label>
                <input type="text" id="rec-opponent" class="form-input" placeholder="상대팀 이름"
                  oninput="record._autosaveDraft()">
              </div>
              <p id="date-dup-error" style="display:none;color:var(--loss);font-size:0.83rem;margin:0 0 8px;line-height:1.5">
                해당 날짜에 이미 경기 기록이 있습니다.
              </p>
              <button type="button" class="btn btn-step" onclick="record.nextStep(1)">참여 멤버 입력 →</button>
            </div>
          </div>
        </div>

        <!-- STEP 2: 참여 멤버 -->
        <div class="step-block" id="step-2">
          <div class="step-summary-bar" id="step-2-summary-bar">
            <div class="step-summary-content">
              <span class="step-badge">2</span>
              <span id="step-2-summary-text" class="step-summary-label"></span>
            </div>
            <button type="button" class="btn-step-edit" onclick="record.expandStep(2)">수정</button>
          </div>
          <div class="step-form" id="step-2-form" style="display:none">
            <div class="form-section">
              <div class="form-section-title">참여 멤버</div>
              <div class="members-grid" id="members-grid">${checkboxes}</div>
              <div id="mercenary-list" class="mercenary-list"></div>
              <div class="step-actions">
                <button type="button" class="btn btn-secondary" onclick="record.addMercenary()">+ 용병 추가</button>
                <button type="button" class="btn btn-step" onclick="record.nextStep(2)">경기 내용 입력 →</button>
              </div>
            </div>
          </div>
        </div>

        <!-- STEP 3: 경기 내용 (공격포인트 + 총평) -->
        <div class="step-block" id="step-3">
          <div class="step-summary-bar" id="step-3-summary-bar">
            <div class="step-summary-content">
              <span class="step-badge">3</span>
              <span id="step-3-summary-text" class="step-summary-label"></span>
            </div>
            <button type="button" class="btn-step-edit" onclick="record.expandStep(3)">수정</button>
          </div>
          <div class="step-form" id="step-3-form" style="display:none">
            <div class="form-section">
              <div class="form-section-title">공격 포인트</div>
              <div id="goals-container"></div>
              <button type="button" class="btn btn-secondary" onclick="record.addGoalEntry()">+ 골 추가</button>
            </div>
            <div class="form-section">
              <div class="form-section-title">총평 <span class="optional">(선택)</span></div>
              <textarea id="rec-summary" class="form-textarea" placeholder="경기 총평을 입력하세요..."
                oninput="record._autosaveDraft()"></textarea>
            </div>
            <button type="button" class="btn btn-step" onclick="record.nextStep(3)">결과 입력 →</button>
          </div>
        </div>

        <!-- STEP 4: 결과 -->
        <div class="step-block" id="step-4">
          <div class="step-form" id="step-4-form" style="display:none">
            <div class="form-section">
              <div class="form-section-title">결과</div>
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
                <label class="form-label">승 / 무 / 패</label>
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
            <button type="button" class="btn btn-primary btn-save" onclick="record.save()">저장하기</button>
          </div>
        </div>

      </div>`;
  },

  // ── Step Navigation ──────────────────────────────────────────

  nextStep(n) {
    if (n === 1) {
      const date  = document.getElementById('rec-date')?.value;
      const errEl = document.getElementById('date-dup-error');
      if (errEl) errEl.style.display = 'none';
      if (!date) { alert('날짜를 입력하세요.'); return; }
      if (this._hasDupDate(date)) {
        if (errEl) errEl.style.display = '';
        return;
      }
    }

    const summaryText = this[`_getStep${n}Summary`]();
    document.getElementById(`step-${n}-summary-text`).textContent = summaryText;
    document.getElementById(`step-${n}-summary-bar`).style.display = 'flex';
    document.getElementById(`step-${n}-form`).style.display = 'none';

    const nextForm = document.getElementById(`step-${n + 1}-form`);
    if (nextForm) {
      nextForm.style.display = 'block';
      setTimeout(() => nextForm.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }

    this._autosaveDraftNow();
  },

  _onDateChange() {
    const errEl = document.getElementById('date-dup-error');
    if (errEl) errEl.style.display = 'none';
    this._autosaveDraft();
  },

  _hasDupDate(date) {
    return api.getMatches().some(m =>
      m.date === date && m.match_id !== this._editMatchId
    );
  },

  expandStep(n) {
    document.getElementById(`step-${n}-summary-bar`).style.display = 'none';
    const form = document.getElementById(`step-${n}-form`);
    form.style.display = 'block';
    setTimeout(() => form.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  },

  _getStep1Summary() {
    const date = document.getElementById('rec-date')?.value || '';
    const loc  = document.getElementById('rec-location')?.value || '';
    const opp  = document.getElementById('rec-opponent')?.value || '';
    const parts = [];
    if (date) parts.push(date.replace(/-/g, '.'));
    if (loc)  parts.push(loc);
    if (opp)  parts.push('vs ' + opp);
    return parts.join(' · ') || '기본 정보';
  },

  _getStep2Summary() {
    const checked = document.querySelectorAll('.member-check:checked').length;
    const mercs   = this.mercenaries.length;
    const total   = checked + mercs;
    let text = `참여 멤버 ${total}명 선택됨`;
    if (mercs > 0) text += ` (용병 ${mercs}명 포함)`;
    return text;
  },

  _getStep3Summary() {
    const goals = this.goalEntries.length;
    const hasSummary = !!(document.getElementById('rec-summary')?.value?.trim());
    const parts = [`골 ${goals}개`];
    if (hasSummary) parts.push('총평 작성');
    return parts.join(' · ');
  },

  // ── Draft / Autosave ──────────────────────────────────────────

  _autosaveDraft() {
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this._autosaveDraftNow(), 600);
  },

  _autosaveDraftNow() {
    try {
      const data = this._collectDraftData();
      localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
      this._updateDraftIndicator(data.savedAt);
    } catch (e) { /* quota exceeded */ }
  },

  _collectDraftData() {
    const collapsedSteps = [];
    const stepSummaries  = {};
    for (let i = 1; i <= 3; i++) {
      const bar = document.getElementById(`step-${i}-summary-bar`);
      if (bar && bar.style.display === 'flex') {
        collapsedSteps.push(i);
        const txt = document.getElementById(`step-${i}-summary-text`)?.textContent;
        if (txt) stepSummaries[i] = txt;
      }
    }

    const checkedMembers = [...document.querySelectorAll('.member-check:checked')].map(el => el.value);

    const goalsData = this.goalEntries.map(g => ({
      id:          g.id,
      scorer:      document.getElementById('scorer-' + g.id)?.value || '',
      assist:      document.getElementById('assist-' + g.id)?.value || '없음',
      description: document.getElementById('desc-'   + g.id)?.value || ''
    }));

    return {
      savedAt:        new Date().toISOString(),
      date:           document.getElementById('rec-date')?.value      || '',
      location:       document.getElementById('rec-location')?.value  || '',
      opponent:       document.getElementById('rec-opponent')?.value  || '',
      ourScore:       document.getElementById('rec-our-score')?.value || '',
      oppScore:       document.getElementById('rec-opp-score')?.value || '',
      selectedResult: this.selectedResult,
      checkedMembers,
      mercenaries:    this.mercenaries,
      goalCounter:    this.goalCounter,
      goalEntries:    goalsData,
      summary:        document.getElementById('rec-summary')?.value   || '',
      collapsedSteps,
      stepSummaries
    };
  },

  _loadDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  },

  _clearDraft() {
    localStorage.removeItem(DRAFT_KEY);
    const el = document.getElementById('draft-indicator');
    if (el) { el.textContent = ''; el.classList.remove('visible'); }
  },

  _restoreDraft(draft) {
    this.mercenaries    = draft.mercenaries || [];
    this.goalCounter    = draft.goalCounter || 0;
    this.goalEntries    = [];
    this.selectedResult = draft.selectedResult || '';

    this._renderForm();

    // 기본 필드
    const set = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.value = val; };
    set('rec-date',      draft.date);
    set('rec-location',  draft.location);
    set('rec-opponent',  draft.opponent);
    set('rec-our-score', draft.ourScore);
    set('rec-opp-score', draft.oppScore);
    set('rec-summary',   draft.summary);

    if (draft.selectedResult) this._setResultSilent(draft.selectedResult);

    document.querySelectorAll('.member-check').forEach(cb => {
      cb.checked = (draft.checkedMembers || []).includes(cb.value);
    });

    this._renderMercenaryList();

    (draft.goalEntries || []).forEach(g => {
      this.goalEntries.push({ id: g.id, scorer: g.scorer, assist: g.assist, description: g.description });
      this._renderGoalEntry(g.id);
    });
    this._updateAllDropdowns();
    (draft.goalEntries || []).forEach(g => {
      const scorer = document.getElementById('scorer-' + g.id);
      const assist = document.getElementById('assist-' + g.id);
      const desc   = document.getElementById('desc-'   + g.id);
      if (scorer) scorer.value = g.scorer;
      if (assist) assist.value = g.assist;
      if (desc)   desc.value   = g.description;
    });

    // 단계 상태 복원
    const collapsed = draft.collapsedSteps || [];
    collapsed.forEach(n => {
      const bar  = document.getElementById(`step-${n}-summary-bar`);
      const form = document.getElementById(`step-${n}-form`);
      const txt  = document.getElementById(`step-${n}-summary-text`);
      if (bar)  bar.style.display  = 'flex';
      if (form) form.style.display = 'none';
      if (txt && draft.stepSummaries?.[n]) txt.textContent = draft.stepSummaries[n];
    });

    // 현재 활성 단계만 노출
    const activeStep = collapsed.length > 0 ? Math.max(...collapsed) + 1 : 1;
    for (let i = 1; i <= 4; i++) {
      const form = document.getElementById(`step-${i}-form`);
      if (!form) continue;
      if (i === activeStep) {
        form.style.display = 'block';
      } else if (!collapsed.includes(i)) {
        form.style.display = 'none';
      }
    }

    this._updateDraftIndicator(draft.savedAt);
  },

  _updateDraftIndicator(isoTime) {
    const el = document.getElementById('draft-indicator');
    if (!el) return;
    const d = new Date(isoTime);
    const hms = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    el.innerHTML = `<span class="draft-check">✓</span> 임시저장됨 · ${hms}`;
    el.classList.add('visible');
  },

  _fmtDraftTime(isoStr) {
    const d = new Date(isoStr);
    const M = String(d.getMonth() + 1).padStart(2, '0');
    const D = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${M}/${D} ${h}:${m}`;
  },

  // ── Result ───────────────────────────────────────────────────

  _autoResult() {
    const our = document.getElementById('rec-our-score').value;
    const opp = document.getElementById('rec-opp-score').value;
    if (our === '' || opp === '') return;
    const o = parseInt(our), p = parseInt(opp);
    this._setResult(o > p ? '승' : o < p ? '패' : '무');
  },

  _setResult(result) {
    this.selectedResult = result;
    document.querySelectorAll('.btn-result').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.result === result);
    });
    this._autosaveDraft();
  },

  _setResultSilent(result) {
    this.selectedResult = result;
    document.querySelectorAll('.btn-result').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.result === result);
    });
  },

  // ── Members ──────────────────────────────────────────────────

  addMercenary() {
    const name = prompt('용병 이름을 입력하세요:');
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    if (this.mercenaries.includes(trimmed)) { alert('이미 추가된 용병입니다.'); return; }
    this.mercenaries.push(trimmed);
    this._renderMercenaryList();
    this._updateAllDropdowns();
    this._autosaveDraft();
  },

  removeMercenary(name) {
    this.mercenaries = this.mercenaries.filter(m => m !== name);
    this._renderMercenaryList();
    this._updateAllDropdowns();
    this._autosaveDraft();
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

  // ── Goals ────────────────────────────────────────────────────

  addGoalEntry() {
    const id = ++this.goalCounter;
    this.goalEntries.push({ id, scorer: '', assist: '없음', description: '' });
    this._renderGoalEntry(id);
    this._updateAllDropdowns();
    this._autosaveDraft();
  },

  removeGoalEntry(id) {
    this.goalEntries = this.goalEntries.filter(g => g.id !== id);
    document.getElementById('goal-entry-' + id)?.remove();
    this._autosaveDraft();
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
        <input type="text" class="form-input goal-desc" id="desc-${id}"
          placeholder="예: 역습 상황에서 침착한 마무리"
          oninput="record._updateGoalField(${id}, 'description', this.value)">
      </div>`;
    container.appendChild(div);
  },

  _updateGoalField(id, field, value) {
    const entry = this.goalEntries.find(g => g.id === id);
    if (entry) entry[field] = value;
    this._autosaveDraft();
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

  // ── Save ─────────────────────────────────────────────────────

  async save() {
    const date     = document.getElementById('rec-date').value.trim();
    const location = document.getElementById('rec-location').value.trim();
    const opponent = document.getElementById('rec-opponent').value.trim();
    const ourScore = document.getElementById('rec-our-score').value;
    const oppScore = document.getElementById('rec-opp-score').value;
    const summary  = document.getElementById('rec-summary').value.trim();

    if (!date)                              { alert('날짜를 입력하세요.'); return; }
    if (!location)                          { alert('장소를 입력하세요.'); return; }
    if (!opponent)                          { alert('상대팀 이름을 입력하세요.'); return; }
    if (ourScore === '' || oppScore === '') { alert('스코어를 입력하세요.'); return; }
    if (!this.selectedResult)              { alert('결과를 선택하세요.'); return; }
    if (this._hasDupDate(date))            { alert('해당 날짜에 이미 경기 기록이 있습니다.'); return; }

    const checked = [...document.querySelectorAll('.member-check:checked')].map(el => el.value);
    const mercs   = this.mercenaries.map(m => m + '(용병)');
    const members = [...checked, ...mercs];
    if (!members.length) { alert('참여 멤버를 1명 이상 선택하세요.'); return; }

    const goals = [];
    for (const entry of this.goalEntries) {
      const scorer = document.getElementById('scorer-' + entry.id)?.value;
      if (!scorer) { alert(`GOAL ${entry.id}: 득점 선수를 선택하세요.`); return; }
      goals.push({
        scorer,
        assist:      document.getElementById('assist-' + entry.id)?.value || '없음',
        description: document.getElementById('desc-'   + entry.id)?.value.trim() || ''
      });
    }

    const matchData = {
      date, location, opponent,
      our_score: parseInt(ourScore),
      opp_score: parseInt(oppScore),
      result: this.selectedResult,
      members, summary
    };

    const btn = document.querySelector('.btn-save');
    if (btn) { btn.textContent = '저장 중...'; btn.disabled = true; }

    try {
      await api.saveMatch(matchData, goals);
    } catch(e) {
      alert(`저장에 실패했습니다.\n${e.message}`);
      if (btn) { btn.textContent = '저장하기'; btn.disabled = false; }
      return;
    }

    this._clearDraft();
    alert('경기 기록이 저장됐습니다!');
    app.goMatches();
  }
};
