. Project Overview
1.1 Problem Statement
Players want a short, fun mystery-solving experience where every story is new. Writing a mystery by hand takes time, and most games do not adapt to what the player chooses. AI Mystery Room uses Gemini to generate a mystery from a player's premise, then lets the player investigate suspects, collect clues, request hints, and make one final accusation.
1.2 Goal
Build and deploy a working web app that:
Generates a structured mystery with Gemini.
Keeps the culprit and solution hidden on the server until the player accuses someone.
Calculates scores on the backend.
Runs on a live website that anyone can open.
1.3 Target Users
Students and casual players who enjoy mystery games.
Evaluators who will open the live site and play one full mystery.
1.4 Expected User Experience
The app is simple and easy to understand on first visit.
Generating a mystery takes a few seconds and shows a clear loading state.
The player can always see what they have discovered, what hints they used, and their current score.
Errors are shown in plain language with a retry option.
2. Core Features
2.1 Required Features
Create a mystery: user enters a premise and selects a difficulty (Easy, Medium, Hard).
AI generation: Gemini generates the title, story, suspects, clues, hints, culprit, and explanation in a fixed JSON format.
Validation: the backend checks every AI response before saving it. Invalid responses are retried or rejected.
Investigation: user reads the story, views suspect cards, and discovers clues.
Hints: user can request a hint. Each hint costs points.
Accusation: user selects one suspect and submits. This ends the case.
Results: show verdict (correct or wrong), score, culprit, and explanation.
Start another mystery: user can return to the Create page at any time.
2.2 Optional Enhancements (only after all required features work)
Show a progress bar (clues found out of total).
Save the active case ID in the browser so a refresh does not lose the game.
Simple animations for clue discovery.
Share result text (copy to clipboard).
2.3 Out of Scope
User accounts and login.
Multiplayer.
Leaderboards.
Image generation for suspects or clues.
3. Technology Stack
Layer
Technology
Frontend
React, Vite, Tailwind CSS, React Router, Axios
Backend
Node.js, Express
Database
MongoDB Atlas with Mongoose
AI
Gemini API via @google/genai
Validation
Zod (request and AI output validation)
Hosting
Backend on a Node-friendly host (e.g., Render or Railway); frontend on Vercel; database on MongoDB Atlas
4. Project Setup
4.1 Folder Structure
ai-mystery-room/
  client/          # React + Vite frontend
  server/          # Express backend
  SPEC.md
  README.md
4.2 Frontend Setup
npm create vite@latest client -- --template react
cd client
npm install
npm install react-router-dom axios
4.3 Backend Setup
mkdir server
cd server
npm init -y
npm install express cors dotenv mongoose @google/genai zod
npm install --save-dev nodemon
4.4 Environment Variables (server/.env)
PORT=5000
MONGODB_URI=your_mongodb_connection_string
GEMINI_API_KEY=your_gemini_api_key
CLIENT_URL=http://localhost:5173
4.5 Secret Rules
API keys are never placed in frontend code.
.env is listed in .gitignore and is never committed.
Production values are set in the hosting dashboards (Render or Railway, and Vercel).
5. User Flow
User opens the website and sees the Home page.
User clicks "Start a Mystery".
User enters a premise (for example: "A jewelry heist during a New Year party in a mansion") and selects a difficulty.
User clicks "Generate". The app shows a loading state while Gemini works.
The Investigation Room opens with the title, story, suspect cards, and an empty clue list.
User clicks suspects to read their profiles and clicks "Discover" on clues to reveal them.
User may click "Request Hint" to get a hint (costs 10 points each).
User clicks "Make an Accusation" and goes to the Accusation page.
User selects one suspect and submits. The case is now closed.
The Results page shows:
Verdict (Correct or Incorrect)
Final score
Actual culprit
Explanation of how the clues lead to the culprit
User clicks "Start Another Mystery" to return to the Create page.
6. Page Specifications
6.1 Home (/)
Purpose: introduce the project.
Elements: title, one-paragraph description, "Start a Mystery" button, short "How to play" list (3 to 4 steps).
States: none beyond static content.
Navigation: button goes to /create.
6.2 Create Mystery (/create)
Purpose: collect the premise and difficulty.
Elements:
Text area for premise (min 10 characters, max 300 characters).
Difficulty selector: Easy, Medium, Hard (with a short description of each: suspect and clue counts).
"Generate Mystery" button.
Validation: premise required, length limits checked on client and server.
Loading state: button disabled, spinner plus text "The detective is writing your case...".
Error state: inline message, e.g. "We could not generate your mystery. Please try again." with a Retry button.
On success: navigate to /case/:id.
6.3 Investigation Room (/case/:id)
Purpose: main gameplay screen.
Elements:
Header: case title, difficulty, score, clues found (e.g. 2 / 5), hints used (e.g. 1 / 2).
Story panel with the case story.
Suspect cards: name, role, short description. No guilt hints shown on the card.
Clue list: locked clues show "Undiscovered"; discovered clues show their text.
Hint panel: "Request Hint" button, shows hints in order. Disabled when all hints are used.
"Make an Accusation" button, always visible.
Loading state: skeleton cards while the case loads.
Error state: if the case is not found, show "This case does not exist" and a link back to Home.
Responsive: on mobile, the story and clue list stack vertically; suspect cards become a horizontal scroll row.
6.4 Accusation (/case/:id/accuse)
Purpose: let the player pick one suspect and submit.
Elements: list of suspect cards with radio selection, "Submit Accusation" button, "Back to Investigation" link.
Rules: submit is disabled until one suspect is selected. A confirmation dialog appears: "This will close the case. Are you sure?"
Loading state: button shows spinner while submitting.
Error state: "Your accusation could not be sent. Please try again."
On success: navigate to /case/:id/result.
If the case is already closed: redirect to the Results page.
6.5 Results (/case/:id/result)
Purpose: show the outcome.
Elements:
Verdict banner: "Correct!" or "Incorrect".
Final score with a breakdown (accusation points, clues found x 5, hints used x -10, minimum 0).
Culprit name and role.
Explanation text.
Buttons: "Start Another Mystery" (goes to /create) and "Back to Home".
Loading state: spinner while the result loads.
Error state: if the case is still active, redirect to /case/:id. If not found, show an error.
6.6 Global Requirements
Navigation bar with logo (links to Home) and a "New Mystery" link.
All pages work on mobile (360px width and up) and desktop.
Consistent error component used across pages.
7. Backend and API Specification
7.1 General Rules
Base URL: /api
Content type: application/json
All responses use this error format:
{ "error": { "code": "STRING_CODE", "message": "Human-readable message" } }
Input is validated with Zod. Invalid input returns 400.
Unknown IDs return 404.
Actions on a closed case return 409.
Unexpected server errors return 500 with a generic message (no stack trace).
7.2 Endpoints
POST /api/cases: Generate a mystery
Request body
{
  "premise": "A jewelry heist during a New Year party in a mansion",
  "difficulty": "easy"
}
premise: string, 10 to 300 characters, required.
difficulty: one of easy, medium, hard, required.
Response: 201
{
  "id": "64f1c0...",
  "title": "The Midnight Emerald",
  "difficulty": "easy",
  "story": "...",
  "suspects": [
    { "id": "s1", "name": "Vivian Cole", "role": "Hostess", "description": "..." }
  ],
  "clues": [
    { "id": "c1", "text": "...", "discovered": false }
  ],
  "hints": [
    { "id": "h1", "text": "...", "used": false }
  ],
  "status": "active",
  "score": 0
}
Clues show only id, text (after discovery), and discovered. The clue text is returned only when discovered is true. Undiscovered clue text is returned as null.
Suspect isCulprit is never returned.
Hint text is returned only when used is true.
Errors: 400 invalid input; 502 Gemini failed or produced invalid output after retries.
GET /api/cases/:id: Retrieve an active mystery
Response: 200: same shape as the creation response, with current progress and score.
Errors: 404 not found. If the case is completed, return the same shape with status: "completed" and no culprit (the client should use the result endpoint).
POST /api/cases/:id/clues/:clueId/discover: Discover a clue
Request body: none.
Behavior:
If the case is active and the clue is not yet discovered, mark it discovered and add 5 points.
If already discovered, return the current state with no extra points (idempotent).
If the case is completed, return 409.
Response: 200
{
  "clue": { "id": "c1", "text": "...", "discovered": true },
  "score": 5,
  "cluesFound": 1
}
Errors: 404 case or clue not found; 409 case closed.
POST /api/cases/:id/hints: Request a hint
Request body: none.
Behavior:
Uses the next unused hint in order.
Subtracts 10 points. Score never drops below 0.
If no hints remain, return 409 with code NO_HINTS_LEFT.
Response: 200
{
  "hint": { "id": "h1", "text": "..." },
  "score": 0,
  "hintsUsed": 1
}
Errors: 404 case not found; 409 case closed or no hints left.
POST /api/cases/:id/accuse: Submit an accusation
Request body
{ "suspectId": "s2" }
Behavior:
Only one accusation is allowed per case. The case status changes to completed.
Backend checks the suspect against the stored culprit.
Backend calculates the final score (see Section 9).
Culprit and explanation are stored in the response of the result endpoint, not returned here.
Response: 200
{ "status": "completed", "redirectTo": "/case/64f1c0.../result" }
Errors: 400 missing or invalid suspectId; 404 case or suspect not found; 409 case already completed.
GET /api/cases/:id/result: Retrieve the completed result
Behavior: only works when the case is completed.
Response: 200
{
  "id": "64f1c0...",
  "title": "The Midnight Emerald",
  "verdict": "correct",
  "selectedSuspectId": "s2",
  "culprit": { "id": "s2", "name": "Victor Hale", "role": "Butler" },
  "explanation": "...",
  "score": 165,
  "breakdown": {
    "accusationPoints": 150,
    "cluesFound": 3,
    "cluePoints": 15,
    "hintsUsed": 0,
    "hintPenalty": 0
  }
}
Errors: 404 not found; 409 case still active (client should redirect to the investigation page).
8. Data Model (Mongoose)
8.1 Case Collection
Case {
  title:        String (required)
  premise:      String (required)
  difficulty:   String enum ["easy", "medium", "hard"] (required)
  story:        String (required)
  suspects: [{
    id:          String (required)     // e.g. "s1"
    name:        String (required)
    role:        String (required)
    description: String (required)
    isCulprit:   Boolean (required)    // NEVER sent to client before completion
  }]
  clues: [{
    id:          String (required)     // e.g. "c1"
    text:        String (required)
    relatedSuspectIds: [String]
  }]
  hints: [{
    id:    String (required)           // e.g. "h1"
    text:  String (required)
  }]
  explanation:  String (required)      // NEVER sent to client before completion
  status:       String enum ["active", "completed"], default "active"
  progress: {
    discoveredClueIds: [String]
    hintsUsed:         Number, default 0
    score:             Number, default 0
  }
  accusation: {
    suspectId:   String
    correct:     Boolean
    submittedAt: Date
  }
  finalScore:   Number
  createdAt:    Date (default now)
  updatedAt:    Date
}
8.2 Security Rules
Responses are built with explicit field selection. Never send the whole document to the client.
isCulprit and explanation are stripped from all responses until status is completed.
Hint and clue texts are gated by progress (see endpoints above).
9. AI Behavior and Scoring
9.1 Difficulty Settings
Difficulty
Suspects
Clues
Hints
Easy
3
5
2
Medium
4
7
3
Hard
5
9
3
9.2 Gemini Integration
Model: a Gemini Flash model (set in one config constant so it can be changed).
Request uses JSON output mode with a response schema.
Prompt includes: premise, difficulty, exact suspect/clue/hint counts, and rules:
Exactly one culprit.
The culprit must be supported by at least 3 clues that are logically consistent.
Clues must not name the culprit directly.
Hints move from vague to specific but never state the culprit's name outright until the last hint.
The explanation must walk through the clues step by step.
Return JSON only, no markdown.
9.3 Expected Gemini Output Format
{
  "title": "string",
  "story": "string",
  "suspects": [
    { "id": "s1", "name": "string", "role": "string", "description": "string", "isCulprit": false }
  ],
  "clues": [
    { "id": "c1", "text": "string", "relatedSuspectIds": ["s1"] }
  ],
  "hints": [
    { "id": "h1", "text": "string" }
  ],
  "explanation": "string"
}
9.4 Validation (Required Before Saving)
Every AI response must pass all of these checks:
JSON parses successfully (strip code fences if present).
Zod schema matches the output format.
Suspect count, clue count, and hint count match the difficulty table.
Exactly one suspect has isCulprit: true.
All relatedSuspectIds refer to existing suspect IDs.
At least 3 clues reference the culprit's ID.
No empty strings in title, story, suspect fields, clue text, hint text, or explanation.
Clue text does not contain the culprit's full name (case-insensitive).
Retry policy: if validation fails, call Gemini again. Maximum 2 retries (3 attempts total). If all attempts fail, return 502 with code AI_GENERATION_FAILED. Nothing is saved to the database in this case.
9.5 Scoring Rules
Event
Points
Correct accusation
Easy 100, Medium 150, Hard 200
Wrong accusation
0
Each discovered clue
+5
Each hint used
-10
Minimum total score
0
Final score formula:
finalScore = max(0, accusationPoints + (cluesFound * 5) - (hintsUsed * 10))
Assumptions (not stated in the guide, decided here):
A wrong accusation still keeps clue and hint points, so the player is not punished twice.
Discovering the same clue twice gives points only once.
Only one accusation is allowed, so the game always ends after submission.
9.6 Score Validation
All score calculations happen on the backend only.
The client displays the score it receives. It never calculates or sends a score.
10. Error Handling
Situation
Frontend behavior
Network error
Show "Connection problem. Check your internet and try again." with Retry
400
Show field-level message from the server
404
Show "Not found" page with a link to Home
409
Redirect to the correct page based on case status
502 (AI failed)
Show "The detective could not build this case. Try a different premise or try again."
500
Show generic error message
11. Acceptance Criteria
The project is complete when all of these are true:
[ ] Users can generate mysteries at Easy, Medium, and Hard levels.
[ ] Suspect, clue, and hint counts match the difficulty table.
[ ] Players can investigate, discover clues, request hints, and submit one accusation.
[ ] The culprit and explanation are not visible in any API response before the accusation.
[ ] Scores are calculated and validated by the backend and match the formula in Section 9.5.
[ ] Results display the correct verdict, culprit, explanation, and score breakdown.
[ ] Invalid AI responses are rejected and retried; the app never saves invalid data.
[ ] API failures show a friendly error message and do not crash the app.
[ ] The full flow works on the deployed Vercel frontend with the deployed backend and MongoDB Atlas.
[ ] The app is usable on a mobile screen.
12. Testing Plan
12.1 Manual Test Cases
Generate one mystery at each difficulty and check counts.
Refresh the investigation page and confirm progress is kept.
Try to access /case/:id/result on an active case (should redirect).
Inspect network responses in browser DevTools and confirm no culprit or explanation before accusation.
Discover the same clue twice and confirm points are added once.
Use all hints and then request one more (should show "No hints left").
Use hints until score would go below 0 and confirm score stays at 0.
Submit a correct accusation and a wrong one. Confirm verdict and score.
Submit an invalid premise (too short, empty) and confirm validation message.
Turn off the backend and confirm the frontend shows a network error.
12.2 Deployment Checks
Backend health route works (GET /api/health returns { "ok": true }).
Environment variables are set on the hosting platform.
CORS allows only the deployed frontend URL (CLIENT_URL).
13. Project Limitations
Each mystery is generated fresh and is not reused.
No user accounts. Progress is tied to the case ID in the URL and optional browser storage.
AI output quality depends on Gemini. Validation reduces bad output but cannot guarantee a perfect story.
Free-tier hosting may have cold starts, so the first request can be slow.
Only English is supported.