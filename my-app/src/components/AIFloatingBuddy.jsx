import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { FaRobot, FaTimes, FaPaperPlane, FaMinus, FaExternalLinkAlt } from 'react-icons/fa';
import config from '../config';

const AIFloatingBuddy = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [message, setMessage] = useState('');
    const [chatHistory, setChatHistory] = useState([
        { role: 'model', parts: [{ text: 'Hello! I am your Oasis Study Buddy. 🎓 How can I help you with Physics, Maths, or finding your way around today?' }] }
    ]);
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chatHistory]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!message.trim() || loading) return;

        const userMsg = message;
        setMessage('');
        const updatedHistory = [...chatHistory, { role: 'user', parts: [{ text: userMsg }] }];
        setChatHistory(updatedHistory);
        setLoading(true);

        try {
            const response = await axios.post(`${config.API_URL}/ai-buddy/chat`, {
                message: userMsg,
                history: chatHistory
            });

            setChatHistory([...updatedHistory, { role: 'model', parts: [{ text: response.data.text }] }]);
        } catch (err) {
            console.error('AI Buddy Error:', err);
            setChatHistory([...updatedHistory, { role: 'model', parts: [{ text: "Oops, my brain is a bit foggy. Please try again! 🧊" }] }]);
        } finally {
            setLoading(false);
        }
    };

    const suggestions = [
        "Newton's 3rd Law?",
        "Solve Quadratic Eq?",
        "Show all courses",
        "How to book demo?"
    ];

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-700 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-[9999] group animate-bounce"
            >
                <FaRobot className="text-3xl group-hover:rotate-12 transition-transform" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-900 rounded-full border-2 border-white animate-pulse"></span>
            </button>
        );
    }

    return (
        <div className={`fixed z-[9999] transition-all duration-300 ${isMinimized ? 'bottom-6 right-6 w-72 h-14' : 'bottom-6 right-6 w-80 md:w-96 h-[500px] md:h-[600px]'} flex flex-col bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] overflow-hidden border border-orange-100/50`}>
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-600 via-orange-500 to-slate-900 p-4 flex items-center justify-between text-white shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                        <FaRobot className="text-lg" />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm tracking-tight">Oasis Buddy</h3>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                            <span className="text-[10px] font-bold opacity-90 uppercase tracking-widest">AI Assistant Online</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsMinimized(!isMinimized)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <FaMinus size={14} />
                    </button>
                    <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <FaTimes size={14} />
                    </button>
                </div>
            </div>

            {!isMinimized && (
                <>
                    {/* Chat Body */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#fffaf5] scrollbar-hide">
                        {chatHistory.map((chat, idx) => (
                            <div key={idx} className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                                <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${chat.role === 'user'
                                    ? 'bg-orange-600 text-white rounded-tr-none shadow-md font-medium'
                                    : 'bg-white text-gray-700 rounded-tl-none shadow-sm border border-orange-100'
                                    }`}>
                                    {chat.parts[0].text}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-orange-100 flex gap-1">
                                    <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce"></div>
                                    <div className="w-1.5 h-1.5 bg-orange-300 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                    <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Suggestions */}
                    <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar bg-[#fffaf5] border-t border-orange-100/50">
                        {suggestions.map((s, idx) => (
                            <button
                                key={idx}
                                onClick={() => {
                                    setMessage(s);
                                }}
                                className="whitespace-nowrap px-3 py-1.5 bg-white border border-orange-100 rounded-full text-xs font-bold text-gray-600 hover:border-orange-500 hover:text-orange-600 transition-all shadow-sm shrink-0"
                            >
                                {s}
                            </button>
                        ))}
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSend} className="p-4 bg-white border-t border-orange-100 shrink-0">
                        <div className="relative flex items-center">
                            <input
                                type="text"
                                placeholder="Ask about Physics, Maths..."
                                className="w-full pl-4 pr-12 py-3 bg-orange-50/30 border border-orange-100 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all text-gray-800 placeholder:text-gray-400"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                            />
                            <button
                                type="submit"
                                disabled={!message.trim() || loading}
                                className="absolute right-2 p-2 bg-orange-600 text-white rounded-xl hover:bg-orange-700 disabled:opacity-50 transition-all shadow-md active:scale-95"
                            >
                                <FaPaperPlane size={14} />
                            </button>
                        </div>
                        <p className="text-[9px] text-gray-400 text-center mt-2 font-bold tracking-widest uppercase">
                            Powered by Oasis AI Intelligence
                        </p>
                    </form>
                </>
            )}
        </div>
    );
};

export default AIFloatingBuddy;
