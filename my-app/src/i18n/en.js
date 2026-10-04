// English dictionary = merge of every per-role dictionary file.
// Don't add keys here — edit src/i18n/dict/<role>.en.js instead.
import common from './dict/common.en';
import student from './dict/student.en';
import teacher from './dict/teacher.en';
import parent from './dict/parent.en';
import admin from './dict/admin.en';

const en = { ...common, ...student, ...teacher, ...parent, ...admin };
export default en;
