const fetch = require('node-fetch');

async function handler(event) {
  // Set CORS headers
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
    // Parse and properly encode the URL
    let urlToFetch;
    try {
      const parsedUrl = new URL(targetURL);
      
      // Special handling for FRED API
      if (parsedUrl.hostname === 'api.stlouisfed.org') {
        // Ensure file_type is json
        const searchParams = new URLSearchParams(parsedUrl.search);
        searchParams.set('file_type', 'json');
        parsedUrl.search = searchParams.toString();
      }
      
      // Get the properly encoded URL
      urlToFetch = parsedUrl.toString();
    } catch (urlError) {
      console.error('URL parsing error:', urlError);
      urlToFetch = targetURL; // Fallback to original URL if parsing fails
    }

    console.log('Making request to:', urlToFetch);
    // First request to initiate the conversion
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
    } else {
      // Try to parse response as JSON
      try {
        data = JSON.parse(data);
      } catch (jsonError) {
        // If not JSON, leave as is
        console.log('Response is not JSON, leaving as text');
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