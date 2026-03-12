const OpenAI = require('openai');

async function generateInsights(analysisResult) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error(
            'OPENAI_API_KEY is missing. Set it in server/.env (or your environment) before starting the server.'
        );
    }

    const openai = new OpenAI({ apiKey });
    const prompt = JSON.stringify(analysisResult);
    const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
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
