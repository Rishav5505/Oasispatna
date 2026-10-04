import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { FiUploadCloud, FiFileText, FiImage, FiTrash2, FiExternalLink, FiSearch, FiBookOpen, FiSend } from 'react-icons/fi';
import { notify } from '../../utils/notify';
import { API, authHeaders, errMsg, fileHref, idOf } from './teacherApi';
import { Badge, ConfirmButton, EmptyState, Field, PageHeader, Spinner } from './TeacherUI';

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = /\.(pdf|jpe?g|png|webp|gif)$/i;
const emptyForm = { title: '', classId: '', subjectId: '', file: null };

const StudyResources = ({ teacherData }) => {
    const teacherSubjects = useMemo(() => teacherData?.subjects || [], [teacherData]);
    const teacherClasses = teacherData?.classes || [];

    const [form, setForm] = useState(emptyForm);
    const [fileKey, setFileKey] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [classSubjects, setClassSubjects] = useState(null); // null = not loaded / use teacher subjects

    const [materials, setMaterials] = useState([]);
    const [loadingList, setLoadingList] = useState(true);
    const [search, setSearch] = useState('');
    const [dragging, setDragging] = useState(false);

    const fetchMine = useCallback(async () => {
        try {
            const res = await axios.get(`${API}/study-material/mine`, { headers: authHeaders() });
            setMaterials(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            notify(errMsg(err, 'Failed to load your uploads'));
        } finally {
            setLoadingList(false);
        }
    }, []);

    useEffect(() => { fetchMine(); }, [fetchMine]);

    const handleClassChange = async (classId) => {
        setForm(f => ({ ...f, classId, subjectId: '' }));
        if (!classId) { setClassSubjects(null); return; }
        try {
            const res = await axios.get(`${API}/academics/subjects`, { headers: authHeaders(), params: { classId } });
            const list = Array.isArray(res.data) ? res.data : [];
            const mineIds = new Set(teacherSubjects.map(s => s._id));
            const mine = list.filter(s => mineIds.has(s._id));
            // Prefer the teacher's own subjects within this class; fall back to the class's subjects
            setClassSubjects(mine.length ? mine : (list.length ? list : null));
        } catch {
            setClassSubjects(null);
        }
    };

    const subjectOptions = classSubjects || teacherSubjects;

    const handleFile = (file) => {
        if (!file) return;
        if (!ALLOWED.test(file.name)) { notify('Only PDF or image files (jpg, png, webp, gif) are allowed'); return; }
        if (file.size > MAX_BYTES) { notify('File too large: maximum size is 10 MB'); return; }
        setForm(f => ({ ...f, file }));
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!form.file) { notify('Please select a file to upload'); return; }
        const fd = new FormData();
        fd.append('title', form.title);
        fd.append('subjectId', form.subjectId);
        if (form.classId) fd.append('classId', form.classId);
        fd.append('file', form.file);
        setUploading(true);
        try {
            await axios.post(`${API}/study-material`, fd, { headers: { ...authHeaders(), 'Content-Type': 'multipart/form-data' } });
            notify('Study material uploaded successfully!');
            setForm(emptyForm);
            setClassSubjects(null);
            setFileKey(k => k + 1);
            fetchMine();
        } catch (err) {
            notify(errMsg(err, 'Failed to upload material'));
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`${API}/study-material/${id}`, { headers: authHeaders() });
            setMaterials(list => list.filter(m => m._id !== id));
            notify('Material deleted');
        } catch (err) {
            notify(errMsg(err, 'Failed to delete material'));
        }
    };

    const className = (m) => m.classId?.name || teacherClasses.find(c => c._id === idOf(m.classId))?.name || '';
    const subjectName = (m) => m.subjectId?.name || teacherSubjects.find(s => s._id === idOf(m.subjectId))?.name || 'Subject';

    const filtered = materials.filter(m => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return [m.title, subjectName(m), className(m)].some(v => String(v || '').toLowerCase().includes(q));
    });

    return (
        <div className="space-y-6">
            <PageHeader
                icon={FiBookOpen}
                eyebrow="Teaching"
                title="Study resources"
                subtitle="Upload PDF notes, DPPs or images for your students."
            />
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-5 md:gap-6">
                <div className="xl:col-span-2">
                    <form onSubmit={handleUpload} className="ui-card p-5 md:p-6 space-y-4 xl:sticky xl:top-4">
                        <div className="flex items-center gap-3 pb-1">
                            <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 flex items-center justify-center"><FiUploadCloud /></div>
                            <div>
                                <h3 className="font-extrabold tracking-tight text-gray-900 dark:text-white">New upload</h3>
                                <p className="text-xs text-gray-500">PDF or image, up to 10 MB</p>
                            </div>
                        </div>
                        <Field label="Title">
                            <input
                                type="text"
                                placeholder="e.g., Rotational Motion – DPP 3"
                                className="ui-input"
                                value={form.title}
                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                required
                            />
                        </Field>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <Field label="Class">
                                <select className="ui-input" value={form.classId} onChange={(e) => handleClassChange(e.target.value)}>
                                    <option value="">All my classes</option>
                                    {teacherClasses.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                </select>
                            </Field>
                            <Field label="Subject">
                                <select className="ui-input" value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })} required>
                                    <option value="">Choose…</option>
                                    {subjectOptions.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                                </select>
                            </Field>
                        </div>
                        <div
                            className="relative group cursor-pointer"
                            onDragEnter={() => setDragging(true)}
                            onDragLeave={() => setDragging(false)}
                            onDrop={() => setDragging(false)}
                        >
                            <input
                                key={fileKey}
                                type="file"
                                aria-label="Choose file"
                                accept=".pdf,image/jpeg,image/png,image/webp,image/gif"
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                onChange={(e) => handleFile(e.target.files[0])}
                            />
                            <div className={`p-7 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center transition-all duration-300 ${dragging
                                ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10 scale-[1.02]'
                                : form.file
                                    ? 'border-brand-300 bg-brand-50/50 dark:bg-brand-500/5 text-brand-700'
                                    : 'border-gray-200 dark:border-white/10 text-gray-400 group-hover:border-brand-300 group-hover:bg-brand-50/40 dark:group-hover:bg-white/[0.03]'}`}
                            >
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl mb-3 transition-transform group-hover:-translate-y-1 ${form.file ? 'bg-brand-gradient text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-400'}`}>
                                    {form.file ? <FiFileText /> : <FiUploadCloud />}
                                </div>
                                <p className="font-semibold text-sm break-all">{form.file ? form.file.name : 'Drop a file here or click to browse'}</p>
                                {!form.file && <p className="text-[11px] mt-1">PDF, JPG, PNG, WEBP, GIF</p>}
                                {form.file && <p className="text-[11px] mt-1 text-gray-500">{(form.file.size / 1024 / 1024).toFixed(2)} MB</p>}
                            </div>
                        </div>
                        <button type="submit" disabled={uploading} className="ui-btn-primary w-full py-3">
                            <FiSend /> {uploading ? 'Uploading…' : 'Publish to students'}
                        </button>
                    </form>
                </div>

                <div className="xl:col-span-3 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <h3 className="text-lg font-extrabold tracking-tight text-gray-900 dark:text-white">My uploads <span className="ml-1 ui-badge bg-gray-100 dark:bg-white/10 text-gray-500">{materials.length}</span></h3>
                        <div className="relative sm:w-64">
                            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search uploads…" aria-label="Search uploads" className="ui-input pl-10 !py-2.5" />
                        </div>
                    </div>

                    {loadingList ? (
                        <div className="ui-card p-4"><Spinner label="Loading your uploads..." rows={4} /></div>
                    ) : filtered.length === 0 ? (
                        <EmptyState icon={FiBookOpen} title={materials.length ? 'No uploads match your search' : 'No uploads yet'} hint={materials.length ? '' : 'Materials you upload will show up here.'} />
                    ) : (
                        <div className="space-y-2.5 ui-stagger">
                            {filtered.map(m => {
                                const isPdf = /\.pdf$/i.test(m.fileUrl || '');
                                return (
                                    <div key={m._id} className="group ui-card !rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center gap-3.5 hover:shadow-card-hover hover:border-brand-100">
                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0 transition-transform group-hover:scale-110 ${isPdf ? 'bg-red-50 text-red-500 dark:bg-red-500/10' : 'bg-brand-50 text-brand-600 dark:bg-brand-500/10'}`}>
                                            {isPdf ? <FiFileText /> : <FiImage />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-gray-800 dark:text-gray-100 truncate">{m.title}</p>
                                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                                <Badge tone="brand">{subjectName(m)}</Badge>
                                                {className(m) && <Badge tone="grey">{className(m)}</Badge>}
                                                <span className="text-[11px] text-gray-400">{m.createdAt ? new Date(m.createdAt).toLocaleDateString() : ''}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <a href={fileHref(m.fileUrl)} target="_blank" rel="noopener noreferrer" className="ui-btn-secondary !px-3.5 !py-2 text-xs">
                                                <FiExternalLink /> Open
                                            </a>
                                            <ConfirmButton
                                                onConfirm={() => handleDelete(m._id)}
                                                title="Delete material"
                                                className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 transition"
                                            >
                                                <FiTrash2 />
                                            </ConfirmButton>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudyResources;
