const OpenAI = require('openai');

async function generateInsights(analysisResult) {
    const apiKey = process.env.GROQ_API_KEY; 
    if (!apiKey) {
        throw new Error(
            'GROQAI_API_KEY is missing. Set it in server/.env (or your environment) before starting the server.'
        );
    }

    const client = new OpenAI({
        apiKey,
        baseURL: "https://api.groq.com/openai/v1",
    });

    
    const prompt = JSON.stringify(analysisResult);
    const response = await client.chat.completions.create({
        model: "openai/gpt-oss-20b",
        messages: [
            {
                role:'system',
                content: 'You are a data analyst.',
            },
            {
                role: 'user',
                content: `Given this data summary, generate 3-5 bullet point business insights in plain English: ${prompt}`,
            },
        ],
    });
    return response.choices[0].message.content;
}

module.exports = {
    generateInsights,
};
