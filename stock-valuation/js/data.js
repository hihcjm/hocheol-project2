/**
 * 주식 데이터 모델 및 LocalStorage 관리
 */

class StockData {
  constructor() {
    this.tickerList = this.loadTickerList();
    this.currentTicker = this.loadLastTicker();
  }

  /**
   * 연도 배열 생성 (최근 5년)
   */
  static getYears() {
    const now = new Date();
    const currentYear = now.getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - 4 + i);
  }

  /**
   * 빈 데이터 구조 생성
   */
  static createEmptyData() {
    return {
      ticker: '',
      years: StockData.getYears(),
      per: [null, null, null, null, null],
      pbr: [null, null, null, null, null],
      psr: [null, null, null, null, null],
      currentPer: null,
      currentPbr: null,
      currentPsr: null,
      consensusPer: null,
      consensusPbr: null,
      consensusPsr: null,
      useConsensus: false
    };
  }

  /**
   * 저장된 티커 목록 로드
   */
  loadTickerList() {
    try {
      const data = localStorage.getItem('stock-valuation-tickers');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to load ticker list:', e);
      return [];
    }
  }

  /**
   * 마지막으로 본 티커 로드
   */
  loadLastTicker() {
    try {
      return localStorage.getItem('stock-valuation-lastTicker') || '';
    } catch (e) {
      console.error('Failed to load last ticker:', e);
      return '';
    }
  }

  /**
   * 데이터 로드 (티커별)
   */
  loadData(ticker) {
    if (!ticker) {
      return StockData.createEmptyData();
    }

    try {
      const key = `stock-valuation-${ticker}`;
      const data = localStorage.getItem(key);
      if (!data) {
        const empty = StockData.createEmptyData();
        empty.ticker = ticker;
        return empty;
      }
      return JSON.parse(data);
    } catch (e) {
      console.error(`Failed to load data for ${ticker}:`, e);
      return StockData.createEmptyData();
    }
  }

  /**
   * 데이터 저장
   */
  saveData(data) {
    if (!data.ticker || data.ticker.trim() === '') {
      alert('티커명을 입력하세요.');
      return false;
    }

    try {
      const ticker = data.ticker.trim().toUpperCase();

      // 티커 목록에 추가 (중복 제거)
      if (!this.tickerList.includes(ticker)) {
        this.tickerList.push(ticker);
        localStorage.setItem('stock-valuation-tickers', JSON.stringify(this.tickerList));
      }

      // 데이터 저장
      data.ticker = ticker;
      const key = `stock-valuation-${ticker}`;
      localStorage.setItem(key, JSON.stringify(data));

      // 마지막 티커 저장
      localStorage.setItem('stock-valuation-lastTicker', ticker);
      this.currentTicker = ticker;

      alert(`${ticker} 데이터가 저장되었습니다.`);
      return true;
    } catch (e) {
      console.error('Failed to save data:', e);
      alert('저장 실패: ' + e.message);
      return false;
    }
  }

  /**
   * 티커 삭제
   */
  deleteTicker(ticker) {
    try {
      this.tickerList = this.tickerList.filter(t => t !== ticker);
      localStorage.setItem('stock-valuation-tickers', JSON.stringify(this.tickerList));

      const key = `stock-valuation-${ticker}`;
      localStorage.removeItem(key);

      if (this.currentTicker === ticker) {
        this.currentTicker = this.tickerList[0] || '';
        localStorage.setItem('stock-valuation-lastTicker', this.currentTicker);
      }

      return true;
    } catch (e) {
      console.error('Failed to delete ticker:', e);
      alert('삭제 실패: ' + e.message);
      return false;
    }
  }
}

// 전역 인스턴스
const stockData = new StockData();
