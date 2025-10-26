import { jest } from '@jest/globals';
import type { APIGatewayProxyEvent } from 'aws-lambda';

// Set environment variables before importing the handler
process.env.VISITS_BUCKET = 'test-visit-count-bucket';
process.env.ALLOWED_ORIGINS = 'https://allowed-site.com,https://example.com';

// Mock AWS SDK using jest.unstable_mockModule (the official way for ES6 modules)
const mockGetObject = jest.fn() as jest.MockedFunction<any>;
const mockPutObject = jest.fn() as jest.MockedFunction<any>;

jest.unstable_mockModule('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(() => ({
    send: jest.fn((command: any) => {
      if (command.constructor.name === 'GetObjectCommand') {
        return mockGetObject(command);
      }
      if (command.constructor.name === 'PutObjectCommand') {
        return mockPutObject(command);
      }
      return Promise.resolve({});
    })
  })),
  GetObjectCommand: jest.fn((params: any) => ({ ...params, constructor: { name: 'GetObjectCommand' } })),
  PutObjectCommand: jest.fn((params: any) => ({ ...params, constructor: { name: 'PutObjectCommand' } }))
}));

// Import handler after mocking (required for ES6 module mocking)
const { countVisits } = await import('../../src/handler.js');

describe('Count Visits Lambda Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock for GetObject (file doesn't exist)
    mockGetObject.mockRejectedValue({ 
      name: 'NoSuchKey',
      message: 'The specified key does not exist.'
    });
    
    // Default mock for PutObject
    mockPutObject.mockResolvedValue({});
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'GET',
        path: '/health',
        headers: {
          origin: 'https://allowed-site.com'
        },
        requestContext: {
          identity: {
            sourceIp: '127.0.0.1'
          }
        } as any
      };

      const result = await countVisits(event as APIGatewayProxyEvent, {} as any);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String)
      });
    });
  });

  describe('Enhanced Security Validation', () => {
    it('should block unauthorized origin', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        headers: {
          origin: 'https://malicious-site.com',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        requestContext: {
          identity: {
            sourceIp: '192.168.1.1'
          }
        } as any
      };

      const result = await countVisits(event as APIGatewayProxyEvent, {} as any);

      expect(result.statusCode).toBe(403);
      expect(JSON.parse(result.body)).toMatchObject({
        error: 'Origin "https://malicious-site.com" is not authorized'
      });
    });

    it('should allow valid requests', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        headers: {
          origin: 'https://allowed-site.com',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        requestContext: {
          identity: {
            sourceIp: '192.168.1.1'
          }
        } as any
      };

      const result = await countVisits(event as APIGatewayProxyEvent, {} as any);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body).toMatchObject({
        origin: 'https://allowed-site.com',
        count: 1
      });
    });
  });

  describe('Bot Detection', () => {
    it('should block known bot user agents', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        headers: {
          origin: 'https://allowed-site.com',
          'user-agent': 'Googlebot/2.1'
        },
        requestContext: {
          identity: {
            sourceIp: '192.168.1.1'
          }
        } as any
      };

      const result = await countVisits(event as APIGatewayProxyEvent, {} as any);

      expect(result.statusCode).toBe(403);
      expect(JSON.parse(result.body)).toMatchObject({
        error: 'Automated requests not allowed'
      });
    });

    it('should block curl requests', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        headers: {
          origin: 'https://allowed-site.com',
          'user-agent': 'curl/7.68.0'
        },
        requestContext: {
          identity: {
            sourceIp: '192.168.1.1'
          }
        } as any
      };

      const result = await countVisits(event as APIGatewayProxyEvent, {} as any);

      expect(result.statusCode).toBe(403);
      expect(JSON.parse(result.body)).toMatchObject({
        error: 'Automated requests not allowed'
      });
    });
  });

  describe('CORS Handling', () => {
    it('should handle OPTIONS preflight requests', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'OPTIONS',
        headers: {
          origin: 'https://allowed-site.com'
        },
        requestContext: {
          identity: {
            sourceIp: '127.0.0.1'
          }
        } as any
      };

      const result = await countVisits(event as APIGatewayProxyEvent, {} as any);

      expect(result.statusCode).toBe(200);
      expect(result.headers!['Access-Control-Allow-Origin']).toBe('*');
      expect(result.headers!['Access-Control-Allow-Methods']).toBe('POST, OPTIONS');
    });

    it('should include CORS headers in responses', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        headers: {
          origin: 'https://allowed-site.com',
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        requestContext: {
          identity: {
            sourceIp: '192.168.1.1'
          }
        } as any
      };

      const result = await countVisits(event as APIGatewayProxyEvent, {} as any);

      expect(result.headers).toMatchObject({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing origin header', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        headers: {
          'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        requestContext: {
          identity: {
            sourceIp: '192.168.1.1'
          }
        } as any
      };

      const result = await countVisits(event as APIGatewayProxyEvent, {} as any);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toMatchObject({
        error: 'Missing origin header'
      });
    });

    it('should handle missing user agent', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        headers: {
          origin: 'https://allowed-site.com'
        },
        requestContext: {
          identity: {
            sourceIp: '192.168.1.1'
          }
        } as any
      };

      const result = await countVisits(event as APIGatewayProxyEvent, {} as any);

      expect(result.statusCode).toBe(403);
      expect(JSON.parse(result.body)).toMatchObject({
        error: 'Invalid user agent'
      });
    });
  });
});
