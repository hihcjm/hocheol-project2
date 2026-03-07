/**
 * 통계 계산 (순수 함수)
 */

class Statistics {
  /**
   * 평균 계산
   */
  static mean(values) {
    const filtered = values.filter(v => v !== null && !isNaN(v) && v > 0);
    if (filtered.length === 0) return null;
    return filtered.reduce((a, b) => a + b, 0) / filtered.length;
  }

  /**
   * 표준편차 계산 (모집단 표준편차)
   */
  static stdev(values) {
    const filtered = values.filter(v => v !== null && !isNaN(v) && v > 0);
    if (filtered.length < 2) return null;

    const avg = Statistics.mean(values);
    if (avg === null) return null;

    const variance = filtered.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / filtered.length;
    return Math.sqrt(variance);
  }

  /**
   * Z-Score 계산
   */
  static zScore(value, mean, stdev) {
    if (value === null || mean === null || stdev === null || stdev === 0) {
      return null;
    }
    return (value - mean) / stdev;
  }

  /**
   * Z-Score 해석
   */
  static interpretZScore(z) {
    if (z === null) return { label: '데이터 없음', color: 'gray', bgColor: 'bg-gray-500' };
    if (z <= -2) return { label: '극저평가', color: '#10b981', bgColor: 'bg-emerald-600' };
    if (z <= -1) return { label: '저평가', color: '#34d399', bgColor: 'bg-emerald-500' };
    if (z < 1) return { label: '적정가', color: '#3b82f6', bgColor: 'bg-blue-500' };
    if (z < 2) return { label: '고평가', color: '#f59e0b', bgColor: 'bg-amber-500' };
    return { label: '극고평가', color: '#ef4444', bgColor: 'bg-red-500' };
  }

  /**
   * 밴드 계산
   */
  static getBands(mean, stdev) {
    if (mean === null || stdev === null) {
      return { band1Up: null, band1Down: null, band2Up: null, band2Down: null };
    }

    return {
      band1Up: mean + stdev,
      band1Down: mean - stdev,
      band2Up: mean + 2 * stdev,
      band2Down: mean - 2 * stdev
    };
  }

  /**
   * 지표별 통계 계산
   */
  static calculate(values, currentValue) {
    const avg = Statistics.mean(values);
    const std = Statistics.stdev(values);
    const z = Statistics.zScore(currentValue, avg, std);
    const bands = Statistics.getBands(avg, std);
    const interpretation = Statistics.interpretZScore(z);

    return {
      mean: avg,
      stdev: std,
      zScore: z,
      interpretation,
      bands
    };
  }
}
