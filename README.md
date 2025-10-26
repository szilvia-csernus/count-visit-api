# Count Visit API

A production-ready serverless AWS Lambda API for tracking website visit counts by origin. This API efficiently tracks visits per month with comprehensive security features and automatic data cleanup to keep costs low.

Built with **AWS SAM** (Serverless Application Model) - Amazon's official framework for serverless applications.

## Features

- ✅ Track visits by origin (website URL)
- ✅ Monthly visit counting with automatic reset
- ✅ Cost-effective S3 file storage (cheaper than DynamoDB for this use case)
- ✅ Automatic cleanup of old data (2+ months)
- ✅ CORS support for frontend integration
- ✅ Health check endpoint
- ✅ Input validation and error handling
- ✅ **Comprehensive resource tagging** for cost tracking and filtering
- ✅ **Multi-environment support** (dev/prod)
- ✅ **API Gateway rate limiting** (5 req/sec, 10k daily quota)
- ✅ **Enhanced security validation** with bot detection
- ✅ **Origin validation** against allowed domains
- ✅ **User-Agent validation** to block scrapers and bots
- ✅ **AWS Application Manager integration** with proper tagging
- ✅ **Comprehensive unit test suite** with 100% security feature coverage

## Testing

### Running Tests

The project includes a comprehensive test suite that validates all security features and API functionality:

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode during development
npm test -- --watch
```

### Test Coverage

Our test suite includes **9 comprehensive tests** covering:

#### ✅ **Health Check** (1 test)

- API health endpoint functionality

#### ✅ **Enhanced Security Validation** (2 tests)

- Unauthorized origin blocking
- Valid request processing

#### ✅ **Bot Detection** (2 tests)

- Known bot user agents (Googlebot, etc.)
- Command-line tools (curl, wget)

#### ✅ **CORS Handling** (2 tests)

- OPTIONS preflight requests
- CORS header validation

#### ✅ **Edge Cases** (2 tests)

- Missing origin header handling
- Missing user agent handling

### Test Architecture

The tests use modern ES6 module testing with Jest:

- **ES6 Module Support**: Using `jest.unstable_mockModule()` (official pattern)
- **AWS SDK Mocking**: Complete isolation from AWS services
- **Environment Simulation**: Mock environment variables for testing
- **Security Validation**: Each security feature individually tested

```bash
# Example test output
✓ should return health status
✓ should block unauthorized origin
✓ should allow valid requests
✓ should block known bot user agents
✓ should block curl requests
✓ should handle OPTIONS preflight requests
✓ should include CORS headers in responses
✓ should handle missing origin header
✓ should handle missing user agent

Test Suites: 1 passed, 1 total
Tests: 9 passed, 9 total
```

## Data Structure

Each visit record contains:

- `origin`: The website URL (e.g., <https://example.com>)
- `yearMonth`: Current month in YYYY-MM format
- `visitCount`: Number of visits this month
- `lastVisitDate`: ISO timestamp of the last visit

## Resource Tags

All AWS resources are tagged for easy filtering and cost allocation:

| Tag           | Value           | Purpose                    |
| ------------- | --------------- | -------------------------- |
| `Project`     | count-visit-api | Project identification     |
| `Application` | count-visit-api | Application identification |
| `Environment` | dev/prod        | Environment type           |
| `ManagedBy`   | aws-sam         | Management tool            |

**Filter resources in AWS Console:**

- Tag: `Project=count-visit-api` - See all project resources
- Tag: `Environment=dev` - See only dev environment resources

## Security Features

### API Rate Limiting

The API includes built-in protection against abuse:

| Feature         | Limit              | Purpose                 |
| --------------- | ------------------ | ----------------------- |
| **Rate Limit**  | 10 requests/second | Prevent API flooding    |
| **Burst Limit** | 20 requests        | Handle traffic spikes   |
| **Daily Quota** | 50,000 requests    | Cost protection         |
| **Usage Plan**  | Per API key        | Organized rate limiting |

### Enhanced Security Validation

Every request goes through multiple security checks:

#### 1. **Origin Validation**

- ✅ Must be in `ALLOWED_ORIGINS` environment variable
- ✅ Blocks unauthorized domains
- ✅ Prevents cross-origin abuse

#### 2. **Bot Detection**

- ✅ **Comprehensive 2025 bot patterns** with 60+ detection rules
- ✅ **Search engine crawlers**: Googlebot, Bingbot, Baiduspider, YandexBot
- ✅ **AI/ML data crawlers**: GPTBot, ClaudeBot, ChatGPT-User, PerplexityBot
- ✅ **SEO tools**: AhrefsBot, SemrushBot, Screaming Frog, Botify
- ✅ **Social media crawlers**: Facebook, Twitter, LinkedIn, Slack bots
- ✅ **Security scanners**: Shodan, Censys, Nmap, SQLMap, Nessus
- ✅ **Web scraping tools**: Scrapy, Selenium, Puppeteer, ParseHub, Octoparse
- ✅ **Development tools**: curl, wget, Postman, Insomnia, HTTPie
- ✅ **Monitoring services**: Pingdom, UptimeRobot, StatusCake
- ✅ **Headless browsers**: PhantomJS, Chrome-headless, Playwright
- ✅ **Malicious patterns**: hack, exploit, scan, penetration tools
- ✅ Requires realistic User-Agent (min 10 characters)

#### 3. **Request Analysis**

- ✅ IP address logging for monitoring
- ✅ Referer header validation (warning only)
- ✅ Comprehensive security logging

#### 4. **Error Responses**

- `400`: Missing origin header
- `403`: Unauthorized origin or bot detected
- `403`: Invalid User-Agent
- `500`: Server errors

### Security Monitoring

All security events are logged to CloudWatch:

```bash
# View security logs
sam logs -n CountVisitsFunction --tail

# Search for blocked requests
sam logs -n CountVisitsFunction --filter "Blocked request"
```

## API Endpoints

### POST /count-visit

Records a visit and returns the current count for the origin.

**Headers Required:**

- `Origin`: The website URL (automatically set by browsers)
- `User-Agent`: Browser user agent (for bot detection)

**Request:**

```bash
# No request body needed - origin comes from headers
POST /count-visit
Origin: https://my-website.com
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36
```

**Response:**

```json
{
  "origin": "https://my-website.com",
  "yearMonth": "2025-10",
  "visitCount": 42,
  "lastVisitDate": "2025-10-23T10:30:00.000Z",
  "timestamp": "2025-10-23T10:30:00.000Z"
}
```

### GET /health

Health check endpoint for monitoring.

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2025-10-23T10:30:00.000Z"
}
```

### OPTIONS /count-visit

CORS preflight request handler.

**Response:**

- Status: 200
- Headers: CORS configuration

## Frontend Integration

### JavaScript/Fetch Example

```javascript
// Simple visit tracking
async function trackVisit() {
  try {
    const response = await fetch("https://your-api-url/count-visit", {
      method: "POST",
    });

    const data = await response.json();
    console.log(`Visit count: ${data.visitCount}`);
  } catch (error) {
    console.error("Failed to track visit:", error);
  }
}

// Track visit when page loads
trackVisit();
```

### React Hook Example

```jsx
import { useState, useEffect } from "react";

function useVisitTracker(apiUrl) {
  const [visitCount, setVisitCount] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function trackVisit() {
      try {
        const response = await fetch(`${apiUrl}/count-visit`, {
          method: "POST",
        });

        if (response.ok) {
          const data = await response.json();
          setVisitCount(data.visitCount);
        }
      } catch (error) {
        console.error("Visit tracking failed:", error);
      } finally {
        setLoading(false);
      }
    }

    trackVisit();
  }, [apiUrl]);

  return { visitCount, loading };
}

// Usage in component
function App() {
  const { visitCount, loading } = useVisitTracker("https://your-api-url");

  return (
    <div>
      {loading ? <span>Loading...</span> : <span>Visits: {visitCount}</span>}
    </div>
  );
}
```

## Development

### Prerequisites

- Node.js 18+
- AWS CLI configured
- AWS SAM CLI installed
- Jest for testing

### Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd count-visit-api

# Install dependencies
npm install

# Run tests
npm test

# Validate SAM template
sam validate

# Build the application
sam build
```

### Configuration

1. **Environment Variables**

   ```bash
   # Copy the example environment file
   cp .env.example .env

   # Edit with your values
   BUCKET_NAME=your-visit-data-bucket
   ALLOWED_ORIGINS=https://yoursite.com,https://www.yoursite.com
   ```

2. **AWS Configuration**

   ```bash
   # Configure AWS credentials
   aws configure

   # Or use AWS profiles
   aws configure --profile your-profile
   ```

### Local Development

```bash
# Start API locally
sam local start-api

# Test API locally
curl -X POST http://localhost:3000/count-visit \
  -H "Origin: https://example.com" \
  -H "User-Agent: Mozilla/5.0 (test)"

# Check health endpoint
curl http://localhost:3000/health
```

### Deployment

```bash
# Deploy to dev environment
npm run deploy:dev

# Deploy to production
npm run deploy:prod

# Monitor logs
npm run logs
```

### Available Scripts

```bash
npm test           # Run test suite
npm run build      # Build SAM application
npm run deploy:dev # Deploy to dev environment
npm run deploy:prod # Deploy to production
npm run local      # Start local API
npm run logs       # View CloudWatch logs
npm run validate   # Validate SAM template
npm run delete     # Delete CloudFormation stack
```

## Architecture

### AWS Services Used

- **AWS Lambda**: Serverless compute for API logic
- **API Gateway**: HTTP API with rate limiting
- **S3**: Cost-effective storage for visit data
- **CloudWatch**: Logging and monitoring
- **CloudFormation**: Infrastructure as Code via SAM

### Cost Optimization

- **S3 Storage**: More cost-effective than DynamoDB for this use case
- **Lifecycle Rules**: Automatic cleanup of old data
- **Lambda Efficiency**: Fast cold starts with minimal dependencies
- **Rate Limiting**: Prevents cost overruns from abuse

### Security Architecture

```md
Internet → API Gateway → Lambda → S3
↓
Rate Limiting
Origin Validation  
Bot Detection
Security Logging
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Ensure all tests pass: `npm test`
5. Create a pull request

## License

MIT License - see LICENSE file for details.

## Bot Detection Maintenance

### Update Schedule

The bot detection patterns should be maintained regularly to stay effective against evolving threats:

#### **Every 3-6 Months (Regular Updates)**

- Review AI/ML crawler landscape for new models
- Check for new scraping tools and services
- Update security scanner signatures
- Validate search engine crawler changes

#### **As Needed (Emergency Updates)**

- New major AI releases (GPT models, AI assistants)
- Security alerts about new vulnerability scanners
- Unusual traffic patterns from unknown user agents
- Industry security advisories

#### **Monitoring Recommendations**

- **Log Analysis**: Regularly review CloudWatch logs for blocked requests

```bash
# Monitor blocked bot requests
sam logs -n CountVisitsFunction --filter "Blocked bot request" --tail

# Look for new unknown patterns
sam logs -n CountVisitsFunction --filter "user-agent" --tail
```

- **Traffic Monitoring**: Watch for unusual spikes or new user agent patterns

- **Security Intelligence**: Follow these resources for updates:

  - [DataDome Bot Database](https://datadome.co/bot-management-protection/crawlers-list/)
  - [Human Security Bot Guide](https://www.humansecurity.com/learn/blog/crawlers-list-known-bots-guide/)
  - Security communities (Reddit r/cybersecurity, InfoSec Twitter)
  - AWS Security Blog for threat intelligence

- **Automated Alerts**: CloudWatch alarms could be set up for:

  - Unusual request volume spikes
  - High number of blocked requests
  - New user agent patterns

#### **Alternative: AWS WAF Bot Control**

AWS offers managed bot protection through WAF Bot Control with ML-powered detection and zero maintenance. However, for this small-scale visit tracking API, the custom approach provides better cost efficiency and learning value while meeting all security requirements.

#### **Version Control for Bot Patterns**

Consider maintaining bot patterns in a separate configuration file:

```javascript
// config/bot-patterns.js
export const BOT_PATTERNS_VERSION = "2025.10";
export const LAST_UPDATED = "2025-10-26";

export const botPatterns = [
  // ... patterns with comments indicating when added
];
```

This approach allows for:

- ✅ Version tracking of security updates
- ✅ Easier testing of new patterns
- ✅ Rollback capability if issues arise
- ✅ Documentation of when patterns were added

#### **Testing New Patterns**

Before deploying pattern updates:

```bash
# Test with current patterns
npm test

# Deploy to dev environment first
npm run deploy:dev

# Monitor for false positives
# Deploy to production only after validation
npm run deploy:prod
```
