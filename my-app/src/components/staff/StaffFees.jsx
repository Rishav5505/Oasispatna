import React from 'react';
import FeesDesk from '../admin/fees/FeesDesk';
import { useI18n } from '../../i18n/useI18n';

/**
 * Staff fees desk: the same guided fees section as the admin, minus what only an admin may do
 * (class fee structures, applying them, editing plans, reminders — the backend returns 403 for those).
 */
const StaffFees = ({ students = [], focusStudentId, onFocusHandled, onDataChanged }) => {
  const { t } = useI18n();
  return (
    <FeesDesk
      canManage={false}
      students={students}
      focusStudentId={focusStudentId}
      onFocusHandled={onFocusHandled}
      onDataChanged={onDataChanged}
      title={t('staff.heading.fees')}
      subtitle={t('staff.fees.subtitle')}
    />
  );
};

export default StaffFees;
