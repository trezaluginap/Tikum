import { request } from './client';

export const getActiveRooms = () => request('/rooms/active');

export const createRoom = (payload) => request('/rooms', {
  method: 'POST',
  body: JSON.stringify(payload),
});

export const joinRoom = (roomPin) => request('/rooms/join', {
  method: 'POST',
  body: JSON.stringify({ room_pin: roomPin }),
});

export const leaveRoom = (roomId) => request(`/rooms/${roomId}/leave`, {
  method: 'POST',
});

export const closeRoom = (roomId) => request(`/rooms/${roomId}/close`, {
  method: 'POST',
});

export const getRoom = (roomId) => request(`/rooms/${roomId}`);

export const getRoomMembers = (roomId) => request(`/rooms/${roomId}/members`);
