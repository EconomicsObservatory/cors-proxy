const fetch = require('node-fetch');

// Simple in-memory rate limiting
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 60; // 60 requests per minute
const requestLog = new Map();

// Changed from exports.handler to module.exports.handler
module.exports.handler = async (event, context) => {
  // Rate limiting check
  const clientIP = event.headers['client-ip'];
  const now = Date.now();
  const clientRequests = requestLog.get(clientIP) || [];
  const recentRequests = clientRequests.filter(time => now - time < RATE_LIMIT_WINDOW);
  
  if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    return {
      statusCode: 429,
      body: 'Too Many Requests'
    };
  }
  
  requestLog.set(clientIP, [...recentRequests, now]);

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed'
    };
  }

  // Get the target URL from the querystring
  const targetURL = event.queryStringParameters.url;
  if (!targetURL) {
    return {
      statusCode: 400,
      body: 'Missing target URL parameter'
    };
  }

  try {
    // Forward the request to the target URL
    const response = await fetch(targetURL);
    const data = await response.text();

    // Return the response with CORS headers
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET',
        'Content-Type': response.headers.get('content-type')
      },
      body: data
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: `Error: ${error.message}`
    };
  }
};