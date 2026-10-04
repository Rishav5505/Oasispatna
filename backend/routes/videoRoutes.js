const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth');
const Video = require('../models/Video');
const VideoProgress = require('../models/VideoProgress');
const Student = require('../models/Student');
const {
    getAccessibleStudent,
    resolveStudent,
    classScopeFilter,
    isOwnerOrAdmin,
    isObjectId,
} = require('../utils/access');

const EDITABLE_FIELDS = ['title', 'description', 'videoUrl', 'thumbnailUrl', 'subjectId', 'classId', 'duration'];
const pick = (obj, keys) => keys.reduce((acc, k) => { if (obj[k] !== undefined) acc[k] = obj[k]; return acc; }, {});

// Extract the 11-char YouTube video id from common URL forms
const getYoutubeId = (url) => {
    if (!url || typeof url !== 'string') return null;
    try {
        const u = new URL(url.trim());
        const host = u.hostname.replace(/^www\.|^m\./, '');
        let id = null;
        if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
        else if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
            if (u.searchParams.get('v')) id = u.searchParams.get('v');
            else {
                const m = u.pathname.match(/^\/(embed|shorts|live|v)\/([^/?#]+)/);
                if (m) id = m[2];
            }
        }
        return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    } catch (e) {
        return null;
    }
};

const validDuration = (d) => d === undefined || d === null || d === '' || /^\d{1,3}:[0-5]\d(:[0-5]\d)?$/.test(String(d));

// Get class-scoped videos with student progress
router.get('/student/:studentId', auth, async (req, res) => {
    try {
        const student = await getAccessibleStudent(req, res, req.params.studentId);
        if (!student) return;

        const videos = await Video.find(classScopeFilter(student, { batch: false }))
            .populate('subjectId', 'name')
            .populate('teacherId', 'name')
            .sort({ createdAt: -1 });

        const progress = await VideoProgress.find({ studentId: student._id });

        const videosWithProgress = videos.map(v => {
            const vp = progress.find(p => p.videoId.toString() === v._id.toString());
            return {
                ...v.toObject(),
                youtubeId: getYoutubeId(v.videoUrl),
                progress: vp || { watchedDuration: 0, completed: false }
            };
        });

        res.json(videosWithProgress);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Update video progress (student derives identity from token)
router.post('/progress', auth, async (req, res) => {
    try {
        const { videoId, watchedDuration, completed } = req.body;

        let student;
        if (req.user.role === 'student') {
            student = await Student.findOne({ userId: req.user.id });
        } else if (req.user.role === 'admin' || req.user.role === 'teacher') {
            student = await resolveStudent(req.body.studentId);
        } else {
            return res.status(403).json({ message: 'Access denied' });
        }
        if (!student) return res.status(404).json({ message: 'Student not found' });

        if (!isObjectId(String(videoId))) return res.status(400).json({ message: 'Invalid video id' });
        const video = await Video.findById(videoId).select('_id');
        if (!video) return res.status(404).json({ message: 'Video not found' });

        const watched = Math.max(0, Number(watchedDuration) || 0);

        let progress = await VideoProgress.findOne({ studentId: student._id, videoId });

        if (progress) {
            progress.watchedDuration = watched;
            progress.completed = !!completed || progress.completed;
            progress.lastWatchedAt = Date.now();
            await progress.save();
        } else {
            progress = new VideoProgress({
                studentId: student._id,
                videoId,
                watchedDuration: watched,
                completed: !!completed
            });
            await progress.save();
            await Video.updateOne({ _id: videoId }, { $inc: { views: 1 } });
        }

        res.json(progress);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Add a video (Teacher/Admin)
router.post('/', auth, roleAuth('teacher', 'admin'), async (req, res) => {
    try {
        const data = pick(req.body, EDITABLE_FIELDS);
        if (!validDuration(data.duration)) return res.status(400).json({ message: "Duration must be in 'mm:ss' format" });
        data.teacherId = req.user.id;
        const video = new Video(data);
        await video.save();
        res.json(video);
    } catch (err) {
        if (err.name === 'ValidationError' || err.name === 'CastError') return res.status(400).json({ message: err.message });
        res.status(500).json({ message: 'Server error' });
    }
});

// Update a video (owner teacher | admin)
router.put('/:id', auth, roleAuth('teacher', 'admin'), async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid video id' });
        const video = await Video.findById(req.params.id);
        if (!video) return res.status(404).json({ message: 'Video not found' });
        if (!isOwnerOrAdmin(req.user, video)) return res.status(403).json({ message: 'Access denied' });

        const data = pick(req.body, EDITABLE_FIELDS);
        if (!validDuration(data.duration)) return res.status(400).json({ message: "Duration must be in 'mm:ss' format" });
        video.set(data);
        await video.save();
        res.json(video);
    } catch (err) {
        if (err.name === 'ValidationError' || err.name === 'CastError') return res.status(400).json({ message: err.message });
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete a video (owner teacher | admin)
router.delete('/:id', auth, roleAuth('teacher', 'admin'), async (req, res) => {
    try {
        if (!isObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid video id' });
        const video = await Video.findById(req.params.id);
        if (!video) return res.status(404).json({ message: 'Video not found' });
        if (!isOwnerOrAdmin(req.user, video)) return res.status(403).json({ message: 'Access denied' });

        await VideoProgress.deleteMany({ videoId: video._id });
        await Video.deleteOne({ _id: video._id });
        res.json({ message: 'Video deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all videos for a teacher (self or admin)
router.get('/teacher/:userId', auth, roleAuth('teacher', 'admin'), async (req, res) => {
    try {
        if (req.user.role === 'teacher' && String(req.user.id) !== String(req.params.userId)) {
            return res.status(403).json({ message: 'Access denied' });
        }
        const videos = await Video.find({ teacherId: req.params.userId })
            .populate('subjectId', 'name')
            .populate('classId', 'name')
            .sort({ createdAt: -1 });
        res.json(videos.map(v => ({ ...v.toObject(), youtubeId: getYoutubeId(v.videoUrl) })));
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
