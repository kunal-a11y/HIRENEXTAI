import api from './api';

// Check if AI is available
export function isAIAvailable() {
  return !!localStorage.getItem('token');
}

// Generate questions
export async function generateQuestions(role, difficulty, type, count = 8) {
  // If AI available: use AI
  if (isAIAvailable()) {
    try {
      const response = await api.post('/api/interview/generate', {
        role,
        difficulty,
        type,
        count
      });
      
      if (response.data && response.data.success) {
        const questions = response.data.questions;
        if (Array.isArray(questions) && questions.length > 0) {
          return questions;
        }
      }
    } catch (e) {
      console.log('AI question gen failed, using demo bank:', e);
    }
  }
  
  // Fallback: demo question bank
  return getDemoQuestions(role, difficulty, type, count);
}

// Evaluate answers with AI
export async function evaluateAnswers(role, questions, answers) {
  if (isAIAvailable()) {
    try {
      const response = await api.post('/api/interview/evaluate', {
        role,
        questions,
        answers
      });
      
      if (response.data && response.data.success) {
        const results = response.data.results;
        if (results) {
          // Standardize question_scores keys to match what the frontend expects
          if (Array.isArray(results.question_scores)) {
            results.question_scores = results.question_scores.map((qs, i) => ({
              id: qs.id || qs.question_id || (i + 1),
              score: qs.score,
              good: qs.good || qs.correct || '',
              improve: qs.improve || qs.incorrect || '',
              tip: qs.tip || qs.better_answer || ''
            }));
          }
          return results;
        }
      }
    } catch (e) {
      console.log('AI evaluation failed, using local:', e);
    }
  }
  
  // Fallback: local evaluation
  return localEvaluate(questions, answers);
}

// Local evaluation (no AI needed)
function localEvaluate(questions, answers) {
  const scores = questions.map((question, i) => 
    calculateAnswerScore(answers[i], question)
  )
  
  const avg = scores.reduce((a,b) => a+b, 0) / scores.length
  const overall = Math.round(avg * 10)
  
  return {
    overall_score: overall,
    breakdown: {
      communication: clamp(overall + rand(-5,5)),
      technical: clamp(overall + rand(-8,8)),
      problem_solving: clamp(overall + rand(-5,5)),
      confidence: clamp(overall + rand(-3,3))
    },
    question_scores: questions.map((q, i) => {
      const score = scores[i]
      const fb = getAnswerFeedback(answers[i], score)
      return {
        id: q.id || i+1,
        score,
        good: fb.good,
        improve: fb.improve,
        tip: fb.tip
      }
    }),
    strengths: getStrengths(overall),
    improvements: getImprovements(overall),
    study_topics: getStudyTopics(overall)
  }
}

export function rateSingleAnswer(question, answer) {
  const score = calculateAnswerScore(answer, question);
  const fb = getAnswerFeedback(answer, score);
  return {
    score,
    feedback: `${fb.good}\n\nImprove: ${fb.improve}\n\nTip: ${fb.tip}`,
    good: fb.good,
    improve: fb.improve,
    tip: fb.tip,
  };
}

export function buildMindMapText(job, questions, answers, results) {
  const lines = [
    `# Interview Mind Map — ${job?.job_title || 'Role'} @ ${job?.company || 'Company'}`,
    '',
    `## Overall Score: ${results.overall_score}/100`,
    '',
    '## Strengths',
    results.strengths || '—',
    '',
    '## Weaknesses',
    results.improvements || '—',
    '',
    '## Questions & Answers',
  ];
  questions.forEach((q, i) => {
    lines.push(`\n### Q${i + 1}: ${q.question}`);
    lines.push(`**Answer:** ${answers[i] || '(no answer)'}`);
    const qs = results.question_scores?.[i];
    if (qs) lines.push(`**Score:** ${qs.score}/10`);
  });
  return lines.join('\n');
}

export function calculateAnswerScore(answer, question) {
  void question
  if (!answer || answer.trim() === '') return 0
  
  const trimmed = answer.trim()
  const wordCount = trimmed.split(/\s+/).filter(w => w.length > 0).length
  const charCount = trimmed.length
  
  // Too short - clearly not trying
  if (charCount < 10 || wordCount < 2) return 1
  
  // Very short answer
  if (wordCount < 5) return 2
  
  // Short answer  
  if (wordCount < 15) return 4
  
  // Decent answer
  if (wordCount < 30) return 6
  
  // Good answer
  if (wordCount < 60) return 7
  
  // Detailed answer
  if (wordCount < 100) return 8
  
  // Very detailed answer
  if (wordCount >= 100) return 9
  
  return 5
}

export function getAnswerFeedback(answer, score) {
  const wordCount = answer?.trim().split(/\s+/).filter(w => w.length > 0).length || 0
  
  if (wordCount < 2) return {
    good: "No meaningful answer provided.",
    improve: "You need to attempt the question.",
    tip: "Even a brief attempt shows effort."
  }
  
  if (score <= 2) return {
    good: "You attempted the question.",
    improve: "Answer is too brief. Explain more.",
    tip: "Use the STAR method: Situation, Task, Action, Result."
  }
  
  if (score <= 4) return {
    good: "Basic understanding shown.",
    improve: "Add more details and examples.",
    tip: "Try to give real-world examples from your experience."
  }
  
  if (score <= 6) return {
    good: "Decent answer with some good points.",
    improve: "Could be more structured and detailed.",
    tip: "Structure your answer: define, explain, example, conclusion."
  }
  
  if (score <= 8) return {
    good: "Well explained with good detail.",
    improve: "Minor improvements possible.",
    tip: "Practice explaining technical concepts simply."
  }
  
  return {
    good: "Excellent comprehensive answer!",
    improve: "Keep it up - very well done.",
    tip: "You're well prepared. Keep practicing!"
  }
}

function clamp(n) { return Math.min(100, Math.max(0, n)) }

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }

function getStrengths(score) {
  if (score >= 80) return "Excellent communication and detailed answers."
  if (score >= 60) return "Good understanding of core concepts."
  return "You attempted all questions - good effort!"
}

function getImprovements(score) {
  if (score >= 80) return "Minor improvements in technical depth."
  if (score >= 60) return "Add more examples and structure answers better."
  return "Practice giving detailed answers with examples."
}

function getStudyTopics() {
  return [
    "STAR Method for HR questions",
    "Core technical concepts",
    "Problem solving frameworks",
    "Communication skills",
    "Industry best practices"
  ]
}

// Demo question bank
function getDemoQuestions(role, difficulty, type, count) {
  const technical = {
    easy: [
      "What is the difference between var, let, and const?",
      "Explain what HTML semantic elements are.",
      "What is CSS flexbox and when would you use it?",
      "What is the difference between == and ===?",
      "What is a REST API?",
      "What is version control and why is it important?",
      "What is responsive design?",
      "Difference between GET and POST requests?"
    ],
    medium: [
      "Explain closures in JavaScript with an example.",
      "What is the virtual DOM in React and how does it work?",
      "Explain SQL vs NoSQL databases.",
      "What is async/await and how does it differ from Promises?",
      "Explain RESTful API design principles.",
      "Difference between authentication and authorization?",
      "How does CSS specificity work?",
      "What is a React hook? Name and explain 3 hooks."
    ],
    hard: [
      "Design a URL shortener system like bit.ly.",
      "What are microservices vs monolithic architecture?",
      "Explain the CAP theorem.",
      "How would you optimize a slow database query?",
      "Explain event-driven architecture.",
      "What are design patterns? Explain Singleton and Observer.",
      "How does OAuth 2.0 work?",
      "WebSockets vs HTTP polling - when to use each?"
    ]
  }
  
  const hr = [
    "Tell me about yourself and your background.",
    "What are your greatest strengths?",
    "What is your biggest weakness and how are you improving?",
    "Why do you want to work for our company?",
    "Where do you see yourself in 5 years?",
    "Tell me about a challenging project you worked on.",
    "How do you handle tight deadlines and pressure?",
    "Describe a time you faced conflict in a team."
  ]
  
  let pool
  
  if (type === 'technical') {
    pool = technical[difficulty] || technical.medium
  } else if (type === 'hr') {
    pool = hr
  } else {
    const t = (technical[difficulty] || technical.medium).slice(0, 4)
    const h = hr.slice(0, 4)
    pool = [...t, ...h]
  }
  
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  
  return shuffled.slice(0, count).map((q, i) => ({
    id: i + 1,
    type: i % 2 === 0 ? 'technical' : 'hr',
    question: q,
    category: role
  }))
}

// Get past interview history
export async function getInterviewHistory() {
  try {
    const response = await api.get('/api/interview/history');
    if (response.data && response.data.success) {
      return response.data.history;
    }
    return [];
  } catch (err) {
    console.error('Failed to get interview history:', err);
    return [];
  }
}

// Get interview detail by ID
export async function getInterviewDetail(id) {
  try {
    const response = await api.get(`/api/interview/${id}`);
    if (response.data && response.data.success) {
      return response.data.interview;
    }
    return null;
  } catch (err) {
    console.error('Failed to get interview detail:', err);
    return null;
  }
}
