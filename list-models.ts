import { GoogleGenAI } from "@google/genai";

const API_KEY = "AIzaSyA3tKgxDNsibh0VgX8q11fd7G7Lu4tW0J8";

async function listAvailableModels() {
    try {
        const ai = new GoogleGenAI({ apiKey: API_KEY });

        console.log("Fetching available models...\n");

        const models = await ai.models.list();

        console.log("Available Gemini Models:");
        console.log("========================\n");

        for (const model of models) {
            console.log(`Model: ${model.name}`);
            console.log(`  Display Name: ${model.displayName || 'N/A'}`);
            console.log(`  Description: ${model.description || 'N/A'}`);
            console.log(`  Supported Methods: ${model.supportedGenerationMethods?.join(', ') || 'N/A'}`);
            console.log(`  Input Token Limit: ${model.inputTokenLimit || 'N/A'}`);
            console.log(`  Output Token Limit: ${model.outputTokenLimit || 'N/A'}`);
            console.log('---');
        }

        console.log(`\nTotal models available: ${models.length}`);

    } catch (error) {
        console.error("Error fetching models:", error);
    }
}

listAvailableModels();
