const mongoose = require('mongoose');

const quizAttemptSchema = new mongoose.Schema({
	userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
	quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
	answers: { type: mongoose.Schema.Types.Mixed, required: true },
	score: { type: Number, required: true },
	passed: { type: Boolean, required: true },
	completedAt: { type: Date, default: Date.now },
	results: { type: Array, default: [] }
}, { timestamps: true });

const QuizAttempt = mongoose.model('QuizAttempt', quizAttemptSchema);
module.exports = QuizAttempt;
