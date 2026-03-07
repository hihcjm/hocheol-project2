/**
 * Vercel Serverless Function - 네이버 증권 API
 *
 * 사용:
 * GET /api/naver?code=005930
 *
 * CORS 문제를 우회하고 클라우드에서 데이터를 크롤링합니다.
 */

const https = require('https');
const http = require('http');

/**
 * HTTP 요청 유틸리티
 */
function fetchUrl(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const defaultHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://finance.naver.com/',
      'Accept': '*/*',
      'Accept-Language': 'ko-KR,ko;q=0.9',
      ...headers
    };

    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;

    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: defaultHeaders,
      timeout: 10000
    };

    const req = client.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

/**
 * 회사 기본 정보 추출
 */
function parseCompanyInfo(html) {
  try {
    // 회사명
    const nameMatch = html.match(/<h2[^>]*>(.*?)<\/h2>/);
    const name = nameMatch ? nameMatch[1].replace(/<[^>]+>/g, '').trim() : null;

    // 현재가
    const priceMatch = html.match(/현재가<\/span>.*?<strong[^>]*>([\d,]+)<\/strong>/s);
    const currentPrice = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : null;

    return { name, currentPrice };
  } catch (e) {
    console.error('회사 정보 파싱 실패:', e);
    return { name: null, currentPrice: null };
  }
}

/**
 * 재무 지표 (PER, PBR, PSR) 추출
 */
function parseFinancialMetrics(html) {
  try {
    const result = {
      current: {},
      historical: {}
    };

    // 정규식으로 PER, PBR, PSR 찾기
    // 네이버 금융은 <tr> 구조로 데이터 제공

    // PER 찾기
    const perMatch = html.match(/(?:주가수익률|PER)[\s\S]{0,500}?<td[^>]*>([\d.]+)<\/td>/i);
    if (perMatch) {
      const per = parseFloat(perMatch[1]);
      result.current.per = per;
    }

    // PBR 찾기
    const pbrMatch = html.match(/(?:주가순자산비율|PBR|주가순자산)[\s\S]{0,500}?<td[^>]*>([\d.]+)<\/td>/i);
    if (pbrMatch) {
      const pbr = parseFloat(pbrMatch[1]);
      result.current.pbr = pbr;
    }

    // PSR 찾기
    const psrMatch = html.match(/(?:주가매출비율|PSR|주가매출)[\s\S]{0,500}?<td[^>]*>([\d.]+)<\/td>/i);
    if (psrMatch) {
      const psr = parseFloat(psrMatch[1]);
      result.current.psr = psr;
    }

    // 과거 데이터는 컴프레스드 형식으로 제공되므로 파싱 복잡
    // 클라이언트에서 수동 입력 안내

    return result;
  } catch (e) {
    console.error('재무 지표 파싱 실패:', e);
    return { current: {}, historical: {} };
  }
}

/**
 * 메인 핸들러
 */
module.exports = async (req, res) => {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONS 요청 처리
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 쿼리 파라미터에서 코드 추출
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({
      error: '주식 코드가 필요합니다.',
      example: '/api/naver?code=005930'
    });
  }

  // 6자리 숫자 검증
  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({
      error: '올바른 주식 코드가 아닙니다. (6자리 숫자)',
      example: '/api/naver?code=005930'
    });
  }

  try {
    // 1. 기본 정보 조회
    const mainUrl = `https://finance.naver.com/item/main.nhn?code=${code}`;
    const mainResponse = await fetchUrl(mainUrl);

    if (mainResponse.status !== 200) {
      return res.status(404).json({
        error: `주식 코드 ${code}를 찾을 수 없습니다.`,
        statusCode: mainResponse.status
      });
    }

    const companyInfo = parseCompanyInfo(mainResponse.body);

    // 2. 재무정보 페이지에서 지표 조회
    const coInfoUrl = `https://finance.naver.com/item/coinfo.naver?code=${code}`;
    const coInfoResponse = await fetchUrl(coInfoUrl);

    let financialMetrics = { current: {}, historical: {} };
    if (coInfoResponse.status === 200) {
      financialMetrics = parseFinancialMetrics(coInfoResponse.body);
    }

    // 3. 응답 구성
    const result = {
      code,
      name: companyInfo.name,
      currentPrice: companyInfo.currentPrice,
      per: financialMetrics.current.per || null,
      pbr: financialMetrics.current.pbr || null,
      psr: financialMetrics.current.psr || null,
      historical: financialMetrics.historical,
      consensus: null,
      timestamp: new Date().toISOString(),
      note: '5년 과거 데이터는 클라이언트에서 수동 입력이 필요합니다.'
    };

    return res.status(200).json(result);

  } catch (error) {
    console.error('API 오류:', error);
    return res.status(500).json({
      error: '데이터 조회 중 오류가 발생했습니다.',
      message: error.message
    });
  }
};
