const mongoose = require('mongoose');

// const quizProgressSchema = new mongoose.Schema(
//   {
//     userId: { 
//       type: mongoose.Schema.Types.ObjectId, 
//       ref: 'User', 
//       required: true 
//     },
//     quizId: { 
//       type: mongoose.Schema.Types.ObjectId, 
//       ref: 'Quiz', 
//       required: true 
//     },
//     score: { 
//       type: Number, 
//       default: 0 
//     },
//     totalQuestions: { 
//       type: Number, 
//       required: true 
//     },
//     correctAnswers: { 

//       type: Number, 
//       default: 0 
//     },
//     completed: { 
//       type: Boolean, 
//       default: false 
//     },
//     answers: [
//       {
//         questionIndex: { type: Number, required: true },
//         selectedOptionIndex: { type: Number, required: true },
//         isCorrect: { type: Boolean, required: true }
//       }
//     ],
//     attempts: { 
//       type: Number, 
//       default: 1 
//     },
//     lastAttemptDate: { 
//       type: Date, 
//       default: Date.now 
//     }
//   },
//   { timestamps: true }
// );

// // Compound index to ensure one progress record per user per quiz
// quizProgressSchema.index({ userId: 1, quizId: 1 }, { unique: true });

// const QuizProgress = mongoose.model('QuizProgress', quizProgressSchema);

// Quiz Progress Schema

const quizProgressSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
    score: { type: Number, required: true },
    correctAnswers: { type: Number, required: true },
    totalQuestions: { type: Number, required: true },
    completed: { type: Boolean, default: false },
    answers: [
      {
        questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
        questionIndex: { type: Number, required: true },
        questionType: { type: String, required: true },
        isCorrect: { type: Boolean, required: true },
        // Different fields based on question type
        selectedOptionIndex: { type: Number },
        selectedOptionIndices: [{ type: Number }],
        correctOptionIndices: [{ type: Number }],
        selectedAnswer: { type: Boolean },
        submittedAnswer: { type: String },
        correctAnswer: { type: String }
      }
    ],
    attempts: { type: Number, default: 1 },
    lastAttemptDate: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

const QuizProgress = mongoose.model('QuizProgress', quizProgressSchema);

module.exports = QuizProgress;