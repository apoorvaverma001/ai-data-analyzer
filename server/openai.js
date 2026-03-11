const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function generateInsights(analysisResult) {
    const prompt = JSON.stringify(analysisResult);
    const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
            {
                role: "system",
                content: "You are a data analyst.",
            },
            {
                role: "user",
                content: `Given this data summary, generate 3-5 bullet point business insights in plain English: ${prompt}`,
            },
        ],
    });
    return response.json();
}

module.exports = {
    generateInsights,
};
