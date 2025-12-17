/**
 * @fileOverview Centralized Genkit AI configuration.
 */
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

// Función para obtener la clave de API desde el entorno o localStorage
const getApiKey = () => {
    if (typeof window !== 'undefined') {
        // En el navegador, intenta obtener la clave desde localStorage
        const key = localStorage.getItem('gemini_api_key');
        if (key) return key;
    }
    // En el servidor o si no está en localStorage, usa la variable de entorno
    return process.env.GEMINI_API_KEY;
};

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: getApiKey(),
    }),
  ],
  model: {
    name: 'googleai/gemini-2.5-pro',
    temperature: 0.4,
    maxOutputTokens: 2048,
  },
  logLevel: 'debug',
  enableTracing: true,
});
