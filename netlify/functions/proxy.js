const fetch = require('node-fetch');

async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET',
    'Content-Type': 'application/json'
  };

  const targetURL = event.queryStringParameters.url;
  
  if (!targetURL) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'URL parameter is required' })
    };
  }

  try {
    // Universal URL parsing and encoding
    let urlToFetch;
    try {
      // For FRED API, ensure the URL is properly encoded
      if (targetURL.includes('api.stlouisfed.org')) {
        let parsedUrl;
        try {
          // First try parsing as is
          parsedUrl = new URL(targetURL);
        } catch (e) {
          // If parsing fails, try encoding the URL first
          parsedUrl = new URL(encodeURI(targetURL));
        }

        const params = new URLSearchParams();
        
        // For non-encoded URLs, we need to parse the query string manually
        if (targetURL.includes('&') && !targetURL.includes('%')) {
          // Get everything after the ? in the original URL
          const queryString = targetURL.split('?')[1];
          if (queryString) {
            // Split by & and create key-value pairs
            const pairs = queryString.split('&');
            pairs.forEach(pair => {
              const [key, value] = pair.split('=');
              if (key === 'api_key') {
                params.append(key, '22ee7a76e736e32f54f5df0a7171538d');
              } else {
                params.append(key, value);
              }
            });
          }
        } else {
          // For encoded URLs, use the parsed params
          for (const [key, value] of parsedUrl.searchParams) {
            if (key === 'api_key') {
              params.append(key, '22ee7a76e736e32f54f5df0a7171538d');
            } else {
              params.append(key, value);
            }
          }
        }
        
        // Ensure file_type is json
        params.set('file_type', 'json');
        
        // Construct the URL with properly encoded parameters
        urlToFetch = `${parsedUrl.protocol}//${parsedUrl.hostname}${parsedUrl.pathname}?${params.toString()}`;
        console.log('Final FRED API URL:', urlToFetch);
      } else {
        // For other APIs, use standard URL handling
        const parsedUrl = new URL(targetURL);
        urlToFetch = parsedUrl.toString();
      }
    } catch (urlError) {
      console.error('URL parsing error:', urlError);
      urlToFetch = encodeURI(targetURL);
    }

    console.log('Making request to:', urlToFetch);
    const initialResponse = await fetch(urlToFetch);
    console.log('Initial response status:', initialResponse.status);
    
    // Wait for the conversion to complete
    console.log('Waiting for conversion...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Reduced to 1 second
    
    // Second request to get the converted data
    console.log('Making second request...');
    const response = await fetch(urlToFetch);
    const contentType = response.headers.get('content-type');
    let data = await response.text();
    
    console.log('Response content type:', contentType);

    // Handle Economics Observatory API response
    if (contentType && contentType.includes('text/html') && targetURL.includes('economicsobservatory.github.io/api/ons.html')) {
      try {
        // Extract the CDID from the URL - check both formats
        const urlObj = new URL(targetURL);
        let code = urlObj.searchParams.get('code');
        
        // If no direct code parameter, try to extract from the full URL parameter
        if (!code) {
          const fullUrl = urlObj.searchParams.get('url');
          if (fullUrl) {
            const match = fullUrl.match(/timeseries\/([a-zA-Z0-9]{4})\/dataset/i);
            if (match) {
              code = match[1].toLowerCase();
            }
          }
        }

        if (!code) {
          throw new Error('No CDID code found in URL');
        }

        // Construct the direct beta ONS API URLs
        const searchUrl = `https://api.beta.ons.gov.uk/v1/search?content_type=timeseries&cdids=${code}`;
        console.log('Fetching from search URL:', searchUrl);
        
        const searchResponse = await fetch(searchUrl);
        const searchData = await searchResponse.json();

        if (!searchData.items?.length) {
          throw new Error('Timeseries not found');
        }

        const item = searchData.items[0];
        const uri = item.uri;

        // Fetch the actual data
        const dataUrl = `https://api.beta.ons.gov.uk/v1/data?uri=${uri}`;
        console.log('Fetching from data URL:', dataUrl);
        
        const dataResponse = await fetch(dataUrl);
        data = await dataResponse.json();

        // If data_only is specified, return only the data
        if (urlObj.searchParams.get('data_only') === 'true') {
          data = data.observations || data;
        }
      } catch (parseError) {
        console.error('Data fetching error:', parseError);
        return {
          statusCode: 422,
          headers,
          body: JSON.stringify({
            error: 'Failed to fetch data',
            details: parseError.message
          })
        };
      }
    }

    // Try to parse as JSON for all responses
    try {
      data = JSON.parse(data);
    } catch (jsonError) {
      if (!contentType?.includes('text/html')) {
        console.warn('Non-JSON response from API:', contentType);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: typeof data === 'string' ? data : JSON.stringify(data)
    };

  } catch (error) {
    console.error('Proxy error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message,
        url: targetURL,
        stack: error.stack
      })
    };
  }
}

exports.handler = handler;