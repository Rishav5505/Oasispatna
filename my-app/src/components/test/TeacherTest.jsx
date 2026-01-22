import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import config from '../../config';
import { FaLaptopCode, FaPlus, FaTimes, FaTrash, FaCheckCircle, FaChartBar, FaFileAlt } from 'react-icons/fa';

const TeacherTest = ({ teacherData }) => {
    const [tests, setTests] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [viewingResults, setViewingResults] = useState(null); // testId
    const [results, setResults] = useState([]);
    const subjects = teacherData?.subjects || [];
    const classes = teacherData?.classes || [];
    const batches = teacherData?.batches || [];

    const [testMode, setTestMode] = useState('manual'); // 'manual' or 'upload'
    const [questionFile, setQuestionFile] = useState(null);
    const [numQuestions, setNumQuestions] = useState(1);

    const [newTest, setNewTest] = useState({
        title: '',
        description: '',
        subjectId: '',
        classId: '',
        batchId: '',
        duration: 30,
        totalMarks: 0,
        status: 'active',
        questionPaperUrl: null,
        questions: [{ questionText: '', options: ['', '', '', ''], correctOption: 0, marks: 1 }]
    });

    const fetchTests = useCallback(async () => {
        const token = sessionStorage.getItem('token');
        if (!token) return;

        try {
            // Decode token to get user ID
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const payload = JSON.parse(window.atob(base64));
            const teacherId = payload.user.id;

            const res = await axios.get(`${config.API_URL}/tests/teacher/${teacherId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTests(res.data);
        } catch (err) {
            console.error('Error fetching tests:', err);
        }
    }, []);

    useEffect(() => {
        fetchTests();
    }, [fetchTests]);

    const handleAddQuestion = () => {
        setNewTest({
            ...newTest,
            questions: [...newTest.questions, { questionText: '', options: ['', '', '', ''], correctOption: 0, marks: 1 }]
        });
    };

    const handleRemoveQuestion = (index) => {
        const updated = [...newTest.questions];
        updated.splice(index, 1);
        setNewTest({ ...newTest, questions: updated });
    };

    const handleQuestionChange = (index, field, value) => {
        const updated = [...newTest.questions];
        updated[index][field] = value;
        setNewTest({ ...newTest, questions: updated });
    };

    const handleOptionChange = (qIndex, oIndex, value) => {
        const updated = [...newTest.questions];
        updated[qIndex].options[oIndex] = value;
        setNewTest({ ...newTest, questions: updated });
    };

    const generateAnswerSheet = (count) => {
        const questions = Array.from({ length: count }, (_, i) => ({
            questionText: `Question ${i + 1}`,
            options: ['A', 'B', 'C', 'D'],
            correctOption: 0,
            marks: 1
        }));
        setNewTest({ ...newTest, questions });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = sessionStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        if (!newTest.subjectId || !newTest.classId) {
            alert('Please select BOTH Subject and Class before publishing.');
            return;
        }

        try {
            let uploadedUrl = null;
            if (testMode === 'upload' && questionFile) {
                const formData = new FormData();
                formData.append('file', questionFile);
                const uploadRes = await axios.post(`${config.API_URL}/tests/upload`, formData, {
                    headers: { ...headers, 'Content-Type': 'multipart/form-data' }
                });
                uploadedUrl = uploadRes.data.url;
            }

            const totalMarks = newTest.questions.reduce((sum, q) => sum + Number(q.marks), 0);

            const testPayload = {
                ...newTest,
                totalMarks,
                questionPaperUrl: uploadedUrl
            };

            // Remove batchId if it's empty
            if (!testPayload.batchId) {
                delete testPayload.batchId;
            }

            await axios.post(`${config.API_URL}/tests`, testPayload, { headers });

            setIsModalOpen(false);
            fetchTests();
            alert('Test created successfully!');
        } catch (err) {
            console.error('Error creating test:', err);
            const errMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to create test';
            alert(`Error: ${errMsg}`);
        }
    };

    const fetchResults = async (testId) => {
        const token = sessionStorage.getItem('token');
        try {
            // Need a backend endpoint for this
            const res = await axios.get(`${config.API_URL}/tests/${testId}/results`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setResults(res.data);
            setViewingResults(testId);
        } catch (err) {
            console.error('Error fetching results:', err);
            alert('Results viewing not implemented in backend yet');
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                        <FaLaptopCode className="text-emerald-500" /> Assessment Center
                    </h2>
                    <p className="text-gray-500 font-medium">Create and manage online MCQ examinations</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 shadow-xl transition-all flex items-center gap-3"
                >
                    <FaPlus /> CREATE NEW TEST
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {tests.map(test => (
                    <div key={test._id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-2xl transition-all group overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-2 h-full bg-emerald-400"></div>
                        <h3 className="text-xl font-black text-gray-800 mb-2 uppercase tracking-tight">{test.title}</h3>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-6">
                            {test.subjectId?.name || 'Academic'} • {test.questions?.length} Qs • {test.duration} MINS
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => fetchResults(test._id)}
                                className="flex-1 bg-emerald-50 text-emerald-600 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center gap-2"
                            >
                                <FaChartBar /> RESULTS
                            </button>
                            <button className="p-4 bg-gray-50 text-gray-400 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all">
                                <FaTrash />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create Test Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-[999]">
                    <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Test Constructor</h3>
                            <button onClick={() => setIsModalOpen(false)} className="bg-white p-3 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all shadow-sm">
                                <FaTimes />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
                            {/* Metadata Section */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Subject</label>
                                    <select
                                        required
                                        className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold"
                                        value={newTest.subjectId}
                                        onChange={(e) => setNewTest({ ...newTest, subjectId: e.target.value })}
                                    >
                                        <option value="">Select Subject</option>
                                        {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Target Class</label>
                                    <select
                                        required
                                        className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold"
                                        value={newTest.classId}
                                        onChange={(e) => setNewTest({ ...newTest, classId: e.target.value })}
                                    >
                                        <option value="">Select Class</option>
                                        {classes.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Duration (Mins)</label>
                                    <input
                                        required
                                        type="number"
                                        className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold"
                                        value={newTest.duration}
                                        onChange={(e) => setNewTest({ ...newTest, duration: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Test Title</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g. Weekly Physics Quiz"
                                    className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold"
                                    value={newTest.title}
                                    onChange={(e) => setNewTest({ ...newTest, title: e.target.value })}
                                />
                            </div>

                            {/* Test Mode Selection */}
                            <div className="flex items-center gap-6 p-1 bg-gray-50 rounded-2xl w-fit">
                                <button
                                    type="button"
                                    onClick={() => setTestMode('manual')}
                                    className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${testMode === 'manual' ? 'bg-white shadow-md text-indigo-600' : 'text-gray-400 hover:text-gray-600'
                                        }`}
                                >
                                    Manual Entry
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTestMode('upload')}
                                    className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${testMode === 'upload' ? 'bg-white shadow-md text-indigo-600' : 'text-gray-400 hover:text-gray-600'
                                        }`}
                                >
                                    Upload Paper
                                </button>
                            </div>

                            {/* File Upload Section */}
                            {testMode === 'upload' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="bg-indigo-50 border-2 border-dashed border-indigo-200 rounded-[2rem] p-10 text-center relative group hover:bg-indigo-100 transition-all">
                                        <input
                                            type="file"
                                            accept=".pdf,image/*"
                                            onChange={(e) => setQuestionFile(e.target.files[0])}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        />
                                        <FaFileAlt className="text-4xl text-indigo-300 mx-auto mb-4 group-hover:scale-110 transition-transform" />
                                        <h4 className="font-bold text-indigo-900 mb-1">
                                            {questionFile ? questionFile.name : 'Upload Question Paper (PDF/Image)'}
                                        </h4>
                                        <p className="text-xs text-indigo-400 font-medium">Click or Drag file here</p>
                                    </div>

                                    <div className="bg-gray-50 p-8 rounded-[2rem] flex items-center justify-between">
                                        <div>
                                            <h4 className="font-bold text-gray-800">Answer Key Generator</h4>
                                            <p className="text-xs text-gray-400 font-medium mt-1">Auto-generate OMR sheet for your paper</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="number"
                                                min="1"
                                                max="200"
                                                value={numQuestions}
                                                onChange={(e) => setNumQuestions(Number(e.target.value))}
                                                className="w-20 bg-white border-none rounded-xl p-3 text-center font-black shadow-sm"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => generateAnswerSheet(numQuestions)}
                                                className="bg-gray-900 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 shadow-lg shadow-gray-200 transition-all"
                                            >
                                                Generate
                                            </button>
                                        </div>
                                    </div>

                                    {/* Generated Answer Key */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {newTest.questions.map((q, qIndex) => (
                                            <div key={qIndex} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                                                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Q{qIndex + 1}</span>
                                                <div className="flex items-center gap-2">
                                                    <select
                                                        value={q.correctOption}
                                                        onChange={(e) => {
                                                            const updated = [...newTest.questions];
                                                            updated[qIndex].correctOption = Number(e.target.value);
                                                            setNewTest({ ...newTest, questions: updated });
                                                        }}
                                                        className="bg-indigo-50 border-none rounded-lg p-2 text-xs font-bold text-indigo-700"
                                                    >
                                                        {q.options.map((opt, oIdx) => (
                                                            <option key={oIdx} value={oIdx}>{String.fromCharCode(65 + oIdx)}</option>
                                                        ))}
                                                    </select>
                                                    <input
                                                        type="number"
                                                        value={q.marks}
                                                        onChange={(e) => {
                                                            const updated = [...newTest.questions];
                                                            updated[qIndex].marks = Number(e.target.value);
                                                            setNewTest({ ...newTest, questions: updated });
                                                        }}
                                                        className="w-12 bg-gray-50 border-none rounded-lg p-2 text-center text-xs font-bold"
                                                        placeholder="Mks"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Manual Question Builder (Only if 'manual') */}
                            {testMode === 'manual' && (
                                <>
                                    <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                                        <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                            <FaFileAlt /> Question Inventory ({newTest.questions.length})
                                        </h4>
                                    </div>

                                    {newTest.questions.map((question, qIndex) => (
                                        <div key={qIndex} className="bg-gray-50 p-8 rounded-[2.5rem] relative group border border-transparent hover:border-gray-200 transition-all">
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveQuestion(qIndex)}
                                                className="absolute top-6 right-6 p-2 bg-white text-gray-300 hover:text-red-500 rounded-full hover:shadow-md transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <FaTrash />
                                            </button>

                                            <div className="space-y-6">
                                                <div className="flex items-center gap-4">
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Question {qIndex + 1}</span>
                                                </div>

                                                <textarea
                                                    required
                                                    rows="3"
                                                    className="w-full bg-white border-none rounded-2xl p-6 font-bold text-gray-800 placeholder-gray-300 focus:ring-2 focus:ring-indigo-500 transition-all resize-none shadow-sm"
                                                    placeholder="Type your question here..."
                                                    value={question.questionText}
                                                    onChange={(e) => handleQuestionChange(qIndex, 'questionText', e.target.value)}
                                                />

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {question.options.map((option, oIndex) => (
                                                        <div key={oIndex} className="flex items-center gap-4 bg-white p-3 pr-6 rounded-2xl border border-gray-100 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-200 transition-all">
                                                            <input
                                                                type="radio"
                                                                name={`correct-${qIndex}`}
                                                                checked={question.correctOption === oIndex}
                                                                onChange={() => handleQuestionChange(qIndex, 'correctOption', oIndex)}
                                                                className="w-5 h-5 text-indigo-600 border-gray-300 focus:ring-indigo-500 ml-2 cursor-pointer"
                                                            />
                                                            <input
                                                                required
                                                                type="text"
                                                                className="flex-1 bg-transparent border-none p-2 text-sm font-medium focus:ring-0 placeholder-gray-300"
                                                                placeholder={`Option ${String.fromCharCode(65 + oIndex)}`}
                                                                value={option}
                                                                onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="flex items-center justify-end">
                                                    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
                                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Marks:</span>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            className="w-12 bg-transparent border-none p-0 text-center font-bold text-indigo-600 focus:ring-0"
                                                            value={question.marks}
                                                            onChange={(e) => handleQuestionChange(qIndex, 'marks', e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    <button
                                        type="button"
                                        onClick={handleAddQuestion}
                                        className="w-full py-6 border-2 border-dashed border-gray-200 rounded-[2rem] text-xs font-black text-gray-400 uppercase tracking-widest hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                                    >
                                        <FaPlus /> Append Another Question
                                    </button>
                                </>
                            )}
                        </form>

                        <div className="p-8 bg-gray-50 border-t border-gray-100">
                            <button
                                type="submit"
                                onClick={handleSubmit}
                                className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 shadow-xl transition-all"
                            >
                                PUBLISH ASSESSMENT
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Results Sidebar/Modal */}
            {viewingResults && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-end z-[999]">
                    <div className="bg-white w-full max-w-xl h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Student Performance</h3>
                            <button onClick={() => setViewingResults(null)} className="bg-white p-3 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all shadow-sm">
                                <FaTimes />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 space-y-4">
                            {results.length > 0 ? results.map((res, idx) => (
                                <div key={idx} className="bg-gray-50 p-6 rounded-2xl flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-gray-800">{res.studentId?.name}</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Rank #{idx + 1}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xl font-black text-emerald-600">{res.score}/{res.totalMarks}</p>
                                        <p className="text-[10px] font-bold text-gray-300 uppercase">{new Date(res.submittedAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-20 grayscale opacity-30">
                                    <FaChartBar className="text-5xl mx-auto mb-4" />
                                    <p className="font-bold text-gray-400">No attempts yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherTest;
