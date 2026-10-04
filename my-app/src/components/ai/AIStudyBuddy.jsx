import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { FiSend, FiCpu, FiUser, FiZap, FiBookOpen, FiTarget, FiStar } from 'react-icons/fi';
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
            const text = err.response?.status === 429
                ? (err.response?.data?.message || 'You are sending messages too quickly. Please wait a moment and try again.')
                : (err.response?.data?.message && err.response?.status === 400)
                    ? err.response.data.message
                    : 'Sorry, I am having a bit of a brain freeze. Please try again later!';
            setMessages(prev => [...prev, { role: 'model', text }]);
        } finally {
            setLoading(false);
        }
    };

    const PROMPTS = [
        { icon: <FiZap />, text: 'Explain Photosynthesis' },
        { icon: <FiTarget />, text: 'What is Newton\'s 2nd Law?' },
        { icon: <FiBookOpen />, text: 'Integration Formulas' },
    ];
    const onlyGreeting = messages.length === 1;

    return (
        <div className="flex flex-col h-[calc(100dvh-13rem)] lg:h-[calc(100vh-10rem)] min-h-[480px] ui-card overflow-hidden">
            {/* Header */}
            <div className="relative bg-brand-dark px-5 md:px-6 py-4 flex items-center justify-between text-white overflow-hidden">
                <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-brand-500/30 blur-3xl animate-float-slow" />
                <div className="relative flex items-center gap-3">
                    <div className="relative w-11 h-11 rounded-2xl bg-brand-gradient flex items-center justify-center text-xl shadow-brand-glow">
                        <FiCpu />
                        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-ink-900" />
                    </div>
                    <div>
                        <h2 className="text-lg font-extrabold tracking-tight leading-tight">AI Study Buddy</h2>
                        <p className="text-xs text-white/60">{loading ? 'Typing…' : 'Online · ask anything about JEE / NCERT'}</p>
                    </div>
                </div>
                <span className="relative hidden sm:inline-flex ui-badge bg-white/10 border border-white/10 text-brand-300"><FiStar /> Oasis AI</span>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto ui-scrollbar px-4 md:px-6 py-6 space-y-5 bg-gray-50/60 dark:bg-ink-950/40" aria-live="polite">
                {messages.map((msg, i) => {
                    const mine = msg.role === 'user';
                    return (
                        <div key={i} className={`flex ${mine ? 'justify-end animate-slide-in-right' : 'justify-start animate-slide-in-left'}`}>
                            <div className={`max-w-[88%] md:max-w-[75%] flex items-end gap-2.5 ${mine ? 'flex-row-reverse' : ''}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm ${mine ? 'bg-ink-900 text-white dark:bg-white dark:text-ink-900' : 'bg-brand-gradient text-white shadow-brand-soft'}`}>
                                    {mine ? <FiUser /> : <FiCpu />}
                                </div>
                                <div className={`px-4 py-3 text-sm leading-relaxed shadow-sm ${mine
                                    ? 'bg-brand-gradient text-white rounded-2xl rounded-br-md'
                                    : 'bg-white dark:bg-ink-800 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-white/5 rounded-2xl rounded-bl-md'
                                    }`}>
                                    {msg.text.split('\n').map((line, idx) => (
                                        <p key={idx} className={idx > 0 ? 'mt-2' : ''}>{line}</p>
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })}
                {onlyGreeting && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 ui-stagger">
                        {PROMPTS.map((p, i) => (
                            <button
                                key={i}
                                onClick={() => setInput(p.text)}
                                className="group text-left p-4 rounded-2xl bg-white dark:bg-ink-800 border border-gray-100 dark:border-white/5 hover:border-brand-200 hover:shadow-card hover:-translate-y-0.5 transition-all"
                            >
                                <span className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-500/10 text-brand-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">{p.icon}</span>
                                <span className="block text-sm font-semibold text-gray-800 dark:text-gray-100">{p.text}</span>
                            </button>
                        ))}
                    </div>
                )}
                {loading && (
                    <div className="flex justify-start animate-fade-in">
                        <div className="flex items-end gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-brand-gradient text-white flex items-center justify-center text-sm"><FiCpu /></div>
                            <div className="bg-white dark:bg-ink-800 border border-gray-100 dark:border-white/5 px-4 py-3.5 rounded-2xl rounded-bl-md shadow-sm flex items-center gap-1.5" aria-label="AI is typing">
                                <span className="w-2 h-2 bg-brand-300 rounded-full animate-bounce"></span>
                                <span className="w-2 h-2 bg-brand-500 rounded-full animate-bounce [animation-delay:0.15s]"></span>
                                <span className="w-2 h-2 bg-brand-700 rounded-full animate-bounce [animation-delay:0.3s]"></span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={scrollRef} />
            </div>

            {/* Quick Prompts */}
            {!onlyGreeting && (
                <div className="px-4 md:px-6 py-2.5 border-t border-gray-100 dark:border-white/5 flex gap-2 overflow-x-auto no-scrollbar">
                    {PROMPTS.map((p, i) => (
                        <button
                            key={i}
                            onClick={() => setInput(p.text)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-gray-500 dark:text-gray-300 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 hover:text-brand-600 hover:border-brand-200 hover:bg-brand-50 transition-all shrink-0"
                        >
                            {p.icon} {p.text}
                        </button>
                    ))}
                </div>
            )}

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-3 md:p-4 border-t border-gray-100 dark:border-white/5 flex gap-2 md:gap-3 items-center">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask anything… e.g. derive v² = u² + 2as"
                    maxLength={2000}
                    className="ui-input !rounded-2xl !py-3.5 dark:text-white"
                    disabled={loading}
                    aria-label="Message"
                />
                <button
                    type="submit"
                    className="shrink-0 w-12 h-12 rounded-2xl bg-brand-gradient text-white flex items-center justify-center shadow-brand-soft hover:shadow-brand-glow hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:hover:scale-100"
                    disabled={loading || !input.trim()}
                    aria-label="Send message"
                >
                    <FiSend className={loading ? 'animate-pulse' : ''} />
                </button>
            </form>
        </div>
    );
};

export default AIStudyBuddy;
