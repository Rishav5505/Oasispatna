import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { FaPaperPlane, FaRobot, FaUser, FaLightbulb, FaBookOpen, FaBrain } from 'react-icons/fa';
import config from '../../config';

const AIStudyBuddy = () => {
    const [messages, setMessages] = useState([
        { role: 'model', text: 'Hey there! I am your Oasis AI Study Buddy. 🤖 Need help with NCERT, JEE concepts, or a tricky physics problem? Ask me anything!' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg = { role: 'user', text: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const token = sessionStorage.getItem('token');
            const res = await axios.post(`${config.API_URL}/ai-buddy/chat`, {
                message: input,
                history: messages.map(m => ({
                    role: m.role,
                    parts: [{ text: m.text }]
                }))
            }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            setMessages(prev => [...prev, { role: 'model', text: res.data.text }]);
        } catch (err) {
            setMessages(prev => [...prev, { role: 'model', text: 'Sorry, I am having a bit of a brain freeze. Please try again later!' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[75vh] md:h-[70vh] bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 animate-in fade-in duration-500">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-6 flex items-center justify-between text-white">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-white/10">
                        <FaRobot className="animate-bounce" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black tracking-tight">AI Study Buddy</h2>
                        <p className="text-xs font-bold text-blue-200 uppercase tracking-widest">Oasis Intelligence v1.5</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full text-[10px] font-black uppercase border border-green-500/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span> Online
                    </span>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[90%] md:max-w-[80%] flex items-start gap-3 md:gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white text-indigo-600 border border-indigo-100'}`}>
                                {msg.role === 'user' ? <FaUser className="text-sm" /> : <FaRobot className="text-sm" />}
                            </div>
                            <div className={`p-4 rounded-2xl text-sm font-medium leading-relaxed shadow-sm ${msg.role === 'user'
                                ? 'bg-blue-600 text-white rounded-tr-none'
                                : 'bg-white text-gray-700 border border-gray-100 rounded-tl-none'
                                }`}>
                                {msg.text.split('\n').map((line, idx) => (
                                    <p key={idx} className={idx > 0 ? 'mt-2' : ''}>{line}</p>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-white border border-gray-100 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-3">
                            <div className="flex gap-1">
                                <span className="w-1.5 h-1.5 bg-indigo-200 rounded-full animate-bounce"></span>
                                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                            </div>
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Thinking...</span>
                        </div>
                    </div>
                )}
                <div ref={scrollRef} />
            </div>

            {/* Quick Prompts */}
            <div className="px-6 py-3 bg-white border-t border-gray-100 flex gap-2 overflow-x-auto no-scrollbar">
                {[
                    { icon: <FaLightbulb />, text: 'Explain Photosynthesis' },
                    { icon: <FaBrain />, text: 'What is Newton\'s 2nd Law?' },
                    { icon: <FaBookOpen />, text: 'Integration Formulas' },
                ].map((p, i) => (
                    <button
                        key={i}
                        onClick={() => setInput(p.text)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-indigo-50 text-gray-500 hover:text-indigo-600 rounded-full text-xs font-bold transition-all border border-gray-100 hover:border-indigo-100 shrink-0"
                    >
                        {p.icon} {p.text}
                    </button>
                ))}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-4 md:p-6 bg-white border-t border-gray-100 flex gap-2 md:gap-4">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask anything..."
                    className="flex-1 px-4 md:px-6 py-3 md:py-4 bg-gray-50 border-none rounded-2xl font-bold text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 transition-all"
                    disabled={loading}
                />
                <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100 transition-all disabled:opacity-50 hover:scale-105 active:scale-95"
                    disabled={loading || !input.trim()}
                >
                    <FaPaperPlane className={loading ? 'animate-pulse' : ''} />
                </button>
            </form>
        </div>
    );
};

export default AIStudyBuddy;
