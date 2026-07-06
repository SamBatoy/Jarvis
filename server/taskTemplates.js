// Fixed ordered subtask skeletons for the well-defined academic task_types.
// {topic} is interpolated with whatever the model extracted from the
// request (e.g. "photosynthesis", "the Chemistry midterm"). Dates are always
// assigned separately by scheduler.js — these templates only decide content.
export const TASK_TEMPLATES = {
  study: (topic) => [
    `Review ${topic} — session 1`,
    `Review ${topic} — session 2`,
    'Practice problems',
    'Final review',
  ],
  presentation: (topic) => [`Research ${topic}`, 'Write outline', 'Build slides', 'Add visuals', 'Rehearse'],
  'problem-set': (topic) => [`Read material for ${topic}`, 'Attempt all problems', 'Review mistakes and finalize'],
  'exam-prep': (topic) => [
    `Review ${topic} — part 1`,
    `Review ${topic} — part 2`,
    'Practice problems',
    'Take a practice exam',
    'Final review',
  ],
  reading: (topic) => [`Read ${topic}`, 'Summarize key points'],
}
