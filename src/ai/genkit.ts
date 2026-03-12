/**
 * @fileOverview Centralized Genkit AI configuration.
 */
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [
    googleAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY || 'AIzaSyB5hgQ6izdIMfHu3psJDgtUFe1LAHjYvls' }),
  ],
  logLevel: 'debug',
  enableTracing: true,
});
