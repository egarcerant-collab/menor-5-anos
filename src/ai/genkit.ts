
/**
 * @fileOverview Centralized Genkit AI configuration.
 */
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

// Usamos la clave proporcionada por el usuario
const apiKey = "AIzaSyB5hgQ6izdIMfHu3psJDgtUFe1LAHjYvls";

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: apiKey,
    }),
  ],
  logLevel: 'debug',
  enableTracing: true,
});
