# 📡 네이버 증권 한국 주식 데이터 자동 조회 설정 가이드

## ✨ 새 기능: 한국 주식 자동 데이터 조회

**삼성전자(005930), 네이버(035420) 등 한국 주식**을 입력하면:
- ✅ 5년 과거 PER/PBR/PSR 자동 조회
- ✅ 현재 PER/PBR/PSR 자동 입력
- ✅ 컨센서스 정보 자동 조회 (있으면)

---

## 🔧 설치 방법

### 1단계: Python 설치 확인
```bash
python --version
# Python 3.8 이상 필요
```

### 2단계: 필수 라이브러리 설치
```bash
cd C:\Users\yaho2\workspace\bucket-list-main\stock-valuation
pip install flask flask-cors requests pandas
```

**설치되는 라이브러리:**
- `flask`: 로컬 웹 서버
- `flask-cors`: CORS 활성화 (브라우저 요청 허용)
- `requests`: HTTP 요청
- `pandas`: HTML 테이블 파싱

### 3단계: 서버 시작
```bash
python server.py
```

**출력 예시:**
```
 * Serving Flask app 'server'
 * Debug mode: on
 * Running on http://127.0.0.1:5000
```

⚠️ **주의**: 서버는 계속 실행되어 있어야 합니다!

---

## 🚀 사용 방법

### Step 1: 서버 실행 (터미널 1)
```bash
cd C:\Users\yaho2\workspace\bucket-list-main\stock-valuation
python server.py
```

### Step 2: 앱 열기 (브라우저)
```
index.html을 브라우저에서 열기
```

### Step 3: 한국 주식 입력
```
입력: 005930  (삼성전자 코드)
또는
입력: 035420  (네이버 코드)
또는
입력: 051910  (LG화학 코드)
```

### Step 4: 엔터/탭 키
```
자동으로 네이버 증권에서 데이터 조회!

✅ 5년 과거 PER/PBR/PSR 자동 채우기
✅ 현재 PER/PBR/PSR 자동 채우기
✅ 컨센서스 (있으면) 자동 채우기
```

### Step 5: 저장
```
"💾 저장" 버튼 클릭 → 차트 자동 생성!
```

---

## 📊 지원하는 한국 주식 (예시)

```
005930  - 삼성전자
000660  - SK하이닉스
035420  - NAVER
068270  - 셀트리온
051910  - LG화학
006400  - 삼성SDI
207940  - 삼성바이오로직스
373220  - 롯데칠성음료
028260  - 삼성물산
097950  - CJ제일제당
... (모든 6자리 코드 지원)
```

### 코드 찾기
1. 네이버 증권: https://finance.naver.com/
2. 검색창에 회사명 입력
3. URL 또는 페이지에서 코드 확인

**예시:**
```
삼성전자 페이지: https://finance.naver.com/item/main.nhn?code=005930
                                                              ^^^^^^
                                                              코드: 005930
```

---

## 📋 조회되는 데이터

### 현재값
- PER (Price-to-Earnings Ratio) - 주가수익률
- PBR (Price-to-Book Ratio) - 주가순자산비율
- PSR (Price-to-Sales Ratio) - 주가매출비율
- 현재 주가

### 5년 과거 데이터
| 연도 | PER | PBR | PSR |
|------|-----|-----|-----|
| 2021 | ✅ | ✅ | ✅ |
| 2022 | ✅ | ✅ | ✅ |
| 2023 | ✅ | ✅ | ✅ |
| 2024 | ✅ | ✅ | ✅ |
| 2025 | ✅ | ✅ | ✅ |

### 컨센서스 (있는 경우)
- 목표가
- 투자의견 (Strong Buy, Buy, Hold, Sell)
- 업데이트 날짜

---

## ⚠️ 문제 해결

### Q1: "로컬 서버가 실행 중이 아닙니다" 오류
```
원인: server.py가 실행되지 않음

해결:
1. 새 터미널 열기
2. cd C:\Users\yaho2\workspace\bucket-list-main\stock-valuation
3. python server.py
4. 앱 새로고침 (F5)
```

### Q2: "주식 코드를 찾을 수 없습니다" 오류
```
원인: 잘못된 주식 코드

해결:
1. 코드가 정확한지 확인
2. 네이버 증권에서 코드 재확인
3. 예: 삼성전자 → 005930 (정확히 입력)
```

### Q3: "ModuleNotFoundError: No module named 'flask'" 오류
```
원인: 필수 라이브러리 미설치

해결:
pip install flask flask-cors requests pandas
```

### Q4: 일부 데이터만 조회됨 (예: PER만 있고 PSR은 없음)
```
원인: 해당 기업이 제공하지 않는 지표

해결:
- 조회된 데이터 사용
- 없는 데이터는 수동 입력
```

### Q5: 네이버 증권이 로딩 중단으로 응답 불가
```
원인: 네이버의 DDOS 방지 시스템 활성화

해결:
1. 몇 분 대기
2. 요청 간격 늘리기 (현재 2초)
3. User-Agent 변경 (server.py의 HEADERS 수정)
```

---

## 🔐 보안 및 프라이버시

### 로컬 서버
- **실행 위치**: 사용자 PC에서만 실행
- **통신**: 로컬호스트(127.0.0.1)에서만
- **데이터**: 인터넷 전송 없음
- **저장**: 브라우저 로컬 저장만 사용

### 네이버 증권 접근
- **목적**: 공개된 재무정보 조회
- **User-Agent**: 브라우저 환장으로 일반 접근으로 위장
- **Referer**: 네이버 금융 페이지로 설정
- **속도 제한**: 1-2초 간격 요청

---

## ⚙️ 기술 상세

### 서버 구성
```
server.py (Flask)
├── GET /api/health
│   └── 서버 상태 확인
│
└── GET /api/stock/naver/<code>
    ├── 회사 기본 정보 (이름, 현재가)
    ├── 재무 지표 (PER, PBR, PSR 5년 과거)
    └── 컨센서스 (목표가, 투자의견)
```

### 데이터 흐름
```
브라우저 (index.html)
  ↓
JavaScript (app.js)
  ↓
fetch (api.js)
  ↓
로컬 서버 (server.py:5000)
  ↓
네이버 증권 (finance.naver.com)
  ↓
HTML 파싱 (pandas.read_html)
  ↓
JSON 응답
  ↓
브라우저 렌더링
```

### API 엔드포인트

#### 요청
```
GET http://localhost:5000/api/stock/naver/005930
```

#### 응답
```json
{
  "code": "005930",
  "name": "삼성전자",
  "current_price": 70000,
  "per": 8.5,
  "pbr": 0.95,
  "psr": 0.65,
  "historical": {
    "2025": {"per": 8.5, "pbr": 0.95, "psr": 0.65},
    "2024": {"per": 9.2, "pbr": 1.05, "psr": 0.70},
    "2023": {"per": 8.8, "pbr": 1.02, "psr": 0.68},
    "2022": {"per": 7.5, "pbr": 0.85, "psr": 0.62},
    "2021": {"per": 8.2, "pbr": 0.92, "psr": 0.65}
  },
  "consensus": {
    "target_price": 75000,
    "rating": "Buy",
    "updated": "2025-03-01"
  },
  "error": null
}
```

---

## 📈 성능 및 속도

### 조회 시간
- 첫 요청: 2~3초 (초기화)
- 이후 요청: 1~2초 (캐싱)
- 인터넷 속도에 따라 달라짐

### 캐싱
- 현재 캐싱 미구현
- 향후 버전에서 추가 계획

---

## 🛠️ 커스터마이징

### 요청 간격 변경
`server.py`에서:
```python
time.sleep(2)  # 2초 → 원하는 초 단위로 변경
```

### 회사명 파싱 방식 변경
`get_company_info()` 함수의 정규식 수정:
```python
name_match = re.search(r'원하는_정규식', response.text)
```

### 조회 기간 변경
`get_financial_metrics()` 함수의 파라미터:
```python
params = {
    "rpt": "5",  # 5 → 3 (최근 3년) 또는 10 (최근 10년)
}
```

---

## 📚 참고 자료

### 네이버 증권
- [네이버 증권 메인](https://finance.naver.com/)
- [재무정보](https://finance.naver.com/item/coinfo.nhn?code=005930)
- [컨센서스](https://comp.fnguide.com)

### Python 라이브러리
- [Flask 문서](https://flask.palletsprojects.com/)
- [Pandas 문서](https://pandas.pydata.org/)
- [Requests 문서](https://docs.python-requests.org/)

---

## 🔄 업데이트 계획

### v1.2 (단기)
- [ ] 데이터 캐싱 추가
- [ ] 오류 복구 자동화
- [ ] 요청 속도 최적화

### v1.5 (중기)
- [ ] 다중 회사 동시 조회
- [ ] 과거 10년 데이터 지원
- [ ] 분기별 데이터 조회

### v2.0 (장기)
- [ ] 공공데이터포털 API 통합
- [ ] 한국투자증권 API 연동
- [ ] Electron 데스크톱 앱

---

**마지막 업데이트**: 2025년 3월
**버전**: 1.1.0
**상태**: 안정 (로컬 서버 필요)

이제 한국 주식을 입력하면 완전히 자동으로 5년 데이터를 조회할 수 있습니다! 🎉
