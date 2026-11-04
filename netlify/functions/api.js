/**
 * Netlify Functions Serverless Entrypoint for Paridhan Uniforms
 * Bridges Express app with AWS Lambda / Netlify Serverless runtime.
 */
import serverless from 'serverless-http';
import app from '../../backend/src/server.js';

export const handler = serverless(app);
