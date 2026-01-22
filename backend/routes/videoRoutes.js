const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Video = require('../models/Video');
const VideoProgress = require('../models/VideoProgress');

// Get all videos with student progress
router.get('/student/:studentId', auth, async (req, res) => {
    try {
        const videos = await Video.find()
            .populate('subjectId', 'name')
            .populate('teacherId', 'name')
            .sort({ createdAt: -1 });

        const progress = await VideoProgress.find({ studentId: req.params.studentId });

        const videosWithProgress = videos.map(v => {
            const vp = progress.find(p => p.videoId.toString() === v._id.toString());
            return {
                ...v._doc,
                progress: vp || { watchedDuration: 0, completed: false }
            };
        });

        res.json(videosWithProgress);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Update video progress
router.post('/progress', auth, async (req, res) => {
    try {
        const { studentId, videoId, watchedDuration, completed } = req.body;

        let progress = await VideoProgress.findOne({ studentId, videoId });

        if (progress) {
            progress.watchedDuration = watchedDuration;
            progress.completed = completed || progress.completed;
            progress.lastWatchedAt = Date.now();
            await progress.save();
        } else {
            progress = new VideoProgress({
                studentId,
                videoId,
                watchedDuration,
                completed
            });
            await progress.save();
        }

        res.json(progress);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Add a video (Teacher)
router.post('/', auth, async (req, res) => {
    try {
        const videoData = {
            ...req.body,
            teacherId: req.user.id
        };
        const video = new Video(videoData);
        await video.save();
        res.json(video);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all videos for a teacher
router.get('/teacher/:userId', auth, async (req, res) => {
    try {
        const videos = await Video.find({ teacherId: req.params.userId })
            .populate('subjectId', 'name')
            .populate('classId', 'name')
            .sort({ createdAt: -1 });
        res.json(videos);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
