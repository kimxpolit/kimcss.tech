/**
 * ShopClone 7 - Centralized API Fetch Client
 * Communicates directly with Node.js & Express REST Backend (/api/...)
 */

class ApiClient {
    constructor() {
        this.baseUrl = '/api';
    }

    getToken() {
        return localStorage.getItem('token') || '';
    }

    setToken(token) {
        if (token) {
            localStorage.setItem('token', token);
        } else {
            localStorage.removeItem('token');
        }
    }

    async request(endpoint, options = {}) {
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        const url = `${this.baseUrl}${cleanEndpoint}`;

        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        const token = this.getToken();
        if (token && !headers['Authorization']) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            method: options.method || 'GET',
            headers: headers,
            ...options
        };

        if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
            config.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json().catch(() => ({
                status: 'error',
                msg: `Lỗi đọc phản hồi từ máy chủ (${response.status})`
            }));

            if (!response.ok && data.status !== 'error') {
                data.status = 'error';
                data.msg = data.msg || `Lỗi máy chủ (${response.status})`;
            }

            return data;
        } catch (err) {
            console.error(`[API Network Error] ${url}:`, err);
            return {
                status: 'error',
                msg: 'Không thể kết nối đến máy chủ Backend Node.js. Vui lòng kiểm tra lại server!'
            };
        }
    }

    get(endpoint, params = {}) {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== '') {
                query.append(k, v);
            }
        });
        const qs = query.toString();
        const url = qs ? `${endpoint}?${qs}` : endpoint;
        return this.request(url, { method: 'GET' });
    }

    post(endpoint, body = {}) {
        return this.request(endpoint, { method: 'POST', body: body });
    }

    put(endpoint, body = {}) {
        return this.request(endpoint, { method: 'PUT', body: body });
    }

    delete(endpoint, body = {}) {
        return this.request(endpoint, { method: 'DELETE', body: body });
    }

    // UI Notification Helpers
    alertSuccess(msg, title = 'Thành công!') {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: title,
                text: msg,
                confirmButtonColor: '#0d6efd'
            });
        } else {
            alert(msg);
        }
    }

    alertError(msg, title = 'Thông báo lỗi!') {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: title,
                text: msg,
                confirmButtonColor: '#dc3545'
            });
        } else {
            alert(msg);
        }
    }

    showToast(msg, icon = 'info') {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: icon,
                title: msg,
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true
            });
        }
    }
}

window.api = new ApiClient();
