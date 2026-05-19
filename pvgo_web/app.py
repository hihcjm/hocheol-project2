from flask import Flask, render_template, request
import pandas as pd
import requests
import FinanceDataReader as fdr
import re
import math

app = Flask(__name__)

# --- 1. 기업명 -> 종목코드 변환 ---
def get_stock_code(company_name):
    try:
        df_krx = fdr.StockListing('KRX')
        stock = df_krx[df_krx['Name'] == company_name]
        if not stock.empty:
            return stock.iloc[0]['Code']
        return None
    except:
        return None

# --- 2. 재무 하이라이트 테이블 찾기 ---
def find_highlight_table(tables):
    if len(tables) > 11:
        t = tables[11]
        first_col = t.iloc[:, 0].astype(str).str.upper().str.replace(" ", "")
        if first_col.str.contains("EPS").any() and first_col.str.contains("ROE").any():
            return t
    for t in tables:
        if len(t.columns) < 7:
            continue
        first_col = t.iloc[:, 0].astype(str).str.upper().str.replace(" ", "")
        if first_col.str.contains("EPS").any() and first_col.str.contains("ROE").any():
            return t
    return None

def find_row(df, keywords):
    for idx in range(len(df)):
        row_name = str(df.iloc[idx, 0]).replace(" ", "").upper()
        for kw in keywords:
            if kw.upper() in row_name:
                return df.iloc[idx]
    return None

def safe_float(val):
    try:
        if pd.isna(val):
            return None
        s = str(val).replace(',', '')
        m = re.search(r'-?\d+\.?\d*', s)
        if m:
            return float(m.group())
        return None
    except:
        return None

def get_avg(row, start_col=1, end_col=5, positive_only=False):
    if row is None:
        return None
    vals = [safe_float(row.iloc[i]) for i in range(start_col, min(end_col + 1, len(row)))]
    valid = [v for v in vals if v is not None]
    if positive_only:
        valid = [v for v in valid if v > 0]
    return sum(valid) / len(valid) if valid else None

# --- 3. 가치평가 엔진 ---
def calc_pvgo(base_val, roe, payout_ratio, r):
    if base_val is None or roe is None:
        return {"error": "재무 데이터가 부족하여 계산할 수 없습니다."}
    payout_ratio = max(0.0, min(1.0, payout_ratio))
    if base_val < 0:
        payout_ratio = 0.0
    b = 1 - payout_ratio
    g = b * roe
    if r == 0:
        return {"error": "요구수익률은 0이 될 수 없습니다."}
    no_growth_value = base_val / r
    if g >= r:
        return {
            "base_val": f"{base_val:,.0f}",
            "roe": f"{roe*100:.1f}",
            "g": f"{g*100:.1f}",
            "no_growth": f"{no_growth_value:,.0f}",
            "price": f"{no_growth_value:,.0f}",
            "g_exceeds_r": True,
        }
    growth_value = base_val * payout_ratio / (r - g)
    return {
        "base_val": f"{base_val:,.0f}",
        "roe": f"{roe*100:.1f}",
        "g": f"{g*100:.1f}",
        "no_growth": f"{no_growth_value:,.0f}",
        "price": f"{growth_value:,.0f}",
    }

def extract_year_label(col_name):
    s = str(col_name)
    if re.search(r'\dE', s, re.IGNORECASE):
        m = re.search(r'(\d{4})E', s, re.IGNORECASE)
        return m.group(1) + 'E' if m else s
    m = re.search(r'(\d{4})', s)
    return m.group(1) if m else s

def calc_peg(per_val, eps_row, start_col, end_col):
    if per_val is None or eps_row is None:
        return None
    eps_start = safe_float(eps_row.iloc[start_col]) if len(eps_row) > start_col else None
    eps_end   = safe_float(eps_row.iloc[end_col])   if len(eps_row) > end_col   else None
    n = end_col - start_col
    if not eps_start or not eps_end or eps_start <= 0 or eps_end <= 0 or n <= 0:
        return None
    cagr = (eps_end / eps_start) ** (1 / n) - 1
    if cagr <= 0:
        return None
    return round(per_val / (cagr * 100), 2)

def calc_peg_flexible(per_val, eps_row, end_col):
    if per_val is None or eps_row is None or per_val <= 0:
        return None
    start_min = max(end_col - 5, 1)
    for s in range(start_min, end_col):
        result = calc_peg(per_val, eps_row, s, end_col)
        if result is not None:
            return result
    return None

def calc_valuation_band(df, current_price):
    per_row = find_row(df, ["PER"])
    pbr_row = find_row(df, ["PBR"])
    eps_row = find_row(df, ["EPS"])
    bps_row = find_row(df, ["BPS"])

    def make_band_entry(metric, hist_vals, val_25, val_26e,
                        base_25=None, base_26e=None, base_label=None, no_theory=False):
        hist_vals = [v for v in hist_vals if v is not None and v > 0]
        if len(hist_vals) < 2:
            return {"metric": metric, "error": "데이터 부족"}

        avg = sum(hist_vals) / len(hist_vals)
        std = math.sqrt(sum((v - avg) ** 2 for v in hist_vals) / len(hist_vals))

        def grade(val):
            if val is None or std == 0:
                return None
            z = (val - avg) / std
            if z < -2: return "극저평가"
            if z < -1: return "저평가"
            if z <  1: return "적정"
            if z <  2: return "고평가"
            return "초고평가"

        def theory(base):
            return avg * base if base is not None and not no_theory else None

        def diff_info(tp):
            if tp is None or not current_price:
                return None, None
            d = tp - current_price
            return f"{d:+,.0f}", f"{d / current_price * 100:+.1f}"

        tp25  = theory(base_25)
        tp26e = theory(base_26e)
        d25,  dp25  = diff_info(tp25)
        d26e, dp26e = diff_info(tp26e)

        bands = {
            "m3s": round(avg - 3 * std, 2),
            "m2s": round(avg - 2 * std, 2),
            "m1s": round(avg - 1 * std, 2),
            "avg": round(avg, 2),
            "p1s": round(avg + 1 * std, 2),
            "p2s": round(avg + 2 * std, 2),
            "p3s": round(avg + 3 * std, 2),
        }

        return {
            "metric": metric,
            "base_label": base_label,
            "hist_avg": round(avg, 2),
            "hist_std": round(std, 2),
            "bands": bands,
            "val_25":  round(val_25,  2) if val_25  is not None else None,
            "val_26e": round(val_26e, 2) if val_26e is not None else None,
            "grade_25":  grade(val_25),
            "grade_26e": grade(val_26e),
            "theory_25":  f"{tp25:,.0f}"  if tp25  else None,
            "theory_26e": f"{tp26e:,.0f}" if tp26e else None,
            "diff_25":    d25,   "diff_pct_25":  dp25,
            "diff_26e":   d26e,  "diff_pct_26e": dp26e,
        }

    results = []

    if per_row is not None:
        hist = [safe_float(per_row.iloc[i]) for i in range(1, min(6, len(per_row)))]
        results.append(make_band_entry(
            "PER", hist,
            val_25  = safe_float(per_row.iloc[5]) if len(per_row) > 5 else None,
            val_26e = safe_float(per_row.iloc[6]) if len(per_row) > 6 else None,
            base_25  = safe_float(eps_row.iloc[5]) if eps_row is not None and len(eps_row) > 5 else None,
            base_26e = safe_float(eps_row.iloc[6]) if eps_row is not None and len(eps_row) > 6 else None,
            base_label="EPS",
        ))
    else:
        results.append({"metric": "PER", "error": "PER 데이터 없음"})

    if pbr_row is not None:
        hist = [safe_float(pbr_row.iloc[i]) for i in range(1, min(6, len(pbr_row)))]
        results.append(make_band_entry(
            "PBR", hist,
            val_25  = safe_float(pbr_row.iloc[5]) if len(pbr_row) > 5 else None,
            val_26e = safe_float(pbr_row.iloc[6]) if len(pbr_row) > 6 else None,
            base_25  = safe_float(bps_row.iloc[5]) if bps_row is not None and len(bps_row) > 5 else None,
            base_26e = safe_float(bps_row.iloc[6]) if bps_row is not None and len(bps_row) > 6 else None,
            base_label="BPS",
        ))
    else:
        results.append({"metric": "PBR", "error": "PBR 데이터 없음"})

    if per_row is not None and eps_row is not None:
        hist_peg = []
        for ci in range(1, min(6, len(per_row))):
            pv = safe_float(per_row.iloc[ci])
            if pv and pv > 0:
                peg_val = calc_peg_flexible(pv, eps_row, ci)
                if peg_val is not None:
                    hist_peg.append(peg_val)

        per_25 = safe_float(per_row.iloc[5]) if len(per_row) > 5 else None
        peg_25 = calc_peg_flexible(per_25, eps_row, 5)

        peg_26e = None
        per_26e = safe_float(per_row.iloc[6]) if len(per_row) > 6 else None
        for s, e in ((5, 7), (5, 6)):
            if len(eps_row) > e:
                peg_26e = calc_peg(per_26e, eps_row, s, e)
                if peg_26e is not None:
                    break
        if peg_26e is None:
            peg_26e = calc_peg_flexible(per_26e, eps_row, 6) if len(eps_row) > 6 else None

        results.append(make_band_entry(
            "PEG", hist_peg,
            val_25=peg_25, val_26e=peg_26e,
            no_theory=True,
        ))
    else:
        results.append({"metric": "PEG", "error": "PER/EPS 데이터 부족"})

    rev_row   = find_row(df, ["매출액"])
    share_row = find_row(df, ["발행주식수"])
    if rev_row is not None and share_row is not None:
        def sps(rev_col, share_col):
            rev    = safe_float(rev_row.iloc[rev_col])     if len(rev_row)   > rev_col   else None
            shares = safe_float(share_row.iloc[share_col]) if len(share_row) > share_col else None
            if not shares:
                shares = safe_float(share_row.iloc[5]) if len(share_row) > 5 else None
            if rev and shares and shares > 0:
                return round(rev / shares * 1e5, 0)
            return None

        def psr(price, sps_val):
            if price and sps_val and sps_val > 0:
                return round(price / sps_val, 2)
            return None

        hist_psr = []
        for ci in range(1, min(6, len(per_row) if per_row is not None else 0)):
            sps_i = sps(ci, ci)
            per_i = safe_float(per_row.iloc[ci]) if per_row is not None and len(per_row) > ci else None
            eps_i = safe_float(eps_row.iloc[ci]) if eps_row is not None and len(eps_row) > ci else None
            if per_i and eps_i and sps_i:
                price_i = per_i * eps_i
                hist_psr.append(round(price_i / sps_i, 2))

        sps_25  = sps(5, 5)
        sps_26e = sps(6, 6)
        psr_25  = psr(current_price, sps_25)
        psr_26e = psr(current_price, sps_26e)

        results.append(make_band_entry(
            "PSR", hist_psr,
            val_25   = psr_25,
            val_26e  = psr_26e,
            base_25  = sps_25,
            base_26e = sps_26e,
            base_label="SPS",
        ))
    else:
        results.append({"metric": "PSR", "error": "매출액/발행주식수 데이터 없음"})

    return results

def get_current_price(stock_code):
    try:
        start = pd.Timestamp.now().date() - pd.Timedelta(days=7)
        df = fdr.DataReader(stock_code, start)
        if not df.empty:
            return float(df['Close'].iloc[-1])
    except:
        pass
    return None

def get_risk_free_rate():
    try:
        df = fdr.DataReader('^TNX', pd.Timestamp.now().date() - pd.Timedelta(days=5))
        if not df.empty:
            val = float(df['Close'].iloc[-1])
            if 1.0 < val < 20.0:
                return val / 100
    except:
        pass
    return 0.044

def get_beta(tables):
    try:
        for t in tables:
            row = find_row(t, ["베타", "Beta"])
            if row is not None:
                val = safe_float(row.iloc[1])
                if val is not None:
                    return val
    except:
        pass
    return 1.0

def get_fcff_components(stock_code, headers):
    try:
        url = (
            f"http://comp.fnguide.com/SVO2/ASP/SVD_Invest.asp"
            f"?pGB=1&gicode=A{stock_code}&cID=&MenuYn=Y&ReportGB=&NewMenuID=13&stkGb=701"
        )
        resp = requests.get(url, headers=headers, timeout=15)
        tables = pd.read_html(resp.text)
        for t in tables:
            t.columns = [str(c[-1]) if isinstance(c, tuple) else str(c) for c in t.columns]
            nopat_row = find_row(t, ["세후영업이익"])
            da_row    = find_row(t, ["유무형자산상각비"])
            capex_row = find_row(t, ["총투자"])
            if nopat_row is not None:
                return nopat_row, da_row, capex_row
    except Exception:
        pass
    return None, None, None

def calc_dcf(df, stock_code, headers, r, current_price, g_terminal=0.025):
    try:
        rev_row   = find_row(df, ["매출액"])
        op_row    = find_row(df, ["영업이익"])
        share_row = find_row(df, ["발행주식수"])
        if rev_row is None or share_row is None:
            return {"error": "매출액/발행주식수 데이터 없음"}

        nopat_row, da_row, capex_row = get_fcff_components(stock_code, headers)
        if nopat_row is None:
            return {"error": "FCFF 구성요소 데이터 없음 (SVD_Invest)"}

        tax_rates = []
        try:
            fin_url = (f"http://comp.fnguide.com/SVO2/ASP/SVD_Finance.asp"
                       f"?pGB=1&gicode=A{stock_code}&cID=&MenuYn=Y&ReportGB=&NewMenuID=12&stkGb=701")
            fin_resp = requests.get(fin_url, headers=headers, timeout=15)
            fin_tables = pd.read_html(fin_resp.text)
            for ft in fin_tables:
                pretax_row = find_row(ft, ["세전계속사업이익"])
                tax_row    = find_row(ft, ["법인세비용"])
                if pretax_row is not None and tax_row is not None and len(pretax_row) >= 5:
                    for ci in range(1, min(5, len(pretax_row))):
                        pretax = safe_float(pretax_row.iloc[ci])
                        tax    = safe_float(tax_row.iloc[ci])
                        if pretax and tax and pretax > 0 and tax > 0:
                            tax_rates.append(tax / pretax)
                    break
        except Exception:
            pass
        avg_tax_rate = sum(tax_rates) / len(tax_rates) if tax_rates else 0.22

        hist_da_margin    = []
        hist_capex_margin = []
        hist_fcff_margin  = []
        for invest_col, main_col in [(1,1),(2,2),(3,3),(4,4),(5,5)]:
            nopat = safe_float(nopat_row.iloc[invest_col]) if len(nopat_row) > invest_col else None
            da    = safe_float(da_row.iloc[invest_col])    if da_row    is not None and len(da_row)    > invest_col else None
            capex = safe_float(capex_row.iloc[invest_col]) if capex_row is not None and len(capex_row) > invest_col else None
            rev   = safe_float(rev_row.iloc[main_col])     if len(rev_row) > main_col else None
            if nopat and rev and rev > 0:
                fcff = (nopat or 0) + (da or 0) - (capex or 0)
                hist_fcff_margin.append(fcff / rev)
                if da:    hist_da_margin.append(da / rev)
                if capex: hist_capex_margin.append(capex / rev)

        if len(hist_fcff_margin) < 2:
            return {"error": "FCFF 과거 데이터 부족"}

        avg_da_margin    = sum(hist_da_margin)    / len(hist_da_margin)    if hist_da_margin    else 0
        avg_capex_margin = sum(hist_capex_margin) / len(hist_capex_margin) if hist_capex_margin else 0
        avg_fcff_margin  = sum(hist_fcff_margin)  / len(hist_fcff_margin)

        fcf_years = []
        for col, label in zip([6, 7, 8], ["26E", "27E", "28E"]):
            rev_e = safe_float(rev_row.iloc[col]) if len(rev_row) > col else None
            op_e  = safe_float(op_row.iloc[col])  if op_row is not None and len(op_row) > col else None
            if rev_e and op_e and op_e > 0:
                nopat_e = op_e * (1 - avg_tax_rate)
                da_e    = rev_e * avg_da_margin
                capex_e = rev_e * avg_capex_margin
                fcff_e  = nopat_e + da_e - capex_e
                fcf_years.append((label, fcff_e))
            elif rev_e:
                fcf_years.append((label, rev_e * avg_fcff_margin))

        if not fcf_years:
            return {"error": "컨센서스 매출액 데이터 없음"}

        if r <= g_terminal:
            return {"error": f"할인율({r*100:.1f}%)이 터미널성장률({g_terminal*100:.1f}%)보다 낮음"}

        shares = safe_float(share_row.iloc[5]) if len(share_row) > 5 else None
        if not shares or shares <= 0:
            return {"error": "발행주식수 없음"}

        def pv_to_price(pv_total):
            return pv_total * 1e8 / (shares * 1e3)

        def diff_str(fv):
            if not current_price: return None, None
            d = fv - current_price
            return f"{d:+,.0f}", f"{d / current_price * 100:+.1f}"

        pv_fcfs = []
        cumulative_pv = 0
        for t_idx, (label, fcf_e) in enumerate(fcf_years):
            n = t_idx + 1
            pv = fcf_e / (1 + r) ** n
            cumulative_pv += pv
            tv_n   = fcf_e * (1 + g_terminal) / (r - g_terminal)
            pv_tv_n = tv_n / (1 + r) ** n
            total_pv_n = cumulative_pv + pv_tv_n
            fv_n = pv_to_price(total_pv_n)
            d, dp = diff_str(fv_n)
            pv_fcfs.append({
                "year":       label,
                "fcf":        round(fcf_e),
                "pv":         round(pv),
                "pv_tv":      round(pv_tv_n),
                "total_pv":   round(total_pv_n),
                "fair_value": f"{fv_n:,.0f}",
                "diff":       d,
                "diff_pct":   dp,
            })

        return {
            "avg_fcff_margin": round(avg_fcff_margin * 100, 1),
            "avg_tax_rate":    round(avg_tax_rate * 100, 1),
            "g_terminal":      round(g_terminal * 100, 1),
            "r":               round(r * 100, 2),
            "pv_fcfs":         pv_fcfs,
        }
    except Exception as e:
        return {"error": f"DCF 계산 오류: {e}"}


def analyze_stock(company_name):
    stock_code = get_stock_code(company_name)
    if not stock_code:
        return {"error": f"'{company_name}'(을)를 찾을 수 없습니다."}

    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        url = (
            f"http://comp.fnguide.com/SVO2/ASP/SVD_Main.asp"
            f"?pGB=1&gicode=A{stock_code}&cID=&MenuYn=Y&ReportGB=&NewMenuID=11&stkGb=701"
        )
        response = requests.get(url, headers=headers, timeout=15)
        tables = pd.read_html(response.text)

        df = find_highlight_table(tables)
        if df is None:
            return {"error": "재무 데이터 테이블을 찾을 수 없습니다."}

        df.columns = [str(c[-1]) if isinstance(c, tuple) else str(c) for c in df.columns]
        raw_table_html = df.to_html(classes='financial-table', index=False)

        rf = get_risk_free_rate()
        beta = get_beta(tables)
        erp = 0.05
        r_value = rf + beta * erp

        current_price = get_current_price(stock_code)

        return {
            "name": company_name,
            "code": stock_code,
            "raw_table": raw_table_html,
            "current_price": f"{current_price:,.0f}" if current_price else "조회 실패",
            "r_info": {
                "rf": f"{rf*100:.2f}",
                "beta": f"{beta:.2f}",
                "r": f"{r_value*100:.2f}",
            },
            "dcf": calc_dcf(df, stock_code, headers, r_value, current_price),
            "band": calc_valuation_band(df, current_price),
        }

    except Exception as e:
        return {"error": f"서버 처리 중 오류 발생: {e}"}


@app.route('/', methods=['GET', 'POST'])
def index():
    result = None
    company_name = ""

    if request.method == 'POST':
        company_name = request.form['company_name']
        result = analyze_stock(company_name)

    return render_template('index.html', result=result, company_name=company_name)


if __name__ == '__main__':
    app.run(debug=True)
