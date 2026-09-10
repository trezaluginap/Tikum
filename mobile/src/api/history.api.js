import { request } from './client';

const buildQuery = (params = {}) => {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value));
    }
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
};

export const getTripHistory = (params = {}) => request(`/history/trips${buildQuery(params)}`);

export const getTripHistoryDetail = (sessionId) => request(`/history/trips/${sessionId}`);
