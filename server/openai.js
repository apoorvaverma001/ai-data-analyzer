const OpenAI = require('openai');

async function generateInsights(analysisResult) {
    const apiKey = process.env.GROQ_API_KEY; 
    if (!apiKey) {
        throw new Error(
            'GROQ_API_KEY is missing. Set it in server/.env (or your environment) before starting the server.'
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
                role: 'system',
                content: 'You are an expert data analyst. Provide clear, plain text business insights. Do NOT use any asterisks (*) or markdown bold syntax (**text**) in your output.',
            },
            {
                role: 'user',
                content: `Given this dataset summary (including row count, column count, columns, top categories, and missing values), generate 3 to 5 bullet point insights without using any asterisks (*): ${prompt}`,
            },
        ],
    });

    const text = response.choices[0]?.message?.content || '';
    // Remove all asterisks from the text
    return text.replace(/\*/g, '');
}

module.exports = {
    generateInsights,
};
