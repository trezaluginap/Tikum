import { request } from './client';

export const getRoomTrip = (roomId) => request(`/rooms/${roomId}/trip`);
