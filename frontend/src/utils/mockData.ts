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
  return dates.map(date => {
    const row: any = { date };
    factorNames.forEach(name => {
      row[name] = Math.random() * 100; // Random value 0-100
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
  return dates.map(date => {
    const row: any = { date };
    ECONOMIC_INDICATORS.forEach(ind => {
      const actual = Math.random() * 1000 + 500;
      const error = (Math.random() - 0.5) * 50; // Error +/- 25
      const pred = actual + error;
      row[`${ind.key}_actual`] = parseFloat(actual.toFixed(2));
      row[`${ind.key}_pred`] = parseFloat(pred.toFixed(2));
    });
    return row;
  });
};

export const calculateAccuracy = (actual: number, pred: number) => {
  if (actual === 0) return 0;
  return Math.max(0, 1 - Math.abs(actual - pred) / Math.abs(actual)) * 100;
};
