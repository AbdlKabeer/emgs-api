// Quiz Schema (updated)
const mongoose = require('mongoose');

// Question Schema
const questionSchema = new mongoose.Schema(
  {
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    question: { type: String, required: true },
    questionType: { 
      type: String, 
      required: true,
      enum: ['multipleChoice', 'singleChoice', 'boolean', 'fillInBlank'] 
    },
    options: [
      {
        option: { type: String, required: true },
        isCorrect: { type: Boolean, required: true },
      }
    ],
    // For fillInBlank type questions
    correctAnswer: { type: String },
    // For boolean type questions
    booleanAnswer: { type: Boolean },
    // Position in the quiz
    order: { type: Number, required: true }
  },
  { timestamps: true }
);

const Question = mongoose.model('Question', questionSchema);

module.exports = Question;