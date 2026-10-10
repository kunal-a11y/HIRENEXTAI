const geminiService = require('./geminiService');

// Helper to extract JSON from markdown code blocks or plain text
function extractJSON(text) {
    try {
        return JSON.parse(text);
    } catch (e) {
        const match = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
        if (match) {
            try {
                return JSON.parse(match[1]);
            } catch (e2) {
                // Fall through
            }
        }
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            try {
                return JSON.parse(text.slice(firstBrace, lastBrace + 1));
            } catch (e3) {
                // Fall through
            }
        }
        throw e;
    }
}

exports.generateChatResponse = async (messages) => {
    try {
        const prompt = messages.map(msg => {
            const roleName = (msg.role === 'user' || msg.role === 'customer') ? 'User' : 'HirenextAI';
            return `${roleName}: ${msg.content}`;
        }).join('\n\n') + '\n\nHirenextAI:';

        const response = await geminiService.generateContent(prompt, {
            endpoint: '/api/chat/send'
        });
        return response;
    } catch (error) {
        console.error("AI Service Error:", error);
        throw error;
    }
};

exports.calculateMatchScore = async (userProfile, jobDescription) => {
    try {
        const prompt = `Calculate a job match percentage (0-100) based on the user's profile and the job description. Return ONLY a JSON object like {"score": 85, "reason": "Short reason here"}.
        
        User Profile:
        Skills: ${userProfile.skills || 'Not provided'}
        Experience: ${userProfile.experience || 'Not provided'}
        Education: ${userProfile.education || 'Not provided'}
        
        Job Description:
        ${jobDescription}`;

        const response = await geminiService.generateContent(prompt, {
            endpoint: '/api/jobs/match'
        });

        const result = extractJSON(response);
        return result.score || 0;
    } catch (error) {
        console.error("Match Score Error:", error);
        return 0; // default to 0 on error
    }
};
