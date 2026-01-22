import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import config from '../../config';
import { FaLaptopCode, FaClock, FaTrophy, FaChevronRight, FaChevronLeft, FaCheckCircle, FaExclamationCircle, FaFileAlt, FaTimes } from 'react-icons/fa';

const StudentTest = ({ studentId }) => {
    const [tests, setTests] = useState([]);
    const [activeTest, setActiveTest] = useState(null);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState([]);
    const [timeLeft, setTimeLeft] = useState(0);
    const [testResult, setTestResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showPdf, setShowPdf] = useState(false);

    const fetchTests = useCallback(async () => {
        const token = sessionStorage.getItem('token');
        try {
            const res = await axios.get(`${config.API_URL}/tests/student/${studentId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTests(res.data);
        } catch (err) {
            console.error('Error fetching tests:', err);
        } finally {
            setLoading(false);
        }
    }, [studentId]);

    useEffect(() => {
        if (studentId) fetchTests();
    }, [studentId, fetchTests]);

    const handleSubmitTest = useCallback(async () => {
        if (!activeTest) return;
        const token = sessionStorage.getItem('token');
        try {
            const res = await axios.post(`${config.API_URL}/tests/submit`, {
                studentId,
                testId: activeTest._id,
                answers
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Fetch result with rank
            const resultRes = await axios.get(`${config.API_URL}/tests/result/${activeTest._id}/${studentId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTestResult(resultRes.data);
            setActiveTest(null);
        } catch (err) {
            console.error('Error submitting test:', err);
            alert('Failed to submit test. Please contact support.');
        }
    }, [activeTest, studentId, answers]);

    useEffect(() => {
        let timer;
        if (activeTest && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        handleSubmitTest();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [activeTest, timeLeft, handleSubmitTest]);

    const handleStartTest = (test) => {
        setActiveTest(test);
        setTimeLeft(test.duration * 60);
        setCurrentQuestionIndex(0);
        setAnswers([]);
        setTestResult(null);
    };

    const handleOptionSelect = (questionId, optionIndex) => {
        setAnswers(prev => {
            const existing = prev.find(a => a.questionId === questionId);
            if (existing) {
                return prev.map(a => a.questionId === questionId ? { ...a, selectedOption: optionIndex } : a);
            }
            return [...prev, { questionId, selectedOption: optionIndex }];
        });
    };

    if (loading) return <div className="text-center py-10">Loading assessments...</div>;

    if (testResult) {
        return (
            <div className="max-w-2xl mx-auto bg-white p-12 rounded-[3rem] shadow-2xl border border-gray-100 text-center">
                <div className="w-24 h-24 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-8">
                    <FaTrophy className="text-4xl text-yellow-500" />
                </div>
                <h2 className="text-3xl font-black text-gray-900 mb-2">Test Completed!</h2>
                <p className="text-gray-500 font-medium mb-10">Here is your performance summary</p>

                <div className="grid grid-cols-2 gap-6 mb-12">
                    <div className="bg-gray-50 p-6 rounded-[2rem]">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Score</p>
                        <p className="text-3xl font-black text-indigo-600">{testResult.score}/{testResult.totalMarks}</p>
                    </div>
                    <div className="bg-gray-50 p-6 rounded-[2rem]">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Rank</p>
                        <p className="text-3xl font-black text-emerald-600">#{testResult.rank}</p>
                    </div>
                </div>

                <button
                    onClick={() => { setTestResult(null); fetchTests(); }}
                    className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-gray-200"
                >
                    BACK TO DASHBOARD
                </button>
            </div>
        );
    }

    if (activeTest) {
        const currentQuestion = activeTest.questions[currentQuestionIndex];
        const selectedOption = answers.find(a => a.questionId === currentQuestion._id)?.selectedOption;
        const hasPdf = !!activeTest.questionPaperUrl;

        const formatTime = (seconds) => {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        };

        return (
            <div className="max-w-4xl mx-auto space-y-8 relative">
                {/* PDF Modal/Overlay */}
                {hasPdf && showPdf && (
                    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-200">
                        <div className="bg-white w-full h-full max-w-6xl rounded-[2rem] flex flex-col overflow-hidden relative shadow-2xl">
                            <div className="flex justify-between items-center p-6 bg-gray-50 border-b border-gray-200">
                                <h3 className="font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                                    <FaFileAlt className="text-indigo-600" /> Question Paper
                                </h3>
                                <button
                                    onClick={() => setShowPdf(false)}
                                    className="p-3 bg-white text-gray-500 hover:text-red-500 rounded-full shadow-sm border border-gray-100 transition-all hover:rotate-90"
                                >
                                    <FaTimes className="text-xl" />
                                </button>
                            </div>
                            <div className="flex-1 bg-gray-100 p-2 overflow-hidden">
                                <iframe
                                    src={`${config.API_URL}${activeTest.questionPaperUrl}`}
                                    className="w-full h-full rounded-xl border-0 shadow-inner"
                                    title="Question Paper"
                                />
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-between items-center bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 sticky top-4 z-30">
                    <div>
                        <h3 className="text-xl font-black text-gray-900">{activeTest.title}</h3>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Question {currentQuestionIndex + 1} of {activeTest.questions.length}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        {hasPdf && (
                            <button
                                onClick={() => setShowPdf(true)}
                                className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-100 transition-all border border-indigo-100"
                            >
                                <FaFileAlt /> View Paper
                            </button>
                        )}
                        <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-black ${timeLeft < 60 ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-gray-900 text-white'}`}>
                            <FaClock />
                            <span className="text-lg tabular-nums">{formatTime(timeLeft)}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-12 rounded-[3rem] shadow-sm border border-gray-100 min-h-[400px] flex flex-col">
                    <h4 className="text-2xl font-bold text-gray-800 mb-10 leading-relaxed">
                        {hasPdf && currentQuestion.questionText.startsWith('Question ')
                            ? `Refer to Question ${currentQuestionIndex + 1} in the Question Paper`
                            : currentQuestion.questionText}
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-auto">
                        {currentQuestion.options.map((option, idx) => {
                            const optionLetter = String.fromCharCode(65 + idx);
                            const isDuplicate = option === optionLetter;

                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleOptionSelect(currentQuestion._id, idx)}
                                    className={`group flex items-center gap-6 p-6 rounded-2xl border-2 text-left transition-all ${selectedOption === idx
                                        ? 'border-indigo-600 bg-indigo-50 shadow-md shadow-indigo-100'
                                        : 'border-gray-50 hover:border-indigo-100 hover:bg-gray-50'
                                        }`}
                                >
                                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-black transition-all ${selectedOption === idx ? 'bg-indigo-600 text-white' : 'bg-white text-gray-400 shadow-sm'
                                        }`}>
                                        {optionLetter}
                                    </span>
                                    <span className={`font-bold transition-all ${selectedOption === idx ? 'text-indigo-900' : 'text-gray-600'}`}>
                                        {isDuplicate ? `Option ${optionLetter}` : option}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex justify-between items-center mt-12 pt-8 border-t border-gray-100">
                        <button
                            disabled={currentQuestionIndex === 0}
                            onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                            className="flex items-center gap-2 text-xs font-black text-gray-400 hover:text-gray-900 disabled:opacity-30 transition-all uppercase tracking-widest px-4 py-2 hover:bg-gray-50 rounded-xl"
                        >
                            <FaChevronLeft /> Previous
                        </button>

                        <div className="flex gap-2">
                            {/* Pagination dots here eventually */}
                        </div>

                        {currentQuestionIndex === activeTest.questions.length - 1 ? (
                            <button
                                onClick={handleSubmitTest}
                                className="bg-emerald-500 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 shadow-xl shadow-emerald-100 transition-all"
                            >
                                FINISH TEST
                            </button>
                        ) : (
                            <button
                                onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                                className="flex items-center gap-2 bg-gray-900 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all"
                            >
                                Next <FaChevronRight />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                        <FaLaptopCode className="text-emerald-500" /> Assessments
                    </h2>
                    <p className="text-gray-500 font-medium">Test your knowledge with these challenges</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {tests.length > 0 ? tests.map(test => (
                    <div key={test._id} className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-2xl transition-all group flex flex-col">
                        <div className="flex justify-between items-start mb-8">
                            <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest border ${test.attempted
                                ? 'bg-blue-50 text-blue-600 border-blue-100'
                                : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                }`}>
                                {test.attempted ? 'Attempted' : 'Available'}
                            </span>
                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">{test.subjectId?.name}</span>
                        </div>

                        <h3 className="text-2xl font-black text-gray-800 mb-2 leading-tight group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{test.title}</h3>
                        <p className="text-sm text-gray-400 font-medium mb-8 italic">{test.questions?.length} MCQs • {test.totalMarks} Marks</p>

                        <div className="mt-auto flex items-center justify-between mb-10 bg-gray-50 p-6 rounded-3xl">
                            <div className="text-center">
                                <p className="text-2xl font-black text-gray-800">{test.duration}</p>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Minutes</p>
                            </div>
                            <div className="w-px h-10 bg-gray-200"></div>
                            <div className="text-center font-black">
                                {test.attempted ? (
                                    <>
                                        <p className="text-2xl text-indigo-600">{test.score}</p>
                                        <p className="text-[10px] text-gray-400 uppercase tracking-widest">Score</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-2xl text-gray-800">0</p>
                                        <p className="text-[10px] text-gray-400 uppercase tracking-widest">Attempts</p>
                                    </>
                                )}
                            </div>
                        </div>

                        {test.attempted ? (
                            <div className="flex items-center justify-center gap-2 text-emerald-600 font-black text-xs uppercase tracking-widest bg-emerald-50 py-5 rounded-2xl">
                                <FaCheckCircle /> COMPLETED
                            </div>
                        ) : (
                            <button
                                onClick={() => handleStartTest(test)}
                                className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-gray-200"
                            >
                                ATTEMPT TEST NOW
                            </button>
                        )}
                    </div>
                )) : (
                    <div className="col-span-full py-24 text-center bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
                        <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                            <FaExclamationCircle className="text-3xl text-gray-300" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-2">No Assessments Found</h3>
                        <p className="text-gray-400 font-medium max-w-xs mx-auto">There are no active tests for your batch at this time.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentTest;
