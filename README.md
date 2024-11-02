# CORS Proxy

A simple CORS proxy for the Economics Observatory, built with Netlify Functions.

## Usage

Send GET requests to:

```
https://eco-cors-proxy.netlify.app/proxy?url=YOUR_ENCODED_URL
```

## Examples

### Direct ONS API Calls

1. CPI Annual Rate (d7g7):
```
https://eco-cors-proxy.netlify.app/proxy?url=https://api.beta.ons.gov.uk/v1/datasets/mm23/editions/time-series/versions/2
```

2. GDP Quarter on Quarter Growth (l55o):
```
https://eco-cors-proxy.netlify.app/proxy?url=https://api.beta.ons.gov.uk/v1/datasets/pn2/editions/time-series/versions/2
```

3. Unemployment Rate (mgsx):
```
https://eco-cors-proxy.netlify.app/proxy?url=https://api.beta.ons.gov.uk/v1/datasets/lms/editions/time-series/versions/2
```

### Economics Observatory API Calls

1. CPI Annual Rate via EO API:
```
https://eco-cors-proxy.netlify.app/proxy?url=https://economicsobservatory.github.io/api/ons.html?url=https://api.ons.gov.uk/timeseries/d7g7/dataset/mm23/data&format=json&data_only=true
```

2. GDP Growth via EO API:
```
https://eco-cors-proxy.netlify.app/proxy?url=https://economicsobservatory.github.io/api/ons.html?url=https://api.ons.gov.uk/timeseries/l55o/dataset/pn2/data&format=json&data_only=true
```

3. Unemployment Rate via EO API:
```
https://eco-cors-proxy.netlify.app/proxy?url=https://economicsobservatory.github.io/api/ons.html?url=https://api.ons.gov.uk/timeseries/mgsx/dataset/lms/data&format=json&data_only=true
```

## Using with Vega-Lite

Here's an example of how to use the proxy with Vega-Lite:

```json
{
  "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
  "title": "CPI Annual Rate",
  "data": {
    "url": "https://eco-cors-proxy.netlify.app/proxy?url=https://economicsobservatory.github.io/api/ons.html?url=https://api.ons.gov.uk/timeseries/d7g7/dataset/mm23/data&format=json&data_only=true",
    "format": {
      "type": "json",
      "property": "months"
    }
  },
  "mark": {"type": "line"},
  "encoding": {
    "x": {"field": "date", "type": "temporal"},
    "y": {"field": "value", "type": "quantitative"}
  }
}
```

## Development

1. Clone the repository:
```bash
git clone https://github.com/EconomicsObservatory/cors-proxy.git
cd cors-proxy
```

2. Install dependencies:
```bash
npm install
```

3. Install Netlify CLI:
```bash
npm install -g netlify-cli
```

4. Test locally:
```bash
netlify dev
```

## Deployment

The proxy is automatically deployed to Netlify when changes are pushed to the main branch.

Current deployment: [https://eco-cors-proxy.netlify.app](https://eco-cors-proxy.netlify.app)

## Limitations

- Rate limited to prevent abuse
- Only GET requests are supported
- URL must be properly encoded
- Response must be valid JSON

## Contributing

Feel free to open issues or submit pull requests if you find any problems or have suggestions for improvements.

## License

MIT
```

Next steps:
1. Create the repository on GitHub
2. Push all files
3. Connect to Netlify
4. Deploy

Would you like help with any of these steps?