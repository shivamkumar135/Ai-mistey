import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';
import { MysteryCase } from './model.js';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

const app = express();
const clientOrigin = (process.env.CLIENT_URL || 'http://localhost:5173').trim().replace(/\/+$/, '');
app.use(cors({ origin: clientOrigin }));
app.use(express.json());
const sizes = { easy: { suspects: 3, clues: 5, hints: 2 }, medium: { suspects: 4, clues: 7, hints: 3 }, hard: { suspects: 5, clues: 9, hints: 3 } };
const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const outputSchema = z.object({ title: z.string().min(1), story: z.string().min(1), suspects: z.array(z.object({ id: z.string(), name: z.string().min(1), role: z.string().min(1), description: z.string().min(1), isCulprit: z.boolean() })), clues: z.array(z.object({ id: z.string(), text: z.string().min(1), relatedSuspectIds: z.array(z.string()) })), hints: z.array(z.object({ id: z.string(), text: z.string().min(1) })), explanation: z.string().min(1) });
const generationJsonSchema = {
  type: 'object',
  properties: {
    title: { type: 'string' }, story: { type: 'string' },
    suspects: { type: 'array', items: { type: 'object', properties: {
      id: { type: 'string' }, name: { type: 'string' }, role: { type: 'string' }, description: { type: 'string' }, isCulprit: { type: 'boolean' }
    }, required: ['id', 'name', 'role', 'description', 'isCulprit'] } },
    clues: { type: 'array', items: { type: 'object', properties: {
      id: { type: 'string' }, text: { type: 'string' }, relatedSuspectIds: { type: 'array', items: { type: 'string' } }
    }, required: ['id', 'text', 'relatedSuspectIds'] } },
    hints: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, text: { type: 'string' } }, required: ['id', 'text'] } },
    explanation: { type: 'string' }
  },
  required: ['title', 'story', 'suspects', 'clues', 'hints', 'explanation']
};
const error = (res, status, code, message) => res.status(status).json({ error: { code, message } });
function serialize(c) {
  return { id: c.id, title: c.title, difficulty: c.difficulty, story: c.story,
    suspects: c.suspects.map(({ id, name, role, description }) => ({ id, name, role, description })),
    clues: c.clues.map(({ id, text }) => ({ id, text: c.progress.discoveredClueIds.includes(id) ? text : null, discovered: c.progress.discoveredClueIds.includes(id) })),
    hints: c.hints.map(({ id, text }, i) => ({ id, text: i < c.progress.hintsUsed ? text : null, used: i < c.progress.hintsUsed })), status: c.status, score: c.status === 'completed' ? c.finalScore : c.progress.score };
}
async function generate(premise, difficulty) {
  if (!process.env.GEMINI_API_KEY) throw new Error('Gemini is not configured');
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }); const n = sizes[difficulty];
  const response = await ai.interactions.create({
    model,
    input: `Create an original, fair-play mystery based on this premise: ${premise}\nPreserve every named role, character, event, time detail, evidence type, and question in the premise. Do not silently omit or replace any specified suspect. Difficulty: ${difficulty}. Return exactly ${n.suspects} suspects, ${n.clues} clues, and ${n.hints} hints. Exactly one culprit; at least 3 logically consistent clues must reference the culprit. Clues must not name the culprit. Hints progress from vague to specific without naming culprit. Explain both how the clues identify the culprit and why they leaked the paper. Use IDs s1... and c1...; relatedSuspectIds must be valid.`,
    response_format: { type: 'text', mime_type: 'application/json', schema: generationJsonSchema }
  });
  if (!response.output_text) throw new Error('Gemini returned an empty response');
  return response.output_text;
}
function validate(raw, difficulty) {
  const d = outputSchema.parse(JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, ''))), n = sizes[difficulty];
  if (d.suspects.length !== n.suspects || d.clues.length !== n.clues || d.hints.length !== n.hints) throw Error('Incorrect item counts');
  const culprits = d.suspects.filter(s => s.isCulprit); if (culprits.length !== 1) throw Error('Expected exactly one culprit');
  const ids = new Set(d.suspects.map(s => s.id)), culprit = culprits[0];
  if (d.clues.some(c => c.relatedSuspectIds.some(id => !ids.has(id))) || d.clues.filter(c => c.relatedSuspectIds.includes(culprit.id)).length < 3) throw Error('Invalid clue references');
  if (d.clues.some(c => c.text.toLowerCase().includes(culprit.name.toLowerCase()))) throw Error('Clue reveals culprit');
  return d;
}
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.post('/api/cases', async (req, res) => {
  const parsed = z.object({ premise: z.string().trim().min(10).max(300), difficulty: z.enum(['easy','medium','hard']) }).safeParse(req.body);
  if (!parsed.success) return error(res, 400, 'INVALID_INPUT', 'Enter a premise between 10 and 300 characters and choose a difficulty.');
  try {
    let data, last;
    for (let attempt = 0; attempt < 3; attempt++) {
      let raw;
      try { raw = await generate(parsed.data.premise, parsed.data.difficulty); }
      catch (e) {
        console.error('Gemini request failed:', e.message);
        return error(res, 502, 'AI_GENERATION_FAILED', 'The detective could not reach Gemini. Check the API key, model access, and quota, then try again.');
      }
      try { data = validate(raw, parsed.data.difficulty); break; }
      catch (e) { last = e; }
    }
    if (!data) { console.error('Mystery generation failed:', last?.message); return error(res, 502, 'AI_GENERATION_FAILED', 'The detective could not build this case. Try again.'); }
    const c = await MysteryCase.create({ ...data, ...parsed.data }); return res.status(201).json(serialize(c));
  } catch (e) { console.error(e.message); return error(res, 500, 'SERVER_ERROR', 'Something went wrong. Please try again.'); }
});
app.get('/api/cases/:id', async (req, res) => { try { const c = await MysteryCase.findById(req.params.id); return c ? res.json(serialize(c)) : error(res,404,'NOT_FOUND','This case does not exist.'); } catch { return error(res,404,'NOT_FOUND','This case does not exist.'); } });
app.post('/api/cases/:id/clues/:clueId/discover', async (req,res) => { const c=await MysteryCase.findById(req.params.id); if(!c)return error(res,404,'NOT_FOUND','Case not found.'); if(c.status!=='active')return error(res,409,'CASE_CLOSED','This case is closed.'); const clue=c.clues.find(x=>x.id===req.params.clueId); if(!clue)return error(res,404,'NOT_FOUND','Clue not found.'); if(!c.progress.discoveredClueIds.includes(clue.id)){c.progress.discoveredClueIds.push(clue.id);c.progress.score+=5;await c.save();} return res.json({clue:{id:clue.id,text:clue.text,discovered:true},score:c.progress.score,cluesFound:c.progress.discoveredClueIds.length}); });
app.post('/api/cases/:id/hints', async (req,res)=>{const c=await MysteryCase.findById(req.params.id);if(!c)return error(res,404,'NOT_FOUND','Case not found.');if(c.status!=='active')return error(res,409,'CASE_CLOSED','This case is closed.');if(c.progress.hintsUsed>=c.hints.length)return error(res,409,'NO_HINTS_LEFT','No hints left.');const hint=c.hints[c.progress.hintsUsed++];c.progress.score=Math.max(0,c.progress.score-10);await c.save();return res.json({hint:{id:hint.id,text:hint.text},score:c.progress.score,hintsUsed:c.progress.hintsUsed});});
app.post('/api/cases/:id/accuse',async(req,res)=>{const p=z.object({suspectId:z.string().min(1)}).safeParse(req.body);if(!p.success)return error(res,400,'INVALID_INPUT','Choose a suspect.');const c=await MysteryCase.findById(req.params.id);if(!c)return error(res,404,'NOT_FOUND','Case not found.');if(c.status!=='active')return error(res,409,'CASE_CLOSED','This case is already closed.');const suspect=c.suspects.find(s=>s.id===p.data.suspectId);if(!suspect)return error(res,404,'NOT_FOUND','Suspect not found.');const correct=suspect.isCulprit, accusationPoints=correct?{easy:100,medium:150,hard:200}[c.difficulty]:0,cluesFound=c.progress.discoveredClueIds.length,hintsUsed=c.progress.hintsUsed;c.accusation={suspectId:suspect.id,correct,submittedAt:new Date()};c.finalScore=Math.max(0,accusationPoints+cluesFound*5-hintsUsed*10);c.status='completed';await c.save();return res.json({status:'completed',redirectTo:`/case/${c.id}/result`});});
app.get('/api/cases/:id/result',async(req,res)=>{const c=await MysteryCase.findById(req.params.id);if(!c)return error(res,404,'NOT_FOUND','Case not found.');if(c.status!=='completed')return error(res,409,'CASE_ACTIVE','This case is still active.');const culprit=c.suspects.find(s=>s.isCulprit), cluesFound=c.progress.discoveredClueIds.length,hintsUsed=c.progress.hintsUsed,accusationPoints=c.accusation.correct?{easy:100,medium:150,hard:200}[c.difficulty]:0;return res.json({id:c.id,title:c.title,verdict:c.accusation.correct?'correct':'incorrect',selectedSuspectId:c.accusation.suspectId,culprit:{id:culprit.id,name:culprit.name,role:culprit.role},explanation:c.explanation,score:c.finalScore,breakdown:{accusationPoints,cluesFound,cluePoints:cluesFound*5,hintsUsed,hintPenalty:hintsUsed*10}});});
app.use((err,_req,res,_next)=>{console.error(err);error(res,500,'SERVER_ERROR','Something went wrong. Please try again.');});
if (!process.env.MONGODB_URI) {
  console.error('Missing MONGODB_URI. Create server/.env from server/.env.example and add your MongoDB connection string.');
  process.exit(1);
}
mongoose.connect(process.env.MONGODB_URI).then(()=>app.listen(process.env.PORT||5000,()=>console.log(`API listening on ${process.env.PORT||5000}`))).catch(e=>{console.error('MongoDB connection failed:',e.message);process.exit(1);});
