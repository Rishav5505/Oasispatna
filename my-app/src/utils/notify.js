import toast from 'react-hot-toast';

const ERROR_RE = /fail|error|invalid|unable|denied|wrong|not |please|cannot|can't|expired|missing|required/i;
const SUCCESS_RE = /success|sent|verified|submitted|created|added|scheduled|updated|deleted|removed|saved|marked|uploaded|approved|published|reset/i;

// Drop-in replacement for alert(): picks a toast style from the message text.
export const notify = (message) => {
  const text = String(message ?? '');
  if (ERROR_RE.test(text)) return toast.error(text);
  if (SUCCESS_RE.test(text)) return toast.success(text);
  return toast(text);
};

export { toast };
