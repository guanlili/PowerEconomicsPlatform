import dayjs from 'dayjs';
import { ECONOMIC_INDICATORS } from '../types';

export const generateDates = (start: string, end: string) => {
  const dates = [];
  let current = dayjs(start);
  const stop = dayjs(end);
  while (current.isBefore(stop) || current.isSame(stop)) {
    dates.push(current.format('YYYY-MM'));
    current = current.add(1, 'month');
  }
  return dates;
};

export const generateFactorData = (dates: string[], factorNames: string[]) => {
  return dates.map((date, index) => {
    const row: any = { date };
    factorNames.forEach((name, fIdx) => {
      // Generate more realistic data with trend, seasonality and noise
      // Keep values in middle range (20-80) to avoid boundary effects
      const baseValue = 35 + (fIdx * 10); // Different base values for different factors (35-65 range)
      const trend = index * 0.3; // Slight upward trend
      const seasonality = Math.sin((index % 12) / 12 * Math.PI * 2) * 8; // Seasonal variation (smaller amplitude)
      const noise = (Math.random() - 0.5) * 6; // Random noise (smaller)
      let value = baseValue + trend + seasonality + noise;
      // Clamp to safe middle range 20-80, avoiding boundaries
      value = Math.max(20, Math.min(80, value));
      row[name] = parseFloat(value.toFixed(2));
    });
    return row;
  });
};

export const generateCorrelationMatrix = (factorNames: string[], economicVars: string[]) => {
  const indicators = economicVars.length > 0 ? economicVars : ECONOMIC_INDICATORS.map(ind => ind.key);
  const matrix: any[] = [];
  
  indicators.forEach(ind => {
    const row: any = { indicator: ind };
    factorNames.forEach(factor => {
      // Random correlation between -1 and 1
      row[factor] = (Math.random() * 2 - 1).toFixed(2);
    });
    matrix.push(row);
  });
  
  return matrix;
};

export const generatePredictionData = (dates: string[]) => {
  return dates.map((date, index) => {
    const row: any = { date };
    ECONOMIC_INDICATORS.forEach((ind, iIdx) => {
      const isPercentage = ind.unit.includes('%');
      let actual: number;
      let pred: number;
      
      if (isPercentage) {
        // For percentage indicators (like CPI, PPI, growth rate), keep values in 20-80 range
        const baseValue = 45 + (iIdx * 5); // Base around 45-65 range
        const trend = index * 0.2; // Slight trend
        const seasonality = Math.sin((index % 12) / 12 * Math.PI * 2) * 8; // Seasonal variation
        const cycle = Math.sin(index / 24 * Math.PI * 2) * 10; // Business cycle
        const noise = (Math.random() - 0.5) * 6;
        actual = baseValue + trend + seasonality + cycle + noise;
        // Clamp to safe middle range 20-80, avoiding 0 and 100 boundaries
        actual = Math.max(20, Math.min(80, actual));
        const error = (Math.random() - 0.5) * 8; // Prediction error +/- 4
        pred = actual + error;
        pred = Math.max(20, Math.min(80, pred));
      } else {
        // For absolute value indicators (like GDP, investment)
        const baseValue = 600 + (iIdx * 100);
        const trend = index * 3; // Economic growth trend
        const seasonality = Math.sin((index % 12) / 12 * Math.PI * 2) * 50; // Monthly seasonality
        const cycle = Math.sin(index / 24 * Math.PI * 2) * 30; // Business cycle (2 years)
        const noise = (Math.random() - 0.5) * 20;
        actual = baseValue + trend + seasonality + cycle + noise;
        const error = (Math.random() - 0.5) * 30; // Prediction error +/- 15
        pred = actual + error;
      }
      
      row[`${ind.key}_actual`] = parseFloat(actual.toFixed(2));
      row[`${ind.key}_pred`] = parseFloat(pred.toFixed(2));
    });
    return row;
  });
};

export const calculateAccuracy = (actual: number, pred: number) => {
  if (actual === 0) return 0;
  // Add base error to lower accuracy, making it more realistic (70-90% range)
  const baseError = 0.15; // 15% base error
  const relativeError = Math.abs(actual - pred) / Math.abs(actual);
  const adjustedError = Math.min(1, relativeError + baseError + Math.random() * 0.1);
  return Math.max(0, (1 - adjustedError) * 100);
};
