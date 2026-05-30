const DRAFT_KEY = 'tole_record_draft';

const record = {
  mercenaries: [],
  goalEntries: [],
  goalCounter: 0,
  selectedResult: '',
  photos: [],
  _saveTimer: null,

  init() {
    this.mercenaries = [];
    this.goalEntries = [];
    this.goalCounter = 0;
    this.selectedResult = '';
    this.photos = [];
    this._saveTimer = null;

    const draft = this._loadDraft();
    if (draft) {
      if (confirm(
        `이전에 작성 중인 기록이 있습니다.\n` +
        `마지막 저장: ${this._fmtDraftTime(draft.savedAt)}\n\n` +
        `이어서 작성하시겠습니까?`
      )) {
        this._restoreDraft(draft);
      } else {
        this._clearDraft();
        this._renderForm();
      }
    } else {
      this._renderForm();
    }
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

        <!-- STEP 1: 기본 정보 (날짜/장소/상대팀) -->
        <div class="form-section" id="section-basic">
          <div class="form-section-title">기본 정보</div>

          <div class="form-group">
            <label class="form-label">날짜</label>
            <input type="date" id="rec-date" class="form-input" value="${today}"
              oninput="record._autosaveDraft()">
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

          <button type="button" class="btn btn-step" id="btn-step-members"
            onclick="record.showStep('members')">참여 멤버 입력 →</button>
        </div>

        <!-- STEP 2: 참여 멤버 -->
        <div class="form-section step-hidden" id="section-members">
          <div class="form-section-title">참여 멤버</div>
          <div class="members-grid" id="members-grid">${checkboxes}</div>
          <div id="mercenary-list" class="mercenary-list"></div>
          <div class="step-actions">
            <button type="button" class="btn btn-secondary" onclick="record.addMercenary()">+ 용병 추가</button>
            <button type="button" class="btn btn-step" id="btn-step-goals"
              onclick="record.showStep('goals')">공격 포인트 입력 →</button>
          </div>
        </div>

        <!-- STEP 3+: 공격 포인트 / 총평 / 사진 / 결과 / 저장 -->
        <div id="section-rest" class="step-hidden">

          <div class="form-section">
            <div class="form-section-title">공격 포인트</div>
            <div id="goals-container"></div>
            <button type="button" class="btn btn-secondary" onclick="record.addGoalEntry()">+ 골 추가</button>
          </div>

          <div class="form-section">
            <div class="form-section-title">
              총평 <span class="optional">(선택)</span>
            </div>
            <textarea id="rec-summary" class="form-textarea" placeholder="경기 총평을 입력하세요..."
              oninput="record._autosaveDraft()"></textarea>
          </div>

          <div class="form-section">
            <div class="form-section-title">
              사진 첨부 <span class="optional">(선택, 최대 5장)</span>
            </div>
            <div id="photo-preview" class="photo-preview"></div>
            <div class="photo-actions">
              <input type="file" id="photo-input" accept="image/*" multiple style="display:none"
                onchange="record.addPhotos(this.files)">
              <button type="button" class="btn btn-secondary" id="photo-add-btn"
                onclick="document.getElementById('photo-input').click()">+ 사진 추가</button>
              <span id="photo-count" class="photo-count">0 / 5</span>
            </div>
          </div>

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

      </div>`;
  },

  showStep(step) {
    if (step === 'members') {
      const el = document.getElementById('section-members');
      el.classList.remove('step-hidden');
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      document.getElementById('btn-step-members').style.display = 'none';
    } else if (step === 'goals') {
      const el = document.getElementById('section-rest');
      el.classList.remove('step-hidden');
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      document.getElementById('btn-step-goals').style.display = 'none';
    }
    this._autosaveDraft();
  },

  // ── Draft / Autosave ──────────────────────────────────────────

  _autosaveDraft() {
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      try {
        const data = this._collectDraftData();
        localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
        this._updateDraftIndicator(data.savedAt);
      } catch (e) { /* localStorage quota exceeded — silent */ }
    }, 600);
  },

  _collectDraftData() {
    const visibleSections = [];
    if (!document.getElementById('section-members')?.classList.contains('step-hidden'))
      visibleSections.push('members');
    if (!document.getElementById('section-rest')?.classList.contains('step-hidden'))
      visibleSections.push('goals');

    const checkedMembers = [...document.querySelectorAll('.member-check:checked')].map(el => el.value);

    const goalsData = this.goalEntries.map(g => ({
      id:          g.id,
      scorer:      document.getElementById('scorer-' + g.id)?.value || '',
      assist:      document.getElementById('assist-' + g.id)?.value || '없음',
      description: document.getElementById('desc-' + g.id)?.value  || ''
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
      visibleSections
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
    this.photos         = [];

    this._renderForm();

    // 기본 필드
    const set = (id, val) => { const el = document.getElementById(id); if (el && val != null) el.value = val; };
    set('rec-date',      draft.date);
    set('rec-location',  draft.location);
    set('rec-opponent',  draft.opponent);
    set('rec-our-score', draft.ourScore);
    set('rec-opp-score', draft.oppScore);
    set('rec-summary',   draft.summary);

    // 결과 버튼
    if (draft.selectedResult) this._setResultSilent(draft.selectedResult);

    // 멤버 체크박스
    document.querySelectorAll('.member-check').forEach(cb => {
      cb.checked = (draft.checkedMembers || []).includes(cb.value);
    });

    // 용병 목록
    this._renderMercenaryList();

    // 골 항목 복원
    (draft.goalEntries || []).forEach(g => {
      this.goalEntries.push({ id: g.id, scorer: g.scorer, assist: g.assist, description: g.description });
      this._renderGoalEntry(g.id);
    });
    this._updateAllDropdowns();

    // 드롭다운 채우기 (업데이트 후 다시 선택값 세팅)
    (draft.goalEntries || []).forEach(g => {
      const scorer = document.getElementById('scorer-' + g.id);
      const assist = document.getElementById('assist-' + g.id);
      const desc   = document.getElementById('desc-'   + g.id);
      if (scorer) scorer.value = g.scorer;
      if (assist) assist.value = g.assist;
      if (desc)   desc.value   = g.description;
    });

    // 단계 복원
    (draft.visibleSections || []).forEach(step => {
      const sectionId = step === 'members' ? 'section-members' : 'section-rest';
      const btnId     = step === 'members' ? 'btn-step-members' : 'btn-step-goals';
      document.getElementById(sectionId)?.classList.remove('step-hidden');
      const btn = document.getElementById(btnId);
      if (btn) btn.style.display = 'none';
    });

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

  // ── Photos ───────────────────────────────────────────────────

  addPhotos(files) {
    const remaining = 5 - this.photos.length;
    if (remaining <= 0) { alert('사진은 최대 5장까지 첨부 가능합니다.'); return; }

    const toAdd = Array.from(files).slice(0, remaining);
    if (Array.from(files).length > remaining)
      alert(`최대 5장까지만 첨부 가능합니다. ${remaining}장만 추가됩니다.`);

    let loaded = 0;
    toAdd.forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
        this.photos.push({ dataUrl: e.target.result, name: file.name });
        if (++loaded === toAdd.length) this._renderPhotoPreview();
      };
      reader.readAsDataURL(file);
    });
    document.getElementById('photo-input').value = '';
  },

  removePhoto(index) {
    this.photos.splice(index, 1);
    this._renderPhotoPreview();
  },

  _renderPhotoPreview() {
    const preview = document.getElementById('photo-preview');
    const btn     = document.getElementById('photo-add-btn');
    const count   = document.getElementById('photo-count');
    if (!preview) return;

    preview.innerHTML = this.photos.map((p, i) => `
      <div class="photo-thumb">
        <img src="${p.dataUrl}" alt="첨부 사진 ${i + 1}">
        <button type="button" class="photo-thumb-del"
          onclick="record.removePhoto(${i})" title="삭제">×</button>
      </div>`).join('');

    if (count) count.textContent = `${this.photos.length} / 5`;
    if (btn)   btn.style.display = this.photos.length >= 5 ? 'none' : '';
  },

  // ── Save ─────────────────────────────────────────────────────

  save() {
    const date     = document.getElementById('rec-date').value.trim();
    const location = document.getElementById('rec-location').value.trim();
    const opponent = document.getElementById('rec-opponent').value.trim();
    const ourScore = document.getElementById('rec-our-score').value;
    const oppScore = document.getElementById('rec-opp-score').value;
    const summary  = document.getElementById('rec-summary').value.trim();

    if (!date)                                    { alert('날짜를 입력하세요.'); return; }
    if (!location)                                { alert('장소를 입력하세요.'); return; }
    if (!opponent)                                { alert('상대팀 이름을 입력하세요.'); return; }
    if (ourScore === '' || oppScore === '')        { alert('스코어를 입력하세요.'); return; }
    if (!this.selectedResult)                     { alert('결과를 선택하세요.'); return; }

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

    // TODO: this.photos 에 첨부 사진 DataURL 보관 중 — Google Drive 연동 시 업로드 처리
    api.saveMatch(matchData, goals);
    this._clearDraft();
    alert('경기 기록이 저장됐습니다!');
    app.goMatches();
  }
};
