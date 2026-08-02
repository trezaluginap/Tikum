import { request } from './client';

export const getProfile = () => request('/profile');

export const updateProfile = (payload) => request('/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
});
