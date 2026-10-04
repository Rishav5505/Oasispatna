import React, { useState, useEffect, useCallback } from 'react';
import { toast } from '../../utils/notify';
import { Html5QrcodeScanner } from 'html5-qrcode';
import axios from 'axios';
import { FaQrcode, FaMapMarkerAlt, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import config from '../../config';
import { FiCamera, FiX, FiCheck, FiRefreshCw } from 'react-icons/fi';

// eslint-disable-next-line no-unused-vars
const QRScanner = ({ studentId }) => {
    const [status, setStatus] = useState('idle'); // idle, scanning, marking, success, error
    const [error, setError] = useState('');

    const markAttendance = useCallback((qrToken) => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser');
            setStatus('error');
            return;
        }

        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            try {
                const authToken = sessionStorage.getItem('token');
                await axios.post(`${config.API_URL}/attendance/qr/mark`, {
                    qrToken,
                    lat: latitude,
                    lon: longitude
                }, {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });
                setStatus('success');
                toast.success('Attendance marked successfully');
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to mark attendance');
                setStatus('error');
            }
        }, () => {
            setError('Please enable GPS to mark attendance');
            setStatus('error');
        }, { enableHighAccuracy: true, timeout: 15000 });
    }, []);

    useEffect(() => {
        if (status !== 'scanning') return undefined;
        const scanner = new Html5QrcodeScanner('reader', {
            qrbox: { width: 250, height: 250 },
            fps: 5,
        });

        const onScanSuccess = (decodedText) => {
            setStatus('marking');
            markAttendance(decodedText);
        };
        const onScanError = () => { /* frames without a QR code - ignore */ };

        scanner.render(onScanSuccess, onScanError);

        return () => { scanner.clear().catch(() => {}); };
    }, [status, markAttendance]);

    return (
        <div className="max-w-md mx-auto">
            <div className="ui-card overflow-hidden">
                <div className="relative bg-brand-dark text-white px-6 pt-7 pb-6 overflow-hidden">
                    <div className="absolute -top-16 -right-16 w-52 h-52 rounded-full bg-brand-500/30 blur-3xl animate-float-slow" />
                    <div className="relative flex items-center gap-3">
                        <span className="w-11 h-11 rounded-2xl bg-brand-gradient flex items-center justify-center text-xl shadow-brand-glow"><FaQrcode /></span>
                        <div>
                            <h2 className="text-xl font-extrabold tracking-tight">Smart Attendance</h2>
                            <p className="text-xs text-white/60">Scan &middot; verify location &middot; done</p>
                        </div>
                    </div>
                    <div className="relative grid grid-cols-3 gap-2 mt-5">
                        {[['1', 'Scan QR', ['scanning', 'marking', 'success'].includes(status)], ['2', 'GPS check', ['marking', 'success'].includes(status)], ['3', 'Marked', status === 'success']].map(([n, l, on]) => (
                            <div key={n} className={`rounded-xl px-3 py-2 text-center text-[11px] font-bold border transition-all duration-500 ${on ? 'bg-brand-500 border-brand-400 text-white' : 'bg-white/5 border-white/10 text-white/50'}`}>
                                <span className="block text-sm">{on && n !== '1' ? <FiCheck className="mx-auto" /> : n}</span>
                                {l}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6">
                    {status === 'idle' && (
                        <div className="text-center py-4 animate-fade-in">
                            <div className="relative w-40 h-40 mx-auto mb-6">
                                {['top-0 left-0 border-t-4 border-l-4 rounded-tl-2xl', 'top-0 right-0 border-t-4 border-r-4 rounded-tr-2xl', 'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-2xl', 'bottom-0 right-0 border-b-4 border-r-4 rounded-br-2xl'].map(c => (
                                    <span key={c} className={`absolute w-10 h-10 border-brand-500 ${c}`} aria-hidden="true" />
                                ))}
                                <div className="absolute inset-4 rounded-2xl bg-brand-50 dark:bg-brand-500/10 text-brand-500 flex items-center justify-center text-6xl">
                                    <FaQrcode />
                                </div>
                                <span className="absolute left-6 right-6 h-0.5 bg-brand-500 shadow-[0_0_12px_2px_rgba(243,112,33,0.6)] animate-float-slow top-1/2" aria-hidden="true" />
                            </div>
                            <p className="text-gray-900 dark:text-white font-bold mb-1">Ready to check in?</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Scan the QR code shown by your teacher. Keep location (GPS) turned on.</p>
                            <button onClick={() => setStatus('scanning')} className="ui-btn-primary w-full !py-3.5">
                                <FiCamera /> Start scanner
                            </button>
                        </div>
                    )}

                    {status === 'scanning' && (
                        <div className="space-y-4 animate-fade-in">
                            <div id="reader" className="overflow-hidden rounded-2xl border-2 border-brand-200 dark:border-brand-500/30 bg-gray-50 dark:bg-ink-950"></div>
                            <p className="text-center text-xs text-gray-400">Point your camera at the QR code</p>
                            <button onClick={() => setStatus('idle')} className="ui-btn-secondary w-full">
                                <FiX /> Cancel
                            </button>
                        </div>
                    )}

                    {status === 'marking' && (
                        <div className="text-center py-10 animate-fade-in">
                            <div className="relative w-20 h-20 mx-auto mb-6">
                                <span className="absolute inset-0 rounded-full bg-brand-500/20 animate-ping" />
                                <span className="relative w-20 h-20 rounded-full bg-brand-gradient text-white flex items-center justify-center text-3xl shadow-brand-glow"><FaMapMarkerAlt /></span>
                            </div>
                            <h3 className="text-lg font-extrabold text-gray-900 dark:text-white mb-1">Verifying location…</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">GPS check in progress</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="text-center py-8 animate-scale-in">
                            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center text-5xl shadow-[0_10px_40px_-10px_rgba(16,185,129,0.6)]">
                                <FaCheckCircle />
                            </div>
                            <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mb-2">You&rsquo;re marked present! 🎉</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Your attendance has been recorded successfully for today&rsquo;s class.</p>
                            <button onClick={() => setStatus('idle')} className="ui-btn-dark">Done</button>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="text-center py-8 animate-fade-in">
                            <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-600 flex items-center justify-center text-4xl">
                                <FaExclamationTriangle />
                            </div>
                            <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mb-3">Couldn&rsquo;t mark attendance</h3>
                            <p className="text-sm font-medium text-rose-700 dark:text-rose-300 mb-6 bg-rose-50 dark:bg-rose-500/10 p-4 rounded-xl border border-rose-100 dark:border-rose-500/20">{error}</p>
                            <button onClick={() => setStatus('idle')} className="ui-btn-primary w-full">
                                <FiRefreshCw /> Try again
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QRScanner;
