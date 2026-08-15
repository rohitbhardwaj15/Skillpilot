import { Router } from 'express';
import Course from '../models/Course.js';

const router = Router();

// GET /api/courses — list all courses (optionally filter by ?skill=)
router.get('/', async (req, res) => {
  try {
    const filter = req.query.skill ? { skills: req.query.skill } : {};
    const courses = await Course.find(filter);
    res.json(courses);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
