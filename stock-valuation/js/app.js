/**
 * 메인 애플리케이션 로직 및 이벤트 바인딩
 */

// Finnhub API 설정
const FINNHUB_API_KEY = 'cgfquvhr01qjg3jqk9a0cgfquvhr01qjg3jqk9ag';  // 무료 API 키
const FINNHUB_API_URL = 'https://finnhub.io/api/v1';

class StockValuationApp {
  constructor() {
    this.data = StockData.createEmptyData();
    this.init();
  }

  /**
   * 초기화
   */
  init() {
    this.setupEventListeners();
    this.renderYearHeaders();
    this.renderTickerList();

    // 마지막 티커 데이터 복원
    if (stockData.currentTicker) {
      this.loadTicker(stockData.currentTicker);
    }
  }

  /**
   * 연도 헤더 렌더링
   */
  renderYearHeaders() {
    const years = StockData.getYears();
    years.forEach((year, i) => {
      const header = document.getElementById(`year-${i}`);
      if (header) header.textContent = year;
    });
  }

  /**
   * 이벤트 리스너 설정
   */
  setupEventListeners() {
    // 티커 입력 변경 감지
    const tickerInput = document.getElementById('ticker-input');
    tickerInput.addEventListener('change', () => this.onDataChange());
    tickerInput.addEventListener('blur', () => this.fetchStockDataFromAPI());

    document.getElementById('consensus-toggle').addEventListener('change', () => this.onConsensusToggle());

    // 과거 데이터 입력
    ['per', 'pbr', 'psr'].forEach(key => {
      for (let i = 0; i < 5; i++) {
        const input = document.getElementById(`${key}-${i}`);
        if (input) input.addEventListener('change', () => this.onDataChange());
      }
    });

    // 현재값 입력
    ['currentPer', 'currentPbr', 'currentPsr'].forEach(key => {
      const input = document.getElementById(key);
      if (input) input.addEventListener('change', () => this.onDataChange());
    });

    // 컨센서스 입력
    ['consensusPer', 'consensusPbr', 'consensusPsr'].forEach(key => {
      const input = document.getElementById(key);
      if (input) input.addEventListener('change', () => this.onDataChange());
    });

    // 저장 버튼
    document.getElementById('save-btn').addEventListener('click', () => this.saveData());

    // 엑셀 다운로드
    document.getElementById('export-btn').addEventListener('click', () => this.exportToExcel());
  }

  /**
   * 데이터 변경 감지
   */
  onDataChange() {
    this.readFormData();
    this.updateCharts();
    this.updateResults();
  }

  /**
   * 컨센서스 토글
   */
  onConsensusToggle() {
    this.data.useConsensus = document.getElementById('consensus-toggle').checked;
    const consensusRows = document.querySelectorAll('[data-consensus-row]');
    consensusRows.forEach(row => {
      row.style.display = this.data.useConsensus ? '' : 'none';
    });
    this.onDataChange();
  }

  /**
   * 폼 데이터 읽기
   */
  readFormData() {
    this.data.ticker = document.getElementById('ticker-input').value.trim();

    ['per', 'pbr', 'psr'].forEach(key => {
      for (let i = 0; i < 5; i++) {
        const input = document.getElementById(`${key}-${i}`);
        const value = parseFloat(input.value);
        this.data[key][i] = isNaN(value) ? null : value;
      }
    });

    ['currentPer', 'currentPbr', 'currentPsr'].forEach(key => {
      const input = document.getElementById(key);
      const value = parseFloat(input.value);
      this.data[key] = isNaN(value) ? null : value;
    });

    if (this.data.useConsensus) {
      ['consensusPer', 'consensusPbr', 'consensusPsr'].forEach(key => {
        const input = document.getElementById(key);
        const value = parseFloat(input.value);
        this.data[key] = isNaN(value) ? null : value;
      });
    }
  }

  /**
   * 폼에 데이터 표시
   */
  displayFormData(data) {
    document.getElementById('ticker-input').value = data.ticker;
    document.getElementById('consensus-toggle').checked = data.useConsensus;

    ['per', 'pbr', 'psr'].forEach(key => {
      for (let i = 0; i < 5; i++) {
        const input = document.getElementById(`${key}-${i}`);
        input.value = data[key][i] !== null ? data[key][i] : '';
      }
    });

    ['currentPer', 'currentPbr', 'currentPsr'].forEach(key => {
      const input = document.getElementById(key);
      input.value = data[key] !== null ? data[key] : '';
    });

    if (data.useConsensus) {
      ['consensusPer', 'consensusPbr', 'consensusPsr'].forEach(key => {
        const input = document.getElementById(key);
        input.value = data[key] !== null ? data[key] : '';
      });
    }

    const consensusRows = document.querySelectorAll('[data-consensus-row]');
    consensusRows.forEach(row => {
      row.style.display = data.useConsensus ? '' : 'none';
    });

    this.data = JSON.parse(JSON.stringify(data));
  }

  /**
   * 차트 업데이트
   */
  updateCharts() {
    ChartManager.updateAll(this.data, {});
  }

  /**
   * 결과 패널 업데이트
   */
  updateResults() {
    const metrics = ['per', 'pbr', 'psr'];
    const currentKeys = ['currentPer', 'currentPbr', 'currentPsr'];

    metrics.forEach((key, i) => {
      const stats = Statistics.calculate(this.data[key], this.data[currentKeys[i]]);
      this.updateResultCard(key, stats);
    });
  }

  /**
   * 결과 카드 업데이트
   */
  updateResultCard(metric, stats) {
    const card = document.getElementById(`result-${metric}`);
    if (!card) return;

    let html = `<h3 class="text-lg font-semibold mb-4">${metric.toUpperCase()}</h3>`;

    if (stats.mean === null) {
      html += '<p class="text-gray-500">데이터를 입력하세요.</p>';
    } else {
      html += `
        <div class="space-y-3">
          <div class="flex justify-between text-sm">
            <span>평균</span>
            <span class="font-semibold">${stats.mean.toFixed(2)}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span>표준편차</span>
            <span class="font-semibold">${stats.stdev.toFixed(2)}</span>
          </div>
          <hr class="my-2" />
      `;

      if (stats.zScore !== null) {
        const interp = stats.interpretation;
        html += `
          <div class="flex justify-between text-sm">
            <span>Z-Score</span>
            <span class="font-semibold">${stats.zScore.toFixed(2)}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-500">평가</span>
            <span class="px-2 py-1 rounded text-white text-xs font-semibold" style="background-color: ${interp.color}">
              ${interp.label}
            </span>
          </div>

          <!-- 게이지 바 -->
          <div class="mt-4">
            <div class="text-xs text-gray-500 mb-2">밴드 위치 (-2σ ~ +2σ)</div>
            <div class="relative h-6 bg-gray-200 rounded overflow-hidden">
              <div class="absolute inset-0 flex">
                <div class="flex-1" style="background: linear-gradient(90deg, #ef4444, #f59e0b, #3b82f6, #f59e0b, #ef4444)"></div>
              </div>
              <div class="absolute inset-y-0 bg-white border-2 border-black" style="left: ${this.getGaugePosition(stats)}%; width: 2px; top: 0; bottom: 0;"></div>
              <div class="absolute top-0 bottom-0 flex items-center text-white text-xs font-bold" style="left: ${this.getGaugePosition(stats)}%; transform: translateX(-50%); margin-top: 22px;">
                ${stats.zScore.toFixed(1)}
              </div>
            </div>
          </div>
        `;
      }

      html += '</div>';
    }

    card.innerHTML = html;
  }

  /**
   * 게이지 바 위치 계산
   */
  getGaugePosition(stats) {
    const zScore = Math.max(-2, Math.min(2, stats.zScore));
    return ((zScore + 2) / 4) * 100;
  }

  /**
   * 티커 저장
   */
  saveData() {
    this.readFormData();
    if (stockData.saveData(this.data)) {
      this.renderTickerList();
    }
  }

  /**
   * 티커 로드
   */
  loadTicker(ticker) {
    const data = stockData.loadData(ticker);
    this.displayFormData(data);
    this.onDataChange();
  }

  /**
   * 티커 삭제
   */
  deleteTicker(ticker) {
    if (!confirm(`${ticker}을(를) 삭제하시겠습니까?`)) return;

    stockData.deleteTicker(ticker);
    this.renderTickerList();

    if (this.data.ticker === ticker) {
      this.data = StockData.createEmptyData();
      this.displayFormData(this.data);
      this.onDataChange();
    }
  }

  /**
   * 티커 목록 렌더링
   */
  renderTickerList() {
    const list = document.getElementById('ticker-list');
    const tickers = stockData.tickerList;

    if (tickers.length === 0) {
      list.innerHTML = '<p class="text-gray-500 text-sm">저장된 항목이 없습니다.</p>';
      return;
    }

    list.innerHTML = tickers.map(ticker => `
      <div class="flex items-center justify-between p-2 bg-gray-100 rounded hover:bg-gray-200 group cursor-pointer">
        <span class="text-sm font-medium flex-1" onclick="app.loadTicker('${ticker}')">${ticker}</span>
        <button onclick="app.deleteTicker('${ticker}')" class="px-2 py-1 text-xs bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity">
          삭제
        </button>
      </div>
    `).join('');
  }

  /**
   * API에서 주식 데이터 가져오기
   * 한국 주식: 5년 과거 데이터 + 현재값 + 컨센서스 자동 조회
   * 해외 주식: 현재값만 조회 (과거 데이터는 API 미지원)
   */
  async fetchStockDataFromAPI() {
    const ticker = this.data.ticker.trim();
    if (!ticker) return;

    // 로딩 표시
    const btn = document.getElementById('save-btn');
    const originalText = btn.textContent;
    btn.textContent = '⏳ 데이터 조회 중...';
    btn.disabled = true;

    try {
      const stockData = await StockAPI.fetchStockData(ticker);

      if (!stockData) {
        // 한국 주식인데 서버가 없는 경우
        if (/^\d{6}$/.test(ticker.toUpperCase())) {
          alert(`${ticker} 정보를 찾을 수 없습니다.\n\n⚠️ Python 서버가 필요합니다.\n\n명령어:\npython server.py\n\n그 후 다시 시도하세요.`);
        } else {
          alert(`${ticker} 정보를 찾을 수 없습니다.\n\nFinnhub는 미국 나스닥/뉴욕 주식만 지원합니다.\n한국 주식은 수동 입력을 권장합니다.`);
        }
        btn.textContent = originalText;
        btn.disabled = false;
        return;
      }

      // 1. 현재값 자동 채우기
      if (stockData.pe) {
        document.getElementById('currentPer').value = stockData.pe.toFixed(2);
      }
      if (stockData.pb) {
        document.getElementById('currentPbr').value = stockData.pb.toFixed(2);
      }
      if (stockData.ps) {
        document.getElementById('currentPsr').value = stockData.ps.toFixed(2);
      }

      // 2. 5년 과거 데이터 자동 채우기 (한국 주식만)
      if (stockData.historical && Object.keys(stockData.historical).length > 0) {
        const years = StockData.getYears();
        years.forEach((year, index) => {
          const yearData = stockData.historical[year.toString()];
          if (yearData) {
            if (yearData.per !== undefined && yearData.per !== null) {
              document.getElementById(`per-${index}`).value = yearData.per;
            }
            if (yearData.pbr !== undefined && yearData.pbr !== null) {
              document.getElementById(`pbr-${index}`).value = yearData.pbr;
            }
            if (yearData.psr !== undefined && yearData.psr !== null) {
              document.getElementById(`psr-${index}`).value = yearData.psr;
            }
          }
        });
      }

      // 3. 컨센서스 자동 채우기 (있는 경우)
      if (stockData.consensus) {
        // 컨센서스 토글 활성화
        document.getElementById('consensus-toggle').checked = true;
        this.onConsensusToggle();

        // 컨센서스 값이 있으면 현재값으로 채우기
        if (stockData.consensus.target_price) {
          // 목표가 기반으로 예상 PER/PBR 계산 (근사값)
          const currentPrice = stockData.price;
          const targetPrice = stockData.consensus.target_price;
          if (currentPrice && targetPrice && stockData.pe) {
            const perRatio = targetPrice / currentPrice;
            document.getElementById('consensusPer').value = (stockData.pe * perRatio).toFixed(2);
          }
        }
      }

      // 4. 완료 메시지
      let message = `✅ ${stockData.name || ticker} 데이터 로드 완료!\n\n`;
      message += `현재 PER: ${stockData.pe?.toFixed(2) || 'N/A'}\n`;
      message += `현재 PBR: ${stockData.pb?.toFixed(2) || 'N/A'}\n`;

      if (stockData.historical && Object.keys(stockData.historical).length > 0) {
        message += `\n✅ 5년 과거 데이터도 자동 입력됨!\n`;
      }

      if (stockData.consensus) {
        message += `✅ 컨센서스 정보도 자동 입력됨!`;
      }

      alert(message);
      this.onDataChange();

    } catch (error) {
      console.error('API 오류:', error);
      alert('데이터 조회 중 오류가 발생했습니다.\n콘솔(F12)에서 오류를 확인해주세요.');
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  }

  /**
   * 엑셀 다운로드
   */
  exportToExcel() {
    this.readFormData();

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];

    // Sheet1: 입력 데이터
    const sheet1Data = [
      ['주식 가치평가 데이터'],
      ['생성일', dateStr],
      ['티커', this.data.ticker],
      [''],
      ['연도', ...this.data.years],
      ['PER', ...this.data.per.map(v => v !== null ? v : '')],
      ['PBR', ...this.data.pbr.map(v => v !== null ? v : '')],
      ['PSR', ...this.data.psr.map(v => v !== null ? v : '')],
      [''],
      ['현재 PER', this.data.currentPer !== null ? this.data.currentPer : ''],
      ['현재 PBR', this.data.currentPbr !== null ? this.data.currentPbr : ''],
      ['현재 PSR', this.data.currentPsr !== null ? this.data.currentPsr : '']
    ];

    if (this.data.useConsensus) {
      sheet1Data.push(['']);
      sheet1Data.push(['컨센서스 PER', this.data.consensusPer !== null ? this.data.consensusPer : '']);
      sheet1Data.push(['컨센서스 PBR', this.data.consensusPbr !== null ? this.data.consensusPbr : '']);
      sheet1Data.push(['컨센서스 PSR', this.data.consensusPsr !== null ? this.data.consensusPsr : '']);
    }

    // Sheet2: 통계 결과
    const sheet2Data = [['지표', '평균', '표준편차', '-2σ', '-1σ', '+1σ', '+2σ', 'Z-Score', '평가']];

    const keyMap = {
      'per': 'currentPer',
      'pbr': 'currentPbr',
      'psr': 'currentPsr'
    };

    ['per', 'pbr', 'psr'].forEach(key => {
      const currentKey = keyMap[key];
      const stats = Statistics.calculate(this.data[key], this.data[currentKey]);
      sheet2Data.push([
        key.toUpperCase(),
        stats.mean !== null ? stats.mean.toFixed(2) : '',
        stats.stdev !== null ? stats.stdev.toFixed(2) : '',
        stats.bands.band2Down !== null ? stats.bands.band2Down.toFixed(2) : '',
        stats.bands.band1Down !== null ? stats.bands.band1Down.toFixed(2) : '',
        stats.bands.band1Up !== null ? stats.bands.band1Up.toFixed(2) : '',
        stats.bands.band2Up !== null ? stats.bands.band2Up.toFixed(2) : '',
        stats.zScore !== null ? stats.zScore.toFixed(2) : '',
        stats.interpretation.label
      ]);
    });

    // 통합 워크북
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheet1Data), '입력데이터');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sheet2Data), '통계결과');

    XLSX.writeFile(wb, `stock-valuation-${this.data.ticker}-${dateStr}.xlsx`);
  }
}

// 앱 시작
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new StockValuationApp();
});
