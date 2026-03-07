/**
 * Chart.js 래퍼 및 차트 렌더링
 */

class ChartManager {
  static chartInstances = {};

  /**
   * 차트 생성
   */
  static createChart(containerId, metric, years, historicalValues, currentValue, consensusValue, stats) {
    const ctx = document.getElementById(containerId);
    if (!ctx) return;

    // 기존 차트 제거
    if (ChartManager.chartInstances[containerId]) {
      ChartManager.chartInstances[containerId].destroy();
    }

    const datasets = [];
    const labels = years.map(y => y.toString());

    // 과거 데이터 (파란 실선)
    datasets.push({
      label: '과거 데이터',
      data: historicalValues,
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.05)',
      borderWidth: 2,
      pointRadius: 5,
      pointBackgroundColor: '#3b82f6',
      tension: 0.1,
      fill: false
    });

    // 현재값 (빨간 점)
    if (currentValue !== null && !isNaN(currentValue)) {
      const currentData = new Array(years.length).fill(null);
      currentData[years.length - 1] = currentValue;
      datasets.push({
        label: '현재값',
        data: currentData,
        borderColor: '#ef4444',
        backgroundColor: '#ef4444',
        pointRadius: 8,
        pointHoverRadius: 10,
        showLine: false,
        borderWidth: 0
      });
    }

    // 컨센서스 (보라 점)
    if (consensusValue !== null && !isNaN(consensusValue)) {
      const consensusData = new Array(years.length).fill(null);
      consensusData[years.length - 1] = consensusValue;
      datasets.push({
        label: '컨센서스',
        data: consensusData,
        borderColor: '#a855f7',
        backgroundColor: '#a855f7',
        pointRadius: 8,
        pointHoverRadius: 10,
        showLine: false,
        borderWidth: 0
      });
    }

    // 평균선 (초록 점선)
    if (stats.mean !== null) {
      datasets.push({
        label: `평균 (${stats.mean.toFixed(2)})`,
        data: new Array(years.length).fill(stats.mean),
        borderColor: '#10b981',
        borderDash: [5, 5],
        borderWidth: 2,
        pointRadius: 0,
        fill: false
      });
    }

    // ±1σ 밴드 (주황 점선)
    if (stats.bands.band1Up !== null) {
      datasets.push({
        label: `+1σ (${stats.bands.band1Up.toFixed(2)})`,
        data: new Array(years.length).fill(stats.bands.band1Up),
        borderColor: '#f59e0b',
        borderDash: [5, 5],
        borderWidth: 1,
        pointRadius: 0,
        fill: false
      });
      datasets.push({
        label: `-1σ (${stats.bands.band1Down.toFixed(2)})`,
        data: new Array(years.length).fill(stats.bands.band1Down),
        borderColor: '#f59e0b',
        borderDash: [5, 5],
        borderWidth: 1,
        pointRadius: 0,
        fill: false
      });
    }

    // ±2σ 밴드 (빨강 점선)
    if (stats.bands.band2Up !== null) {
      datasets.push({
        label: `+2σ (${stats.bands.band2Up.toFixed(2)})`,
        data: new Array(years.length).fill(stats.bands.band2Up),
        borderColor: '#ef4444',
        borderDash: [5, 5],
        borderWidth: 1,
        pointRadius: 0,
        fill: false
      });
      datasets.push({
        label: `-2σ (${stats.bands.band2Down.toFixed(2)})`,
        data: new Array(years.length).fill(stats.bands.band2Down),
        borderColor: '#ef4444',
        borderDash: [5, 5],
        borderWidth: 1,
        pointRadius: 0,
        fill: false
      });
    }

    const chart = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            labels: { font: { size: 11 }, padding: 10 }
          },
          title: {
            display: true,
            text: `${metric} 추이 및 분석`,
            font: { size: 14, weight: 'bold' }
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            title: { display: true, text: metric }
          }
        }
      }
    });

    ChartManager.chartInstances[containerId] = chart;
  }

  /**
   * 모든 차트 업데이트
   */
  static updateAll(data, stats) {
    const metrics = ['PER', 'PBR', 'PSR'];
    const keys = ['per', 'pbr', 'psr'];
    const currentKeys = ['currentPer', 'currentPbr', 'currentPsr'];
    const consensusKeys = ['consensusPer', 'consensusPbr', 'consensusPsr'];

    metrics.forEach((metric, i) => {
      const containerId = `chart-${keys[i]}`;
      const historicalValues = data[keys[i]];
      const currentValue = data[currentKeys[i]];
      const consensusValue = data.useConsensus ? data[consensusKeys[i]] : null;

      const statsResult = Statistics.calculate(historicalValues, currentValue);

      ChartManager.createChart(
        containerId,
        metric,
        data.years,
        historicalValues,
        currentValue,
        consensusValue,
        statsResult
      );
    });
  }

  /**
   * 차트 초기화
   */
  static clearAll() {
    Object.values(ChartManager.chartInstances).forEach(chart => {
      if (chart) chart.destroy();
    });
    ChartManager.chartInstances = {};
  }
}
