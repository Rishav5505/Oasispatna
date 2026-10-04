const express = require('express');
const StudyMaterial = require('../models/StudyMaterial');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const { uploadSingle, fileUrl, removeUpload } = require('../utils/upload');
const { getOwnStudent, classScopeFilter, isOwnerOrAdmin, isObjectId } = require('../utils/access');

const router = express.Router();

// Upload study material (teacher | admin). Optional classId / batchId limit visibility.
router.post('/', auth, roleAuth('teacher', 'admin'), uploadSingle('file'), async (req, res) => {
  const { title, subjectId, classId, batchId } = req.body;
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    if (!title || !subjectId) {
      removeUpload(fileUrl(req.file));
      return res.status(400).json({ message: 'Title and subject are required' });
    }
    if (!isObjectId(String(subjectId)) || (classId && !isObjectId(String(classId))) || (batchId && !isObjectId(String(batchId)))) {
      removeUpload(fileUrl(req.file));
      return res.status(400).json({ message: 'Invalid subject, class or batch id' });
    }

    const material = new StudyMaterial({
      title,
      subjectId,
      classId: classId || undefined,
      batchId: batchId || undefined,
      fileUrl: fileUrl(req.file),
      uploadedBy: req.user.id,
    });
    await material.save();
    res.json(material);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Materials uploaded by me (teacher) / all (admin)
router.get('/mine', auth, roleAuth('teacher', 'admin'), async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? {} : { uploadedBy: req.user.id };
    const materials = await StudyMaterial.find(query)
      .populate('subjectId', 'name')
      .populate('classId', 'name')
      .populate('uploadedBy', 'name')
      .sort({ createdAt: -1 });
    res.json(materials);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get study materials (students/parents see only their class/batch + unscoped items)
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'student' || req.user.role === 'parent') {
      const student = await getOwnStudent(req.user);
      query = classScopeFilter(student);
    }
    const materials = await StudyMaterial.find(query).populate('subjectId').sort({ createdAt: -1 });
    res.json(materials);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete material (owner teacher | admin)
router.delete('/:id', auth, roleAuth('teacher', 'admin'), async (req, res) => {
  try {
    if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
    const material = await StudyMaterial.findById(req.params.id);
    if (!material) return res.status(404).json({ message: 'Material not found' });
    if (!isOwnerOrAdmin(req.user, material, 'uploadedBy')) return res.status(403).json({ message: 'Access denied' });

    await StudyMaterial.deleteOne({ _id: material._id });
    removeUpload(material.fileUrl);
    res.json({ message: 'Material deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
