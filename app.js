/* CityPulse prototype — UI logic. */

let selectedDistrict = DATA.districts[0].id;
let trafficChart = null;
let waterChart = null;

// ---- Render district cards ----
function renderDistricts() {
  const grid = document.getElementById('districts');
  grid.innerHTML = '';
  DATA.districts.forEach(d => {
    const stat = DATA.districtStats(d.id);
    const card = document.createElement('div');
    card.className = 'card' + (d.id === selectedDistrict ? ' selected' : '');
    card.dataset.id = d.id;
    const speedV = stat['traffic.speed.avg'];
    const waterV = stat['utilities.water.flow'];
    const incV = stat['safety.incidents.count'];
    const speedClass = speedV == null ? '' : speedV < 25 ? 'warn' : 'good';
    const incClass = incV == null ? '' : incV > 1.5 ? 'warn' : 'good';
    card.innerHTML = `
      <div class="card-name">${d.name}</div>
      <div class="card-meta">${d.population.toLocaleString('ru')} жителей · ${d.area_km2} км²</div>
      <div class="metric-row">
        <span class="metric-label">Источников онлайн</span>
        <span class="metric-value">${stat.sources_online} / ${stat.sources_total}</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Средняя скорость</span>
        <span class="metric-value ${speedClass}">${speedV ?? '—'} км/ч</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Расход воды</span>
        <span class="metric-value">${waterV ?? '—'} м³/ч</span>
      </div>
      <div class="metric-row">
        <span class="metric-label">Инциденты</span>
        <span class="metric-value ${incClass}">${incV ?? '—'} шт/ч</span>
      </div>
    `;
    card.addEventListener('click', () => {
      selectedDistrict = d.id;
      renderDistricts();
      renderSources();
      renderCharts();
      clearForecast();
    });
    grid.appendChild(card);
  });
}

// ---- Render sources table ----
function renderSources() {
  const wrap = document.getElementById('sources-table-wrap');
  const sources = DATA.sources.filter(s => s.district_id === selectedDistrict);
  if (sources.length === 0) { wrap.innerHTML = '<div class="empty">Нет данных по этому району</div>'; return; }
  const rows = sources.map(s => {
    const series = DATA.measurements[s.id];
    const last = series && series.length ? series.at(-1) : null;
    const metric = DATA.metrics.find(m => m.code === s.metric);
    const statusPill = s.status === 'online'
      ? '<span class="pill pill-ok">online</span>'
      : '<span class="pill pill-warn">offline</span>';
    return `<tr>
      <td>${s.name}</td>
      <td>${s.type}</td>
      <td><span class="pill pill-neutral">${s.protocol}</span></td>
      <td>${metric ? metric.name : s.metric}</td>
      <td>${last ? last.value + ' ' + (metric ? metric.unit : '') : '—'}</td>
      <td>${statusPill}</td>
    </tr>`;
  }).join('');
  wrap.innerHTML = `<table>
    <thead><tr>
      <th>Источник</th><th>Тип</th><th>Протокол</th><th>Показатель</th>
      <th>Последнее значение</th><th>Статус</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

// ---- Build a 24h time series aggregated across district sources ----
function aggSeries(metricCode) {
  const ss = DATA.sources.filter(s => s.district_id === selectedDistrict && s.metric === metricCode && s.status === 'online');
  if (ss.length === 0) return { labels: [], values: [] };
  // assume all have same 24 hourly points
  const points = DATA.measurements[ss[0].id];
  const labels = points.map(p => {
    const d = new Date(p.ts);
    return d.getHours().toString().padStart(2, '0') + ':00';
  });
  const values = points.map((_, idx) => {
    const sum = ss.reduce((acc, s) => acc + DATA.measurements[s.id][idx].value, 0);
    return Math.round((sum / ss.length) * 10) / 10;
  });
  return { labels, values };
}

function renderCharts() {
  const traffic = aggSeries('traffic.speed.avg');
  const water = aggSeries('utilities.water.flow');
  if (trafficChart) trafficChart.destroy();
  if (waterChart) waterChart.destroy();
  const baseOpts = (label, color) => ({
    type: 'line',
    data: { labels: traffic.labels, datasets: [{ label, data: [], borderColor: color, backgroundColor: color + '22', fill: true, tension: 0.3, pointRadius: 2 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
  });
  trafficChart = new Chart(document.getElementById('chart-traffic'), {
    ...baseOpts('км/ч', '#2E5A88'),
    data: { labels: traffic.labels, datasets: [{ label: 'км/ч', data: traffic.values, borderColor: '#2E5A88', backgroundColor: '#2E5A8822', fill: true, tension: 0.3, pointRadius: 2 }] },
  });
  waterChart = new Chart(document.getElementById('chart-water'), {
    ...baseOpts('м³/ч', '#3F6E3F'),
    data: { labels: water.labels, datasets: [{ label: 'м³/ч', data: water.values, borderColor: '#3F6E3F', backgroundColor: '#3F6E3F22', fill: true, tension: 0.3, pointRadius: 2 }] },
  });
}

// ---- Forecast ----
function runForecast() {
  const metric = document.getElementById('metric-select').value;
  const horizon = parseInt(document.getElementById('horizon-select').value, 10);
  const btn = document.getElementById('forecast-btn');
  btn.disabled = true;
  btn.textContent = 'Расчёт...';
  // simulate async (vibe-coded "loading" UX)
  setTimeout(() => {
    const f = DATA.forecast(metric, selectedDistrict, horizon);
    const wrap = document.getElementById('forecast-result');
    const district = DATA.districts.find(d => d.id === selectedDistrict);
    const m = DATA.metrics.find(x => x.code === metric);
    if (!f) {
      wrap.innerHTML = `<div class="forecast-result" style="border-left-color: var(--warn);">
        В районе «${district.name}» нет онлайн-источников для показателя «${m.name}».
      </div>`;
    } else {
      wrap.innerHTML = `<div class="forecast-result">
        Прогноз показателя <b>«${m.name}»</b> в районе <b>${district.name}</b> на ближайшие ${horizon} ч:
        <div style="margin-top:8px;">
          <span class="num">${f.p50}</span>
          <span style="font-size:14px;color:var(--muted);">${m.unit}</span>
          &nbsp;·&nbsp;
          интервал [${f.p10}, ${f.p90}]
        </div>
        <div style="margin-top:6px; font-size:12px; color:var(--muted);">
          Ожидаемая ошибка прогноза (MAPE): ${f.mape}%
          &nbsp;·&nbsp; модель: <code>${f.model}</code>
        </div>
      </div>`;
    }
    btn.disabled = false;
    btn.textContent = 'Получить прогноз';
  }, 400);
}

function clearForecast() {
  document.getElementById('forecast-result').innerHTML = '';
}

// ---- Boot ----
document.addEventListener('DOMContentLoaded', () => {
  renderDistricts();
  renderSources();
  renderCharts();
  document.getElementById('forecast-btn').addEventListener('click', runForecast);
});
