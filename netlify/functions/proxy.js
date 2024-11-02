const fetch = require('node-fetch');

async function handler(event) {
  const targetURL = event.queryStringParameters.url;
  
  if (!targetURL) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'URL parameter is required' })
    };
  }

  try {
    console.log('Initial request to:', targetURL);
    // First request to initiate the conversion
    const initialResponse = await fetch(targetURL);
    console.log('Initial response status:', initialResponse.status);
    
    // Wait for the conversion to complete
    console.log('Waiting for conversion...');
    await new Promise(resolve => setTimeout(resolve, 3000)); // Increased to 3 seconds
    
    // Second request to get the converted data
    console.log('Making second request...');
    const response = await fetch(targetURL);
    const contentType = response.headers.get('content-type');
    let data = await response.text();
    
    console.log('Response content type:', contentType);

    // If it's the Economics Observatory API response
    if (contentType && contentType.includes('text/html')) {
      try {
        // Extract the CDID from the URL
        const urlObj = new URL(targetURL);
        const code = urlObj.searchParams.get('code');
        
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
          body: JSON.stringify({
            error: 'Failed to fetch data',
            details: parseError.message
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
        url: targetURL,
        stack: error.stack
      })
    };
  }
}

exports.handler = handler;