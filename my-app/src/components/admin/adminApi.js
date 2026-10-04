import axios from 'axios';
import config from '../../config';
import { toast } from '../../utils/notify';

const authHeaders = () => ({ Authorization: `Bearer ${sessionStorage.getItem('token')}` });

// Thin axios wrapper for admin endpoints: api.get('/fees/pending') -> data
export const api = {
  get: (path, params) => axios.get(`${config.API_URL}${path}`, { headers: authHeaders(), params }).then(r => r.data),
  post: (path, body = {}) => axios.post(`${config.API_URL}${path}`, body, { headers: authHeaders() }).then(r => r.data),
  put: (path, body = {}) => axios.put(`${config.API_URL}${path}`, body, { headers: authHeaders() }).then(r => r.data),
  patch: (path, body = {}) => axios.patch(`${config.API_URL}${path}`, body, { headers: authHeaders() }).then(r => r.data),
  del: (path) => axios.delete(`${config.API_URL}${path}`, { headers: authHeaders() }).then(r => r.data),
};

export const errMsg = (err, fallback = 'Request failed') =>
  err?.response?.data?.message || err?.message || fallback;

// Always shows an error-styled toast: "<action>: <server message>"
export const toastError = (err, action = 'Request failed') => {
  toast.error(`${action}: ${errMsg(err)}`);
};

export const toastSuccess = (msg) => toast.success(msg);

export const formatINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
