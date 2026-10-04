// Hindi dictionary = merge of every per-role dictionary file.
// Don't add keys here — edit src/i18n/dict/<role>.hi.js instead.
import common from './dict/common.hi';
import student from './dict/student.hi';
import teacher from './dict/teacher.hi';
import parent from './dict/parent.hi';
import admin from './dict/admin.hi';

const hi = { ...common, ...student, ...teacher, ...parent, ...admin };
export default hi;
