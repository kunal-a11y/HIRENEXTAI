const pdfParse = require('pdf-parse');
const { executeAIRequest, parseAIJSON } = require('./ai');

// Helper to wrap a promise with a timeout
function promiseTimeout(promise, ms, errorMsg) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMsg));
    }, ms);
  });
  return Promise.race([
    promise.then((res) => {
      clearTimeout(timeoutId);
      return res;
    }),
    timeoutPromise
  ]);
}

/**
 * Parse raw PDF buffer and extract structured resume details using the AI Router
 */
async function parseResumePDF(buffer) {
  try {
    // 1. Extract raw text from the PDF with a 10-second timeout guard
    const parsedData = await promiseTimeout(
      pdfParse(buffer),
      10000,
      'PDF parsing timeout exceeded (possible compression bomb or malformed file).'
    );

    // 2. Validate PDF bounds to guard against document bombs
    if (parsedData.numpages && parsedData.numpages > 30) {
      throw new Error(`PDF page count (${parsedData.numpages}) exceeds the maximum limit of 30 pages.`);
    }

    const rawText = parsedData.text;

    if (!rawText || rawText.trim().length === 0) {
      throw new Error('Could not extract any text content from the uploaded PDF resume.');
    }

    if (rawText.length > 100000) {
      throw new Error('Extracted text size exceeds acceptable resume length limits.');
    }

    // 2. Build system instruction and user prompt for extraction
    const systemInstruction = `You are a professional ATS resume parser. Your job is to extract resume data from raw text and structure it as a clean JSON object. 
Do not invent details. If a field is missing, set it to an empty array or null as appropriate.
Ensure experience, projects, education, and language lists are parsed correctly.

You MUST respond with a single valid JSON object following this schema exactly:
{
  "name": "Full Name or null",
  "email": "Email address or null",
  "phone": "Phone number or null",
  "skills": ["Skill1", "Skill2", ...],
  "education": [
    {
      "degree": "Degree/Major",
      "school": "University/Institution name",
      "graduation_year": "Year or null"
    }
  ],
  "experience": [
    {
      "company": "Company Name",
      "role": "Job Title",
      "dates": "Employment dates",
      "description": "Short summary of achievements/responsibilities"
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "description": "Short description of the project",
      "link": "Project link or null"
    }
  ],
  "certifications": ["Cert1", "Cert2", ...],
  "languages": ["Language1", "Language2", ...],
  "career_goal": "A short summary of the candidate's career focus or null"
}`;

    const prompt = `Here is the raw text extracted from the resume:
-----------------------------------------
${rawText}
-----------------------------------------
Please extract and structure the content into JSON.`;

    // 3. Request AI extraction in JSON mode
    const aiResponse = await executeAIRequest(prompt, systemInstruction, true);
    
    // 4. Parse the structured profile JSON
    const structuredProfile = parseAIJSON(aiResponse);
    if (!structuredProfile) {
      throw new Error('Failed to extract structured data from resume content');
    }

    return structuredProfile;
  } catch (err) {
    console.error('Resume PDF parsing failed:', err);
    throw new Error('Failed to parse resume: ' + err.message);
  }
}

module.exports = {
  parseResumePDF
};
