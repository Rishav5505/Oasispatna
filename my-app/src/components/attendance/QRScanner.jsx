import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import axios from 'axios';
import { FaQrcode, FaMapMarkerAlt, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import config from '../../config';

const QRScanner = ({ studentId }) => {
    const [scanResult, setScanResult] = useState(null);
    const [location, setLocation] = useState(null);
    const [status, setStatus] = useState('idle'); // idle, scanning, marking, success, error
    const [error, setError] = useState('');

    useEffect(() => {
        if (status === 'scanning') {
            const scanner = new Html5QrcodeScanner('reader', {
                qrbox: { width: 250, height: 250 },
                fps: 5,
            });

            scanner.render(onScanSuccess, onScanError);

            return () => scanner.clear();
        }
    }, [status]);

    const onScanSuccess = (decodedText) => {
        setScanResult(decodedText);
        setStatus('marking');
        markAttendance(decodedText);
    };

    const onScanError = (err) => {
        // console.warn(err);
    };

    const markAttendance = async (token) => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser');
            setStatus('error');
            return;
        }

        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            setLocation({ lat: latitude, lon: longitude });

            try {
                const authToken = sessionStorage.getItem('token');
                const res = await axios.post(`${config.API_URL}/attendance/qr/mark`, {
                    qrToken: token,
                    lat: latitude,
                    lon: longitude
                }, {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });

                setStatus('success');
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to mark attendance');
                setStatus('error');
            }
        }, (err) => {
            setError('Please enable GPS to mark attendance');
            setStatus('error');
        });
    };

    return (
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl max-w-md mx-auto">
            <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3">
                <FaQrcode className="text-blue-600" /> Smart Attendance
            </h2>

            {status === 'idle' && (
                <div className="text-center py-10">
                    <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6 shadow-inner">
                        <FaQrcode />
                    </div>
                    <p className="text-gray-500 font-bold mb-8 uppercase text-xs tracking-widest">Scan the QR Code shown by your teacher</p>
                    <button
                        onClick={() => setStatus('scanning')}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black text-sm transition-all shadow-lg hover:shadow-blue-200"
                    >
                        START SCANNER
                    </button>
                </div>
            )}

            {status === 'scanning' && (
                <div className="space-y-6">
                    <div id="reader" className="overflow-hidden rounded-2xl border-4 border-blue-100 shadow-inner"></div>
                    <button
                        onClick={() => setStatus('idle')}
                        className="w-full bg-gray-100 text-gray-500 py-3 rounded-xl font-bold text-xs"
                    >
                        CANCEL
                    </button>
                </div>
            )}

            {status === 'marking' && (
                <div className="text-center py-10">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-6"></div>
                    <h3 className="text-lg font-black text-gray-800 mb-2">Verifying Location...</h3>
                    <p className="text-gray-400 font-medium text-sm flex items-center justify-center gap-2">
                        <FaMapMarkerAlt className="animate-pulse text-red-400" /> GPS Check in progress
                    </p>
                </div>
            )}

            {status === 'success' && (
                <div className="text-center py-10 animate-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-lg">
                        <FaCheckCircle />
                    </div>
                    <h3 className="text-xl font-black text-gray-900 mb-4">You're Marked Present!</h3>
                    <p className="text-gray-500 text-sm font-medium mb-8">Your attendance has been recorded successfully for today's class.</p>
                    <button
                        onClick={() => setStatus('idle')}
                        className="px-8 py-3 bg-gray-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest"
                    >
                        DONE
                    </button>
                </div>
            )}

            {status === 'error' && (
                <div className="text-center py-10 animate-in shake-in duration-300">
                    <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-lg">
                        <FaExclamationTriangle />
                    </div>
                    <h3 className="text-xl font-black text-red-600 mb-4 tracking-tight">Access Denied</h3>
                    <p className="text-gray-600 text-sm font-bold mb-8 bg-red-50 p-4 rounded-xl border border-red-100 leading-relaxed">{error}</p>
                    <button
                        onClick={() => setStatus('idle')}
                        className="w-full bg-red-600 text-white py-4 rounded-xl font-black text-sm"
                    >
                        TRY AGAIN
                    </button>
                </div>
            )}
        </div>
    );
};

export default QRScanner;
