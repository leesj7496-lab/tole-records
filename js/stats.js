const stats = {
  currentTab: 'goals',

  init() {
    this.currentTab = 'goals';
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === 'goals');
    });
    this._render('goals');
  },

  showTab(type, el) {
    this.currentTab = type;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    this._render(type);
  },

  _render(type) {
    const container = document.getElementById('stats-content');
    const data = this._calculate(type);

    if (!data.length) {
      const labels = { goals: '골', assists: '어시스트', attendance: '참석' };
      container.innerHTML = `<div class="stats-empty">아직 ${labels[type]} 기록이 없습니다.</div>`;
      return;
    }

    const maxCount = data[0].count;
    const labels = { goals: '골', assists: '어시스트', attendance: '경기' };
    const unit = labels[type];

    const items = data.map((entry, i) => {
      const rankClass = i === 0 ? 'top-1' : i === 1 ? 'top-2' : i === 2 ? 'top-3' : '';
      const barPct = maxCount > 0 ? Math.round(entry.count / maxCount * 100) : 0;
      return `
        <div class="stat-item ${rankClass}">
          <div class="stat-rank">${i + 1}</div>
          <div class="stat-name">${entry.name}</div>
          <div class="stat-right">
            <div class="stat-count">${entry.count}<span style="font-size:0.7rem;font-weight:400;color:var(--gray);margin-left:2px">${unit}</span></div>
            <div class="stat-bar-wrap">
              <div class="stat-bar" style="width:${barPct}%"></div>
            </div>
          </div>
        </div>`;
    }).join('');

    container.innerHTML = `<div class="stats-list">${items}</div>`;
  },

  _calculate(type) {
    const players = new Set(api.getPlayers());
    const counts = {};
    players.forEach(p => { counts[p] = 0; });

    if (type === 'goals') {
      api.getMatches().forEach(m => {
        api.getGoals(m.match_id).forEach(g => {
          if (players.has(g.scorer)) counts[g.scorer] = (counts[g.scorer] || 0) + 1;
        });
      });
    } else if (type === 'assists') {
      api.getMatches().forEach(m => {
        api.getGoals(m.match_id).forEach(g => {
          if (g.assist !== '없음' && players.has(g.assist))
            counts[g.assist] = (counts[g.assist] || 0) + 1;
        });
      });
    } else if (type === 'attendance') {
      api.getMatches().forEach(m => {
        (m.members || []).forEach(name => {
          if (players.has(name)) counts[name] = (counts[name] || 0) + 1;
        });
      });
    }

    return Object.entries(counts)
      .filter(([, c]) => c > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }
};
