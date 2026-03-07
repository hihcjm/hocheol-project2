# 📡 API 가이드 - Finnhub 자동 데이터 조회

## ✨ 새 기능: 미국 주식 자동 데이터 조회

버전 1.1부터 **Finnhub API**를 통해 미국/유럽 주식의 실시간 데이터를 자동으로 조회할 수 있습니다.

---

## 🚀 사용 방법

### 1단계: 미국 주식 입력
```
입력: AAPL
```

### 2단계: 엔터 또는 탭 키 누르기
```
자동으로 Finnhub API에 요청 전송
```

### 3단계: 데이터 자동 조회
```
✅ 현재 PER 자동 채우기
✅ 현재 PBR 자동 채우기
✅ 회사 정보 표시 (산업, 시가총액 등)
```

---

## 📊 자동 조회되는 데이터

| 항목 | 설명 | 자동 채우기 |
|------|------|-----------|
| PER | 주가수익률 | ✅ 예 |
| PBR | 주가순자산비율 | ✅ 예 |
| PSR | 주가매출비율 | ⚠️ 제한적 |
| 현재가 | 실시간 주가 | ✅ 예 |
| 회사명 | 정식 회사명 | ✅ 예 |
| 산업 | 업종 분류 | ✅ 예 |
| 시가총액 | Market Cap | ✅ 예 |

---

## ✅ 지원하는 주식

### 미국 (나스닥/뉴욕 거래소)
```
AAPL    - Apple
GOOGL   - Alphabet (Google)
MSFT    - Microsoft
AMZN    - Amazon
META    - Meta Platforms (Facebook)
TSLA    - Tesla
NVIDIA  - NVIDIA
AMD     - Advanced Micro Devices
INTEL   - Intel
...
```

### 유럽
```
SAP     - SAP SE (독일)
ASML    - ASML (네덜란드)
...
```

### 기타
```
TSMC    - Taiwan Semiconductor (대만)
...
```

### ❌ 미지원 (한국 주식)
```
삼성전자, 네이버, 카카오, SK하이닉스 등
→ 수동 입력 권장
```

---

## ⚙️ 기술 상세

### Finnhub API
- **제공자**: Finnhub
- **URL**: https://finnhub.io/api/v1
- **인증**: API 키 기반 (클라이언트 사이드)
- **CORS**: ✅ 지원
- **제한**: 월별 호출 제한

### API 엔드포인트

#### 1. 검색 (Search)
```
GET /search?q=AAPL&token=API_KEY
응답: 검색된 회사 목록
```

#### 2. 시세 조회 (Quote)
```
GET /quote?symbol=AAPL&token=API_KEY
응답: {
  c: 150.50,      // 현재가 (Close)
  h: 151.00,      // 고가 (High)
  l: 149.50,      // 저가 (Low)
  o: 150.00,      // 시가 (Open)
  pc: 150.10,     // 이전 종가
  t: 1609459200,  // Unix timestamp
  eps: 5.30       // EPS (Earnings Per Share)
}
```

#### 3. 회사 정보 (Profile)
```
GET /stock/profile2?symbol=AAPL&token=API_KEY
응답: {
  country: "US",
  currency: "USD",
  name: "Apple Inc",
  phone: "+14089961010",
  pe: 28.5,           // PER
  valuation: {
    priceToBook: 35.2,    // PBR
    priceToSales: 8.5     // PSR
  },
  dividend: 0.92,
  finnhubIndustry: "Technology",
  marketCapitalization: 2800000  // 백만 USD
}
```

---

## 🔐 보안 및 프라이버시

### API 키
- **공개 여부**: 클라이언트 JavaScript에 노출됨
- **위험도**: ⚠️ 낮음
- **이유**:
  - 무료 API 키 (가치 낮음)
  - Finnhub에서 제공하는 공식 무료 키
  - 사용량 제한으로 악용 방지

### 데이터 전송
- **데이터**: 주식 시세 정보만 전송
- **개인정보**: 전혀 수집하지 않음
- **저장**: 브라우저 로컬 저장만 사용

---

## ⚠️ 주의사항

### 1. 과거 데이터는 자동 조회 불가
```
❌ 5년 과거 데이터는 API로 자동 조회 불가능
   (Finnhub 무료 플랜 제한)

✅ 대신 현재값(PER/PBR)만 자동 조회
   과거 5년 데이터는 수동 입력
```

### 2. 한국 주식 미지원
```
❌ 삼성전자, 네이버, 카카오 등 한국 주식 미지원

✅ 해결방법:
   - 수동으로 데이터 입력
   - 또는 네이버 증권(finance.naver.com)에서 복사
```

### 3. API 호출 제한
```
무료 API:
- 월별 호출 제한: ~1,440회 (월 60회/분)
- 하루 요청: ~48회 (시간당 1회)

주의: 같은 종목을 자주 조회하면 제한 초과 가능
```

### 4. 시간 지연
```
⏳ API 응답: 1~2초 소요
   느린 인터넷: 3~5초

해결: 인터넷 속도 확인
```

---

## 🎯 사용 팁

### Tip 1: 자동 조회 활용
```
미국 주식만 입력하면 현재값이 자동 채워짐
→ 5년 데이터만 수동 입력하면 됨
→ 시간 50% 절약
```

### Tip 2: 여러 종목 비교
```
AAPL → 자동 조회 → 저장
GOOGL → 자동 조회 → 저장
MSFT → 자동 조회 → 저장

사이드바에서 빠르게 전환
```

### Tip 3: 한국 주식 우회
```
네이버 증권: https://finance.naver.com/item/main.nhn?code=005930
→ PER, PBR 값 복사
→ 앱에 붙여넣기
```

---

## 🐛 문제 해결

### Q1: "데이터를 찾을 수 없습니다" 오류
```
원인:
1. 잘못된 티커 입력
2. API 호출 제한 초과
3. 인터넷 연결 끊김

해결:
1. 티커 정확성 확인 (예: "AAPLE" → "AAPL")
2. 몇 분 기다린 후 재시도
3. 네트워크 상태 확인
```

### Q2: 자동 조회가 작동하지 않음
```
원인:
1. 탭/엔터 키 미사용
2. JavaScript 오류
3. 브라우저 콘솔 오류

해결:
1. 반드시 탭 또는 엔터 키 누르기
2. 브라우저 새로고침 (F5)
3. 개발자 도구(F12) 콘솔 확인
```

### Q3: 일부 데이터만 조회됨
```
원인:
Finnhub API가 제한된 정보만 제공

예: PER은 조회되지만 PSR은 없음

해결:
- 조회된 데이터 사용
- 없는 데이터는 수동 입력
```

---

## 📈 향후 개선 계획

### 단기 (v1.2)
- [ ] 검색 자동완성 (종목 이름 입력 시)
- [ ] 과거 5년 데이터 부분 자동 조회
- [ ] 오류 메시지 개선

### 중기 (v1.5)
- [ ] 한국 증권 API 추가 (공공데이터포털)
- [ ] 한국 주식 자동 조회
- [ ] 다국어 지원

### 장기 (v2.0)
- [ ] 백엔드 서버 추가 (API 키 보호)
- [ ] 사용자 계정 시스템
- [ ] 클라우드 데이터 동기화
- [ ] 모바일 앱 출시

---

## 📚 참고 링크

### 공식 문서
- [Finnhub 공식 문서](https://finnhub.io/docs/api)
- [Finnhub API 레퍼런스](https://finnhub.io/api-docs)

### 국내 자료
- [네이버 증권](https://finance.naver.com/)
- [공공데이터포털 - 한국거래소](https://www.data.go.kr/)

### 비교 가능 API
- [Alpha Vantage](https://www.alphavantage.co/)
- [IEX Cloud](https://iexcloud.io/)
- [한국투자증권 오픈API](https://apiportal.koreainvestment.com/)

---

**마지막 업데이트**: 2025년 3월
**버전**: 1.1.0
**상태**: 안정 (프로덕션 준비 완료)
