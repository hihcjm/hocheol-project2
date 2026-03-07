/**
 * 주식 데이터 API (Finnhub 해외 주식 + 수동 입력 한국 주식)
 *
 * Finnhub:
 * - 해외 주식 지원 (미국, 유럽 등)
 * - 무료 API 키 (월 제한: 60회/분)
 * - PER, PBR, PSR 실시간 데이터
 *
 * 주의: CORS 정책상 브라우저에서 직접 API 호출
 *      네이버 증권은 CORS 제한으로 수동 입력만 가능
 */

class StockAPI {
  // Finnhub API (해외 주식)
  // 주의: 클라이언트 사이드에 API 키 노출되지만, 무료 키이고 사용량 제한이 있으므로 위험 낮음
  static FINNHUB_API_KEY = 'cgfquvhr01qjg3jqk9a0cgfquvhr01qjg3jqk9ag';
  static FINNHUB_API_URL = 'https://finnhub.io/api/v1';

  /**
   * Finnhub에서 회사 정보 검색
   */
  static async searchCompany(symbol) {
    try {
      const response = await fetch(
        `${this.FINNHUB_API_URL}/search?q=${symbol}&token=${this.FINNHUB_API_KEY}`
      );
      const data = await response.json();
      return data.result || [];
    } catch (error) {
      console.error('검색 실패:', error);
      return [];
    }
  }

  /**
   * Finnhub에서 주식 기본 정보 가져오기
   */
  static async getQuote(symbol) {
    try {
      const response = await fetch(
        `${this.FINNHUB_API_URL}/quote?symbol=${symbol}&token=${this.FINNHUB_API_KEY}`
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('시세 조회 실패:', error);
      return null;
    }
  }

  /**
   * Finnhub에서 회사 프로필 가져오기 (PER, PBR 등)
   */
  static async getCompanyProfile(symbol) {
    try {
      const response = await fetch(
        `${this.FINNHUB_API_URL}/stock/profile2?symbol=${symbol}&token=${this.FINNHUB_API_KEY}`
      );
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('회사 정보 조회 실패:', error);
      return null;
    }
  }

  /**
   * 네이버 증권에서 한국 주식 정보 가져오기
   *
   * 환경 자동 감지:
   * - 로컬 개발: localhost:5000 (server.py)
   * - Vercel 배포: /api/naver (Serverless Function)
   */
  static async getNaverStockInfo(stockCode) {
    try {
      // 환경 감지 및 API URL 선택
      let apiUrl;
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        // 로컬 개발 환경
        apiUrl = `http://localhost:5000/api/stock/naver/${stockCode}`;
      } else {
        // Vercel 배포 환경
        apiUrl = `/api/naver?code=${stockCode}`;
      }

      console.log(`[API] ${window.location.hostname} → ${apiUrl}`);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.warn(`${stockCode} 정보를 찾을 수 없습니다. (Status: ${response.status})`);
        return null;
      }

      const data = await response.json();

      if (data.error) {
        console.warn(`오류: ${data.error}`);
        return null;
      }

      // 응답 데이터 정규화
      return {
        symbol: stockCode,
        name: data.name,
        price: data.currentPrice || data.current_price,
        pe: data.per,
        pb: data.pbr,
        ps: data.psr,
        historical: data.historical || {},
        consensus: data.consensus || null
      };

    } catch (error) {
      console.error('네이버 증권 조회 실패:', error);

      // 환경별 에러 메시지
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        if (error.message.includes('Failed to fetch')) {
          console.warn('⚠️ 로컬 서버가 실행 중이 아닙니다.');
          console.warn('명령어를 실행하세요: python server.py');
        }
      } else {
        console.warn('⚠️ 클라우드 서버에서 데이터를 불러올 수 없습니다.');
        console.warn('Vercel 함수가 배포되었는지 확인하세요.');
      }

      return null;
    }
  }

  /**
   * 종합: 기호로 주식 데이터 조회
   * symbol: 'AAPL' (해외) 또는 '005930' (한국)
   *
   * 한국 주식 사용 시 주의:
   * 1. 로컬 Python 서버(server.py)가 실행 중이어야 합니다.
   * 2. 명령어: python server.py
   */
  static async fetchStockData(symbol) {
    // 기호 정규화
    const upperSymbol = symbol.toUpperCase().trim();

    // 한국 주식 (6자리 숫자)
    if (/^\d{6}$/.test(upperSymbol)) {
      console.log(`한국 주식 코드: ${upperSymbol}`);
      return await this.getNaverStockInfo(upperSymbol);
    }

    // 해외 주식 (Finnhub)
    console.log(`해외 주식 기호: ${upperSymbol}`);
    const quote = await this.getQuote(upperSymbol);
    const profile = await this.getCompanyProfile(upperSymbol);

    if (!quote || Object.keys(quote).length === 0) {
      console.warn(`${upperSymbol} 정보를 찾을 수 없습니다.`);
      return null;
    }

    return {
      symbol: upperSymbol,
      name: profile?.name || upperSymbol,
      price: quote.c,  // 현재가
      pe: profile?.pe || null,  // PER
      pb: profile?.valuation?.priceToBook || null,  // PBR
      ps: profile?.valuation?.priceToSales || null,  // PSR
      eps: quote.eps || null,
      dividend: profile?.dividendYield || null,
      marketCap: profile?.marketCapitalization || null,
      industry: profile?.finnhubIndustry || null,
      historical: null,  // Finnhub는 5년 과거 데이터 미지원
      consensus: null
    };
  }

  /**
   * 기간별 과거 데이터 조회 (5년 추이)
   * 주의: Finnhub 무료 플랜에서는 제한적
   */
  static async getHistoricalData(symbol, years = 5) {
    try {
      // 5년 전 날짜
      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - years);

      const from = Math.floor(startDate.getTime() / 1000);
      const to = Math.floor(endDate.getTime() / 1000);

      const response = await fetch(
        `${this.FINNHUB_API_URL}/stock/candle?symbol=${symbol}&resolution=M&from=${from}&to=${to}&token=${this.FINNHUB_API_KEY}`
      );

      const data = await response.json();

      if (data.s !== 'ok') {
        console.warn('과거 데이터 조회 실패');
        return null;
      }

      // 월별 데이터를 연도별로 그룹화
      const yearlyData = {};
      data.t?.forEach((timestamp, index) => {
        const date = new Date(timestamp * 1000);
        const year = date.getFullYear();
        if (!yearlyData[year]) {
          yearlyData[year] = [];
        }
        yearlyData[year].push(data.c[index]);
      });

      // 연도별 평균가 계산
      const result = {};
      Object.keys(yearlyData).forEach(year => {
        const prices = yearlyData[year];
        const avg = prices.reduce((a, b) => a + b) / prices.length;
        result[year] = avg;
      });

      return result;
    } catch (error) {
      console.error('과거 데이터 조회 실패:', error);
      return null;
    }
  }
}
