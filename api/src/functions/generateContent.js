const { app } = require('@azure/functions');
const { GoogleGenAI } = require('@google/genai');

app.http('generateContent', {
    methods: ['POST', 'GET'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log(`Http function processed request for url "${request.url}"`);

        if (request.method === 'GET') {
            return { body: JSON.stringify({ status: "API is running", keyConfigured: !!process.env.GEMINI_API_KEY }) };
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            context.error("GEMINI_API_KEY is missing");
            return { status: 500, body: JSON.stringify({ error: "Server missing GEMINI_API_KEY configuration." }) };
        }

        try {
            const body = await request.json();
            const { model, contents, config } = body;

            // Initialize Gemini with server-side key
            const ai = new GoogleGenAI({ apiKey });

            // Execute request
            const result = await ai.models.generateContent({
                model: model || 'gemini-1.5-flash',
                contents,
                config
            });

            const text = typeof result.text === 'function' ? result.text() : result.text;

            return { body: JSON.stringify({ text }) };

        } catch (error) {
            context.error("Error executing Gemini request:", error);
            return { status: 500, body: JSON.stringify({ error: error.message || String(error) }) };
        }
    }
});
