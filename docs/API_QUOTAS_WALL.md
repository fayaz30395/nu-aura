# Wall API Quotas and Limitations

This document outlines the rate limits, pagination constraints, and request size limitations for the Wall API endpoints.

## Rate Limiting

The Wall API implements token bucket rate limiting using Bucket4j to prevent abuse and ensure fair usage.

### Wall Endpoints Rate Limits

**Endpoint Pattern:** `/api/v1/wall/**`

**Limits:**
- **Capacity:** 30 requests
- **Refill Rate:** 30 tokens per minute
- **Per:** User (identified by tenant ID + user ID)

**Configuration:**
```yaml
app:
  rate-limit:
    wall:
      capacity: 30              # Maximum burst requests
      refill-tokens: 30         # Tokens added per refill period
      refill-minutes: 1         # Refill period in minutes
```

**Environment Variables:**
- `RATE_LIMIT_WALL_CAPACITY` - Override capacity (default: 30)
- `RATE_LIMIT_WALL_REFILL` - Override refill tokens (default: 30)
- `RATE_LIMIT_WALL_REFILL_MIN` - Override refill period in minutes (default: 1)

### Rate Limit Response

When rate limit is exceeded, the API returns:

**Status Code:** `429 Too Many Requests`

**Response Body:**
```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Please try again later.",
  "status": 429
}
```

**Response Headers:**
- `X-RateLimit-Remaining` - Number of remaining requests (when auth endpoint)
- `Retry-After` - Seconds until rate limit resets (general rate limiting)

## Pagination Limits

All paginated Wall endpoints enforce maximum page size limits to prevent excessive data retrieval.

### Posts Endpoints

**Endpoints:**
- `GET /api/v1/wall/posts`
- `GET /api/v1/wall/posts/type/{type}`
- `GET /api/v1/wall/praise/employee/{employeeId}`

**Limits:**
- **Default Page Size:** 10
- **Maximum Page Size:** 50

**Parameters:**
- `page` - Page number (0-indexed, default: 0)
- `size` - Page size (max: 50, default: 10)
- `sort` - Sort field and direction (default: createdAt,desc)

**Example Request:**
```
GET /api/v1/wall/posts?page=0&size=20&sort=createdAt,desc
```

**Enforcement:**
If a request specifies `size > 50`, it will be automatically capped at 50.

### Comments Endpoints

**Endpoints:**
- `GET /api/v1/wall/posts/{postId}/comments`

**Limits:**
- **Default Page Size:** 20
- **Maximum Page Size:** 50

**Parameters:**
- `page` - Page number (0-indexed, default: 0)
- `size` - Page size (max: 50, default: 20)
- `sort` - Sort field and direction (default: createdAt,asc)

**Example Request:**
```
GET /api/v1/wall/posts/{postId}/comments?page=0&size=20&sort=createdAt,asc
```

**Enforcement:**
If a request specifies `size > 50`, it will be automatically capped at 50.

## Request Size Limits

Content size validation is enforced at the DTO level using Jakarta Bean Validation.

### Post Content

**Endpoint:** `POST /api/v1/wall/posts`

**Content Limits:**
- **Minimum Length:** 1 character (required)
- **Maximum Length:** 5000 characters

**Poll Options:**
- **Minimum Options:** 2
- **Maximum Options:** 10

**Validation Response:**

If content exceeds limits, the API returns:

**Status Code:** `400 Bad Request`

**Response Body:**
```json
{
  "status": 400,
  "message": "Validation failed",
  "errors": {
    "content": "Content must be less than 5000 characters"
  }
}
```

### Comment Content

**Endpoint:** `POST /api/v1/wall/posts/{postId}/comments`

**Content Limits:**
- **Minimum Length:** 1 character (required)
- **Maximum Length:** 2000 characters

**Validation Response:**

If content exceeds limits, the API returns:

**Status Code:** `400 Bad Request`

**Response Body:**
```json
{
  "status": 400,
  "message": "Validation failed",
  "errors": {
    "content": "Comment must be less than 2000 characters"
  }
}
```

## Overall API Limits Comparison

| Endpoint Type | Rate Limit | Refill Period | Scope |
|--------------|------------|---------------|-------|
| Auth (`/api/v1/auth/**`) | 10 requests | 1 minute | Per IP |
| Wall (`/api/v1/wall/**`) | 30 requests | 1 minute | Per User |
| General API (`/api/**`) | 100 requests | 1 minute | Per User |
| Export | 5 requests | 5 minutes | Per User |

## Best Practices

### For Frontend Integration

1. **Handle 429 Responses:**
   - Implement exponential backoff
   - Show user-friendly error messages
   - Use the `Retry-After` header to determine when to retry

2. **Optimize Pagination:**
   - Use the default page sizes when possible
   - Don't request more data than needed for the UI
   - Cache paginated data on the client side

3. **Content Validation:**
   - Validate content length on the frontend before submission
   - Show character counters for post/comment inputs
   - Display validation errors clearly to users

### For API Consumers

1. **Rate Limit Awareness:**
   - Monitor rate limit headers in responses
   - Implement client-side rate limiting
   - Batch operations when possible

2. **Efficient Pagination:**
   - Request only the page size you need
   - Implement infinite scrolling or "Load More" patterns
   - Cache results to avoid redundant requests

3. **Content Size:**
   - Validate content size before sending requests
   - Split very long content into multiple posts if needed
   - Compress media before uploading

## Configuration Reference

### Application Configuration

All limits are configurable via `application.yml`:

```yaml
app:
  rate-limit:
    wall:
      capacity: 30
      refill-tokens: 30
      refill-minutes: 1

  pagination:
    max-page-size: 100
    default-page-size: 20
    wall-comments-max-size: 50
    wall-posts-max-size: 50
```

### Environment Variables

Override configuration via environment variables for different environments:

```bash
# Rate Limiting
export RATE_LIMIT_WALL_CAPACITY=30
export RATE_LIMIT_WALL_REFILL=30
export RATE_LIMIT_WALL_REFILL_MIN=1

# Pagination
export PAGINATION_MAX_SIZE=100
export PAGINATION_DEFAULT_SIZE=20
export PAGINATION_WALL_COMMENTS_MAX=50
export PAGINATION_WALL_POSTS_MAX=50
```

## Monitoring and Alerts

### Recommended Metrics

1. **Rate Limit Hits:**
   - Track 429 responses by endpoint
   - Alert when rate limit hit rate exceeds threshold
   - Monitor top clients hitting rate limits

2. **Page Size Usage:**
   - Track average page size requested
   - Identify clients requesting maximum page sizes
   - Optimize defaults based on usage patterns

3. **Content Size:**
   - Monitor average content length
   - Track validation errors
   - Identify potential abuse patterns

## Security Considerations

1. **Rate Limiting by User:**
   - Wall endpoints use tenant ID + user ID for rate limiting
   - Prevents single user from overwhelming the system
   - Isolated per tenant for multi-tenancy

2. **Content Validation:**
   - All content is validated server-side
   - Size limits prevent database bloat
   - Protection against DoS via large payloads

3. **Pagination Enforcement:**
   - Server-side enforcement prevents circumvention
   - Protects against excessive data retrieval
   - Maintains consistent performance

## Troubleshooting

### Common Issues

**Issue:** Getting 429 responses frequently

**Solutions:**
- Reduce request frequency
- Implement client-side rate limiting
- Use pagination more effectively
- Check for duplicate or unnecessary requests

**Issue:** Content validation errors

**Solutions:**
- Validate content length before submission
- Check for hidden characters or formatting
- Ensure content encoding is correct

**Issue:** Pagination returning fewer results than expected

**Solutions:**
- Check if page size is being capped at maximum
- Verify total elements count in response
- Ensure filters aren't reducing result set

## Support and Contact

For questions or issues related to API quotas and limitations:
- Review this documentation
- Check application logs for detailed error messages
- Contact the backend team for quota increases
- Submit issues via the project issue tracker
