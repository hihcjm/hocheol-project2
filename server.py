"""
네이버 증권 데이터 프록시 서버
- CORS 우회
- 네이버 증권 재무정보 크롤링
- JSON 응답
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
import pandas as pd
import json
from datetime import datetime
import time

app = Flask(__name__)
CORS(app)  # CORS 활성화

# User-Agent 설정 (네이버 차단 우회)
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://finance.naver.com/',
    'Accept': '*/*',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
}

@app.route('/api/stock/naver/<code>', methods=['GET'])
def get_naver_stock_data(code):
    """
    네이버 증권에서 한국 주식 정보 조회

    요청:
        GET /api/stock/naver/005930

    응답:
        {
            "code": "005930",
            "name": "삼성전자",
            "current_price": 70000,
            "per": 8.5,
            "pbr": 0.95,
            "psr": 0.65,
            "historical": {
                "2025": {"per": 8.5, "pbr": 0.95, "psr": 0.65},
                "2024": {...},
                ...
            },
            "consensus": {
                "target_price": 75000,
                "rating": "Buy",
                "updated": "2025-03-01"
            },
            "error": null
        }
    """
    try:
        # 1. 기본 정보 조회
        company_data = get_company_info(code)
        if not company_data:
            return jsonify({"error": f"주식 코드 {code}를 찾을 수 없습니다"}), 404

        # 2. 재무 지표 조회 (최근 5년)
        financial_data = get_financial_metrics(code)

        # 3. 컨센서스 조회 (있으면)
        consensus_data = get_consensus(code)

        result = {
            "code": code,
            "name": company_data.get("name"),
            "current_price": company_data.get("current_price"),
            "per": financial_data.get("current", {}).get("per"),
            "pbr": financial_data.get("current", {}).get("pbr"),
            "psr": financial_data.get("current", {}).get("psr"),
            "historical": financial_data.get("historical", {}),
            "consensus": consensus_data,
            "error": None
        }

        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


def get_company_info(code):
    """회사 기본 정보 조회"""
    try:
        url = f"https://finance.naver.com/item/main.nhn?code={code}"
        response = requests.get(url, headers=HEADERS, timeout=10)
        response.encoding = 'utf-8'

        # 정규식으로 회사명과 현재가 추출
        import re

        # 회사명 추출
        name_match = re.search(r'<h2 class=".*?">(.*?)</h2>', response.text)
        name = name_match.group(1) if name_match else None

        # 현재가 추출
        price_match = re.search(r'<span class="blind">현재가</span>.*?<strong.*?>([\d,]+)</strong>', response.text)
        current_price = price_match.group(1).replace(',', '') if price_match else None

        return {
            "name": name,
            "current_price": int(current_price) if current_price else None
        }

    except Exception as e:
        print(f"회사 정보 조회 실패: {e}")
        return None


def get_financial_metrics(code):
    """재무 지표 (PER, PBR, PSR) 조회 - 최근 5년"""
    try:
        # 네이버 금융 API - IFRS 연결재무제표 기준
        url = "http://companyinfo.stock.naver.com/v1/company/cF4002.aspx"
        params = {
            "cmp_cd": code,
            "frq": "0",  # 연간
            "rpt": "5",  # 최근 5년
            "finGubun": "MAIN",
            "frqTyp": "0",
            "cn": ""
        }

        response = requests.get(url, params=params, headers=HEADERS, timeout=10)
        response.encoding = 'utf-8'

        # HTML 테이블을 DataFrame으로 파싱
        try:
            dfs = pd.read_html(response.text, decimal='.', thousands=',')
            if not dfs:
                return {"current": {}, "historical": {}}

            df = dfs[0]

            # 현재값과 과거 데이터 추출
            result = {
                "current": {},
                "historical": {}
            }

            # PER, PBR, PSR 행 찾기
            for idx, row in df.iterrows():
                row_str = str(row[0]).lower() if len(row) > 0 else ""

                if 'per' in row_str and 'pbr' not in row_str:
                    # PER 행
                    for year_idx in range(1, min(6, len(row))):  # 최근 5년
                        try:
                            value = float(str(row[year_idx]).replace(',', ''))
                            year = 2025 - (6 - year_idx)
                            result["historical"][str(year)] = result["historical"].get(str(year), {})
                            result["historical"][str(year)]["per"] = round(value, 2)
                        except:
                            pass
                    # 현재값 (첫 번째 컬럼)
                    try:
                        current_per = float(str(row[1]).replace(',', ''))
                        result["current"]["per"] = round(current_per, 2)
                    except:
                        pass

                elif 'pbr' in row_str:
                    # PBR 행
                    for year_idx in range(1, min(6, len(row))):
                        try:
                            value = float(str(row[year_idx]).replace(',', ''))
                            year = 2025 - (6 - year_idx)
                            result["historical"][str(year)] = result["historical"].get(str(year), {})
                            result["historical"][str(year)]["pbr"] = round(value, 2)
                        except:
                            pass
                    try:
                        current_pbr = float(str(row[1]).replace(',', ''))
                        result["current"]["pbr"] = round(current_pbr, 2)
                    except:
                        pass

                elif 'psr' in row_str:
                    # PSR 행
                    for year_idx in range(1, min(6, len(row))):
                        try:
                            value = float(str(row[year_idx]).replace(',', ''))
                            year = 2025 - (6 - year_idx)
                            result["historical"][str(year)] = result["historical"].get(str(year), {})
                            result["historical"][str(year)]["psr"] = round(value, 2)
                        except:
                            pass
                    try:
                        current_psr = float(str(row[1]).replace(',', ''))
                        result["current"]["psr"] = round(current_psr, 2)
                    except:
                        pass

            return result

        except Exception as e:
            print(f"테이블 파싱 실패: {e}")
            return {"current": {}, "historical": {}}

    except Exception as e:
        print(f"재무 지표 조회 실패: {e}")
        return {"current": {}, "historical": {}}


def get_consensus(code):
    """컨센서스 정보 조회"""
    try:
        # FnGuide 컨센서스 (한국 주식)
        url = f"https://comp.fnguide.com/SVO2/asp/SVD_Consensus.asp?ccd={code}"
        response = requests.get(url, headers=HEADERS, timeout=10)
        response.encoding = 'utf-8'

        import re

        # 목표가 추출
        target_match = re.search(r'<td.*?>(\d+[,\d]*)</td>.*?목표가', response.text[:5000])
        target_price = target_match.group(1) if target_match else None

        # 평가 추출 (Strong Buy, Buy, Hold, Sell 등)
        rating_match = re.search(r'(?:Strong Buy|Buy|Hold|Sell|Strong Sell)', response.text)
        rating = rating_match.group(0) if rating_match else None

        if target_price or rating:
            return {
                "target_price": int(target_price.replace(',', '')) if target_price else None,
                "rating": rating,
                "updated": datetime.now().strftime("%Y-%m-%d")
            }
        return None

    except Exception as e:
        print(f"컨센서스 조회 실패: {e}")
        return None


@app.route('/api/health', methods=['GET'])
def health():
    """헬스 체크"""
    return jsonify({"status": "ok", "message": "서버 정상 작동"})


if __name__ == '__main__':
    # 개발 서버 실행
    app.run(
        host='127.0.0.1',
        port=5000,
        debug=True
    )
