import { request } from './client';

export const getCurrentLocations = (sessionId) => request(`/tour-sessions/${sessionId}/locations/current`);

export const updateCurrentLocation = (sessionId, payload) => request(`/tour-sessions/${sessionId}/locations/current`, {
  method: 'POST',
  body: JSON.stringify(payload),
});
