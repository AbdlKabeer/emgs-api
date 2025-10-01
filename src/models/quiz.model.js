const mongoose = require('mongoose');

// Quiz Schema
const quizSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    moduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Module', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    useTimer: { type: Boolean, default: false },
    timeLimit: { type: Number, default: 0 }, // in minutes
    passingScore: { type: Number, default: 70 }, // percentage
    // Instead of embedding questions, reference them
    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }]
  },
  { timestamps: true }
);

const Quiz = mongoose.model('Quiz', quizSchema);

module.exports = Quiz;
