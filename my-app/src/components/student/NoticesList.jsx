import React, { useState, useMemo } from 'react';
import { FiClock, FiSearch, FiChevronRight } from 'react-icons/fi';
import { HiOutlineSpeakerphone } from 'react-icons/hi';
import { SkeletonRows, EmptyState, PageHeader } from './StudentUI';

const isRecent = (date) => date && new Date(date) > new Date(Date.now() - 7 * 86400000);

const NoticesList = ({ notices = [], loading, onSelect }) => {
    const [query, setQuery] = useState('');

    const sorted = useMemo(() => {
        const q = query.trim().toLowerCase();
        return [...notices]
            .filter(n => !q || `${n.title || ''} ${n.content || n.description || ''}`.toLowerCase().includes(q))
            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }, [notices, query]);

    return (
        <div className="space-y-6">
            <PageHeader
                icon={HiOutlineSpeakerphone}
                title="Notice Board"
                subtitle="All official announcements from Oasis"
                action={(
                    <div className="relative w-full md:w-72">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search notices..."
                            className="ui-input !pl-11 dark:text-white"
                            aria-label="Search notices"
                        />
                    </div>
                )}
            />

            {loading ? (
                <SkeletonRows count={4} />
            ) : sorted.length === 0 ? (
                <EmptyState
                    icon={<HiOutlineSpeakerphone />}
                    title={query ? 'No matching notices' : 'No announcements yet'}
                    message={query ? 'Try a different search term.' : 'Official notices will appear here as soon as they are published.'}
                />
            ) : (
                <div className="space-y-3 ui-stagger">
                    {sorted.map(notice => (
                        <button
                            key={notice._id}
                            onClick={() => onSelect?.(notice)}
                            className="ui-card ui-card-hover w-full text-left p-5 flex items-start gap-4 group"
                        >
                            <div className="w-14 h-14 shrink-0 rounded-2xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 flex flex-col items-center justify-center leading-none group-hover:bg-brand-gradient group-hover:text-white transition-all">
                                <span className="text-xl font-extrabold">{notice.createdAt ? new Date(notice.createdAt).getDate() : '–'}</span>
                                <span className="text-[10px] font-bold uppercase mt-0.5">{notice.createdAt ? new Date(notice.createdAt).toLocaleDateString(undefined, { month: 'short' }) : ''}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-brand-700 dark:group-hover:text-brand-400 transition-colors truncate">{notice.title}</h3>
                                    {isRecent(notice.createdAt) && <span className="ui-badge bg-brand-500 text-white shrink-0 !text-[10px]"><span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />New</span>}
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{notice.content || notice.description}</p>
                                <p className="text-xs font-semibold text-gray-400 mt-2 flex items-center gap-1.5">
                                    <FiClock /> {notice.createdAt ? new Date(notice.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : 'Date unavailable'}
                                </p>
                            </div>
                            <FiChevronRight className="text-gray-300 group-hover:text-brand-500 group-hover:translate-x-1 transition-all mt-5 shrink-0" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default NoticesList;
