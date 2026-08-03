import { request } from './client';

export const triggerSos = (sessionId, payload = {}) => request(`/tour-sessions/${sessionId}/sos`, {
  method: 'POST',
  body: JSON.stringify(payload),
});

export const resolveSos = (sessionId, sosAlertId) => request(`/tour-sessions/${sessionId}/sos/${sosAlertId}/resolve`, {
  method: 'POST',
});
