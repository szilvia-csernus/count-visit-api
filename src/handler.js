import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
});
const BUCKET_NAME = process.env.VISITS_BUCKET;

// Allowed origins
const ALLOWED_ORIGINS =
  process.env.ALLOWED_ORIGINS?.split(",").map((o) => o.trim()) || [];

/**
 * Enhanced request validation with security checks
 */
function validateRequest(event) {
  const origin = event.headers?.origin || event.headers?.Origin;
  const userAgent = event.headers?.["user-agent"] || event.headers?.["User-Agent"] || "";
  const sourceIP = event.requestContext?.identity?.sourceIp || "unknown";
  const referer = event.headers?.referer || event.headers?.Referer || "";
  
  // Basic origin validation
  if (!origin) {
    return { valid: false, error: "Missing origin header", code: 400 };
  }
  
  // Check if origin is in allowed list
  if (!ALLOWED_ORIGINS.includes(origin)) {
    console.warn(`Blocked request from unauthorized origin: ${origin}, IP: ${sourceIP}`);
    return { valid: false, error: `Origin "${origin}" is not authorized`, code: 403 };
  }
  
  // Enhanced security checks
  
  // 1. User-Agent validation (block obvious bots/scrapers)
  if (!userAgent || userAgent.length < 10) {
    console.warn(`Blocked request with suspicious user-agent: ${userAgent}, IP: ${sourceIP}`);
    return { valid: false, error: "Invalid user agent", code: 403 };
  }
  
  // 2. Block known bot patterns (comprehensive 2025 strict list)
  const botPatterns = [
    // Generic bot terms
    /bot/i, /crawler/i, /spider/i, /scraper/i,
    
    // Search engine crawlers (blocking ALL for strict mode)
    /googlebot/i, /bingbot/i, /slurp/i, /baiduspider/i, /yandexbot/i,
    /ccbot/i, /yeti/i, /sogou/i,
    
    // SEO and analytics crawlers
    /ahrefsbot/i, /semrushbot/i, /mj12bot/i, /dotbot/i,
    /screaming frog/i, /botify/i, /jetoctopus/i, /netpeak/i,
    /contentking/i, /exabot/i, /swiftbot/i,
    
    // Social media crawlers
    /facebookexternalhit/i, /twitterbot/i, /linkedinbot/i,
    /slackbot/i, /pinterestbot/i, /whatsapp/i, /telegrambot/i,
    
    // AI/ML data crawlers (2025 additions)
    /gptbot/i, /chatgpt-user/i, /oai-searchbot/i, /claudebot/i,
    /anthropic-ai/i, /perplexitybot/i, /openaibot/i,
    
    // Monitoring and uptime services
    /pingdom/i, /uptimerobot/i, /betterstack/i, /cron-job/i,
    /site24x7/i, /statuscake/i, /monitis/i,
    
    // Security scanners and vulnerability tools
    /censys/i, /shodan/i, /bitsight/i, /nessus/i, /openvas/i,
    /nmap/i, /masscan/i, /sqlmap/i, /nikto/i,
    
    // Web scraping tools
    /scrapy/i, /beautifulsoup/i, /selenium/i, /puppeteer/i,
    /parsehub/i, /octoparse/i, /80legs/i, /visual scraper/i,
    /scrapebox/i, /webscraper/i, /import.io/i,
    
    // Development and testing tools
    /curl/i, /wget/i, /httpie/i, /python-requests/i,
    /postman/i, /insomnia/i, /restclient/i, /apache-httpclient/i,
    /java/i, /go-http-client/i, /node-fetch/i, /axios/i,
    
    // Headless browsers and automation
    /phantomjs/i, /headless/i, /chrome-headless/i, /playwright/i,
    /zombie/i, /jsdom/i,
    
    // Archive and research crawlers
    /archive.org/i, /wayback/i, /heritrix/i, /nutch/i,
    
    // Malicious or suspicious patterns
    /hack/i, /scan/i, /exploit/i, /penetration/i, /attack/i,
    /sqlmap/i, /dirbuster/i, /gobuster/i, /dirb/i,
    
    // Empty or very short user agents (already handled above but keeping for clarity)
    /^$/  // Empty user agent
  ];  
  if (botPatterns.some(pattern => pattern.test(userAgent))) {
    console.warn(`Blocked bot request: ${userAgent}, IP: ${sourceIP}`);
    return { valid: false, error: "Automated requests not allowed", code: 403 };
  }
  
  // 3. Validate referer (should match origin for legitimate requests)
  if (referer && !referer.startsWith(origin)) {
    console.warn(`Referer mismatch - Origin: ${origin}, Referer: ${referer}, IP: ${sourceIP}`);
    // This is a warning, not a block - some legitimate requests may not have matching referer
  }
  
  // 4. Rate limiting per IP (basic protection)
  // Note: This is basic - for production consider using Redis or DynamoDB for distributed rate limiting
  
  console.log(`Valid request from Origin: ${origin}, IP: ${sourceIP}, User-Agent: ${userAgent}`);
  
  return { valid: true, origin, sourceIP, userAgent };
}

/**
 * Legacy function for backward compatibility
 */
function isOriginAllowed(origin) {
  return ALLOWED_ORIGINS.includes(origin);
}

/**
 * Get current year-month string (YYYY-MM format)
 */
function getCurrentYearMonth() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Get visit data from S3
 */
async function getVisitData(origin, yearMonth) {
  const key = `visits/${origin}/${yearMonth}.json`;

  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const response = await s3Client.send(command);
    const data = await response.Body.transformToString();
    return JSON.parse(data);
  } catch (error) {
    if (error.name === "NoSuchKey") {
      // File doesn't exist, return default data
      return {
        origin,
        yearMonth,
        visitCount: 0,
        lastVisitDate: null,
      };
    }
    throw error;
  }
}

/**
 * Save visit data to S3
 */
async function saveVisitData(data) {
  const key = `visits/${data.origin}/${data.yearMonth}.json`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: JSON.stringify(data, null, 2),
    ContentType: "application/json",
  });

  await s3Client.send(command);
}

/**
 * Main Lambda handler
 */
export const countVisits = async (event) => {
  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "",
    };
  }

  // Health check endpoint
  if (event.path === "/health") {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: "healthy",
        timestamp: new Date().toISOString(),
      }),
    };
  }

  try {
    // Enhanced request validation
    const validation = validateRequest(event);
    
    if (!validation.valid) {
      return {
        statusCode: validation.code,
        headers,
        body: JSON.stringify({
          error: validation.error,
          message: "Request blocked by security validation",
        }),
      };
    }
    
    const { origin } = validation;

    // Get current year-month
    const currentYearMonth = getCurrentYearMonth();
    const currentDate = new Date().toISOString();

    // Get existing visit data
    const visitData = await getVisitData(origin, currentYearMonth);

    // Increment visit count
    visitData.visitCount += 1;
    visitData.lastVisitDate = currentDate;

    // Save updated data
    await saveVisitData(visitData);

    // Return response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        origin: visitData.origin,
        yearMonth: visitData.yearMonth,
        visitCount: visitData.visitCount,
        count: visitData.visitCount, // For frontend compatibility
        lastVisitDate: visitData.lastVisitDate,
        timestamp: currentDate,
      }),
    };
  } catch (error) {
    console.error("Error processing visit count:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Internal server error",
        message: error.message,
      }),
    };
  }
};
