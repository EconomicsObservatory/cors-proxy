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
    // First request to get the page
    const response = await fetch(targetURL);
    const contentType = response.headers.get('content-type');
    let data = await response.text();

    // If it's the Economics Observatory API response
    if (contentType && contentType.includes('text/html')) {
      try {
        // First try to find JSON in a <pre> tag
        let jsonMatch = data.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
        
        if (jsonMatch && jsonMatch[1]) {
          // Clean up any HTML entities and whitespace
          const cleanJson = jsonMatch[1]
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .trim();
          
          data = JSON.parse(cleanJson);
        } else {
          // If no <pre> tag, try to find JSON content directly
          jsonMatch = data.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
          if (jsonMatch && jsonMatch[1]) {
            data = JSON.parse(jsonMatch[1].trim());
          } else {
            throw new Error('No JSON data found in response');
          }
        }
      } catch (parseError) {
        console.error('JSON parsing error:', parseError);
        return {
          statusCode: 422,
          body: JSON.stringify({
            error: 'Failed to parse JSON from HTML response',
            details: parseError.message,
            // Add debug info
            contentType: contentType,
            dataPreview: data.substring(0, 200) // First 200 chars for debugging
          })
        };
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET',
        'Content-Type': 'application/json'
      },
      body: typeof data === 'string' ? data : JSON.stringify(data)
    };

  } catch (error) {
    console.error('Proxy error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
        url: targetURL
      })
    };
  }
};