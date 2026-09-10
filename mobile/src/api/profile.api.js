import { request } from './client';

export const getProfile = () => request('/profile');

export const updateProfile = (payload) => request('/profile', {
    method: 'PUT',
    body: JSON.stringify(payload),
});

export const uploadAvatar = (file) => {
    const formData = new FormData();
    formData.append('avatar', file);

    return request('/profile/avatar', {
        method: 'POST',
        body: formData,
    });
};
