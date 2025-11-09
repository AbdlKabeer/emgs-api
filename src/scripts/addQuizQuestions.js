/**
 * Add questions to an existing quiz
 * Run this script with: node scripts/addQuizQuestions.js
 */

const mongoose = require('mongoose');

const Quiz = require('../models/quiz.model');
const Question = require('../models/question.model');

// 🟩 Replace with your own MongoDB connection string
const MONGO_URI = 'mongodb+srv://programmerolakay:karantashi1@cluster0.gga6a.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

const quizId = '6907852cb328bbafd92453dd';

const questionsData = [
  {
    question: "According to the passage, which is the main reason for urban migration?",
    questionType: "singleChoice",
    options: [
      { option: "Better education", isCorrect: false },
      { option: "Employment opportunities", isCorrect: true },
      { option: "Healthcare facilities", isCorrect: false },
      { option: "Cultural attractions", isCorrect: false }
    ]
  },
  {
    question: "Select all the factors that contribute to climate change mentioned in the passage.",
    questionType: "multipleChoice",
    options: [
      { option: "Deforestation", isCorrect: true },
      { option: "Fossil fuel consumption", isCorrect: true },
      { option: "Urban planning", isCorrect: false },
      { option: "Industrial emissions", isCorrect: true }
    ]
  },
  {
    question: "In the IELTS listening test, you have time to read through the questions before you listen.",
    questionType: "boolean",
    booleanAnswer: true,
    options: [
      { option: 'True', isCorrect: true },
      { option: 'False', isCorrect: false }
    ]
  },
  {
    question: "The IELTS writing test consists of _______ tasks.",
    questionType: "fillInBlank",
    correctAnswer: "two",
    options: []
  },
  {
    question: "It is advisable to write more than the minimum word count in IELTS writing tasks.",
    questionType: "boolean",
    booleanAnswer: true,
    options: [
      { option: 'True', isCorrect: true },
      { option: 'False', isCorrect: false }
    ]
  }
];

(async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      throw new Error('Quiz not found');
    }

    // Create question documents
    const createdQuestions = [];
    for (let i = 0; i < questionsData.length; i++) {
      const qData = questionsData[i];

      const question = new Question({
        quizId: quiz._id,
        question: qData.question,
        questionType: qData.questionType,
        options: qData.options || [],
        correctAnswer: qData.correctAnswer,
        booleanAnswer: qData.booleanAnswer,
        order: i + 1
      });

      const saved = await question.save();
      createdQuestions.push(saved._id);
      console.log(`✅ Added question ${i + 1}: ${qData.question}`);
    }

    // Update the quiz to include these questions
    quiz.questions = [...(quiz.questions || []), ...createdQuestions];
    await quiz.save();

    console.log('✅ Quiz updated with new question references.');
    console.log('✅ Done!');
    process.exit(0);

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
