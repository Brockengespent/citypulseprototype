/* CityPulse — слой данных (mock). Имитирует ER-схему из лаб 7:
   District → CityObject → DataSource → Measurement, плюс Metric, Forecast. */

const DATA = (() => {
  // ---- Districts ----
  const districts = [
    { id: 1, name: 'Центральный',     area_km2: 12.3, population: 230000 },
    { id: 2, name: 'Адмиралтейский',  area_km2: 14.7, population: 168000 },
    { id: 3, name: 'Петроградский',   area_km2: 22.1, population: 132000 },
    { id: 4, name: 'Васильевский',    area_km2: 21.4, population: 210000 },
    { id: 5, name: 'Калининский',     area_km2: 40.0, population: 510000 },
  ];

  // ---- Metrics catalog ----
  const metrics = [
    { code: 'traffic.speed.avg',     name: 'Средняя скорость',  unit: 'км/ч',  domain: 'transport' },
    { code: 'utilities.water.flow',  name: 'Расход воды',       unit: 'м³/ч',  domain: 'utilities' },
    { code: 'safety.incidents.count',name: 'Инциденты',         unit: 'шт/ч',  domain: 'safety' },
  ];

  // ---- Sources per district (3-5 per district) ----
  const sources = [];
  let sid = 1;
  districts.forEach(d => {
    const types = [
      { type: 'Транспортный датчик',  protocol: 'MQTT', metric: 'traffic.speed.avg' },
      { type: 'Счётчик воды',         protocol: 'REST', metric: 'utilities.water.flow' },
      { type: 'Камера + ЧС',          protocol: 'WebSocket', metric: 'safety.incidents.count' },
    ];
    types.forEach(t => {
      const count = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < count; i++) {
        sources.push({
          id: sid++,
          district_id: d.id,
          name: `${t.type} #${sid - 1}`,
          type: t.type,
          protocol: t.protocol,
          metric: t.metric,
          status: Math.random() < 0.85 ? 'online' : 'offline',
        });
      }
    });
  });

  // ---- Time series (24h of hourly measurements per source) ----
  // Deterministic-ish: per-source baseline + diurnal pattern + noise
  function genSeries(seedBase, baseValue, amplitude, noise) {
    const series = [];
    const now = new Date();
    now.setMinutes(0, 0, 0);
    for (let h = 23; h >= 0; h--) {
      const t = new Date(now.getTime() - h * 3600 * 1000);
      // diurnal: peak around 9 and 18 for traffic; trough at night for water
      const hr = t.getHours();
      const diurnal = Math.sin((hr - 6) / 24 * 2 * Math.PI);
      const rnd = (Math.sin(seedBase * 13 + h * 7) + 1) / 2; // pseudo-random 0..1
      const value = Math.max(0, baseValue + amplitude * diurnal + (rnd - 0.5) * noise);
      series.push({ ts: t.toISOString(), value: Math.round(value * 10) / 10 });
    }
    return series;
  }

  const measurements = {}; // source_id -> array of {ts, value}
  sources.forEach(s => {
    let base, amp, noise;
    if (s.metric === 'traffic.speed.avg')      { base = 38; amp = 12; noise = 6; }
    else if (s.metric === 'utilities.water.flow') { base = 240; amp = 80; noise = 50; }
    else                                       { base = 1.5; amp = 0.8; noise = 1.0; }
    measurements[s.id] = genSeries(s.id, base, amp, noise);
  });

  // ---- Aggregate district stats ----
  function districtStats(districtId) {
    const ss = sources.filter(s => s.district_id === districtId);
    const stat = { sources_total: ss.length, sources_online: ss.filter(s => s.status === 'online').length };
    for (const m of metrics) {
      const relevant = ss.filter(s => s.metric === m.code && s.status === 'online');
      if (relevant.length === 0) { stat[m.code] = null; continue; }
      const lastValues = relevant.map(s => measurements[s.id].at(-1).value);
      stat[m.code] = Math.round((lastValues.reduce((a, b) => a + b, 0) / relevant.length) * 10) / 10;
    }
    return stat;
  }

  // ---- Forecast: trivial baseline ----
  // Predicted = weighted average of last 6 hours, with mild diurnal projection.
  function forecast(metricCode, districtId, horizonHours) {
    const ss = sources.filter(s => s.district_id === districtId && s.metric === metricCode && s.status === 'online');
    if (ss.length === 0) return null;
    const allRecent = [];
    ss.forEach(s => {
      const series = measurements[s.id];
      allRecent.push(...series.slice(-6).map(p => p.value));
    });
    if (allRecent.length === 0) return null;
    const mean = allRecent.reduce((a, b) => a + b, 0) / allRecent.length;
    const std = Math.sqrt(allRecent.reduce((a, b) => a + (b - mean) ** 2, 0) / allRecent.length);
    const horizonAdj = 1 + 0.02 * horizonHours; // mild trend factor
    const p50 = mean * horizonAdj;
    const p10 = Math.max(0, p50 - 1.28 * std);
    const p90 = p50 + 1.28 * std;
    const mape = Math.min(0.35, 0.06 + 0.01 * horizonHours);
    return {
      p10: Math.round(p10 * 10) / 10,
      p50: Math.round(p50 * 10) / 10,
      p90: Math.round(p90 * 10) / 10,
      mape: Math.round(mape * 1000) / 10, // percent
      model: 'baseline-naive-v0.1',
      generated_at: new Date().toISOString(),
    };
  }

  return { districts, metrics, sources, measurements, districtStats, forecast };
})();
