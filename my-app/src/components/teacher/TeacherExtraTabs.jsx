import React from 'react';
import { FiMessageSquare, FiFileText, FiFlag, FiSliders } from 'react-icons/fi';
import { useI18n } from '../../i18n/useI18n';
import ChatPanel from '../common/ChatPanel';
import LeaveRequests from '../common/LeaveRequests';
import EventCalendar from '../common/EventCalendar';
import LanguageToggle from '../common/LanguageToggle';
import PushToggle from '../common/PushToggle';
import { PageHeader } from './TeacherUI';

export const MessagesTab = ({ socket, initialUserId }) => {
    const { t } = useI18n();
    return (
        <div className="space-y-6">
            <PageHeader icon={FiMessageSquare} eyebrow={t('teacher.group.classroom')} title={t('teacher.heading.messages')} subtitle={t('teacher.heading.messagesSub')} />
            {/* key so a new deep-link target re-opens the right conversation */}
            <ChatPanel key={initialUserId || 'inbox'} socket={socket || undefined} initialUserId={initialUserId || undefined} />
        </div>
    );
};

export const LeavesTab = () => {
    const { t } = useI18n();
    return (
        <div className="space-y-6">
            <PageHeader icon={FiFileText} eyebrow={t('teacher.group.classroom')} title={t('teacher.heading.leaves')} subtitle={t('teacher.heading.leavesSub')} />
            <LeaveRequests mode="both" role="teacher" />
        </div>
    );
};

export const CalendarTab = ({ teacherData }) => {
    const { t } = useI18n();
    return (
        <div className="space-y-6">
            <PageHeader icon={FiFlag} eyebrow={t('teacher.group.me')} title={t('teacher.heading.calendar')} subtitle={t('teacher.heading.calendarSub')} />
            <EventCalendar canEdit classOptions={teacherData?.classes || []} />
        </div>
    );
};

export const PreferencesCard = () => {
    const { t } = useI18n();
    return (
        <div className="ui-card p-5 md:p-6 animate-fade-up">
            <div className="flex items-center gap-3 mb-4">
                <span className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 text-brand-600 flex items-center justify-center"><FiSliders /></span>
                <div>
                    <h3 className="font-extrabold text-gray-900 dark:text-white">{t('teacher.heading.preferences')}</h3>
                    <p className="text-xs text-gray-500">{t('teacher.heading.preferencesSub')}</p>
                </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-600 dark:text-gray-300">{t('common.language')}</span>
                    <LanguageToggle />
                </div>
                <PushToggle className="sm:ml-auto" />
            </div>
        </div>
    );
};
