const mongoose = require('mongoose');

// Quiz Schema
const quizSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    moduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Module', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // Instead of embedding questions, reference them
    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }]
  },
  { timestamps: true }
);

const Quiz = mongoose.model('Quiz', quizSchema);

module.exports = Quiz;
