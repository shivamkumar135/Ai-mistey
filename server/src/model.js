import mongoose from 'mongoose';

const CaseSchema = new mongoose.Schema({
  title: { type: String, required: true }, premise: { type: String, required: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
  story: { type: String, required: true },
  suspects: [{ id: String, name: String, role: String, description: String, isCulprit: Boolean }],
  clues: [{ id: String, text: String, relatedSuspectIds: [String] }],
  hints: [{ id: String, text: String }], explanation: { type: String, required: true },
  status: { type: String, enum: ['active', 'completed'], default: 'active' },
  progress: { discoveredClueIds: { type: [String], default: [] }, hintsUsed: { type: Number, default: 0 }, score: { type: Number, default: 0 } },
  accusation: { suspectId: String, correct: Boolean, submittedAt: Date }, finalScore: Number
}, { timestamps: true });

export const MysteryCase = mongoose.model('MysteryCase', CaseSchema);
