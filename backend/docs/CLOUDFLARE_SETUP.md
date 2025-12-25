# Cloudflare CDN Setup Guide

## Overview

This guide walks you through setting up **Cloudflare as a CDN** in front of your backend API and (future) frontend application.

## Architecture

```
User Request
    ↓
Cloudflare CDN (Global Edge Network)
    ↓ (cache miss or dynamic)
NGINX (Your Server)
    ↓
Backend API (NestJS)
    ↓
PostgreSQL + Redis
```

**Benefits**:

- ⚡ **Faster** - Content served from 300+ global edge locations
- 🛡️ **DDoS Protection** - Cloudflare absorbs attacks
- 💰 **Bandwidth Savings** - Static assets never hit your server
- 🔒 **SSL/TLS** - Free SSL certificates
- 🚀 **Performance** - HTTP/3, Brotli compression, image optimization

---

## Step-by-Step Setup

### 1. Create Cloudflare Account

1. Go to https://dash.cloudflare.com/sign-up
2. Sign up with your email
3. Verify your email

**Free Plan Includes**:

- Unlimited bandwidth
- Global CDN
- DDoS protection
- Free SSL certificate
- Basic firewall rules

---

### 2. Add Your Domain

1. Click **"Add a Site"**
2. Enter your domain: `yourdomain.com`
3. Select **Free Plan**
4. Click **"Continue"**

Cloudflare will scan your existing DNS records.

---

### 3. Update DNS Records

**Current Setup** (example):

```
Type    Name    Content            Proxy Status
A       @       YOUR_SERVER_IP     DNS Only
A       www     YOUR_SERVER_IP     DNS Only
```

**Update to**:

```
Type    Name    Content            Proxy Status
A       @       YOUR_SERVER_IP     Proxied (orange cloud)
A       www     YOUR_SERVER_IP     Proxied (orange cloud)
A       api     YOUR_SERVER_IP     Proxied (orange cloud)
```

**Important**:

- Click the **orange cloud icon** to enable proxying (CDN)
- Gray cloud = DNS only (no CDN)
- Orange cloud = CDN enabled ✅

**API Subdomain** (recommended):

```
Type    Name    Content            Proxy Status
A       api     YOUR_SERVER_IP     Proxied
```

This gives you:

- `https://yourdomain.com` → Frontend
- `https://api.yourdomain.com` → Backend API

---

### 4. Update Nameservers

Cloudflare will provide **2 nameservers**:

```
kip.ns.cloudflare.com
uma.ns.cloudflare.com
```

**Update at your domain registrar** (GoDaddy, Namecheap, etc.):

1. Log in to your domain registrar
2. Find **DNS / Nameserver settings**
3. Replace existing nameservers with Cloudflare's
4. Save changes

**Propagation time**: 2-48 hours (usually <2 hours)

---

### 5. Configure SSL/TLS

**Go to**: SSL/TLS → Overview

**Select**: **Full (strict)**

```
┌──────────┐   HTTPS   ┌────────────┐   HTTPS   ┌─────────┐
│  User    │ ────────> │ Cloudflare │ ────────> │  Your   │
└──────────┘           └────────────┘           │ Server  │
                                                 └─────────┘
```

**SSL Modes**:

- ❌ **Off** - No encryption (never use)
- ❌ **Flexible** - User→CF encrypted, CF→Server unencrypted
- ⚠️ **Full** - Encrypted, but allows self-signed certs
- ✅ **Full (strict)** - Encrypted with valid certificate (recommended)

**Generate Origin Certificate** (for your server):

1. Go to **SSL/TLS → Origin Server**
2. Click **"Create Certificate"**
3. Select:
   - **Let Cloudflare generate a private key**
   - **15 years** validity
   - Hostnames: `yourdomain.com`, `*.yourdomain.com`
4. Click **"Create"**

5. **Save both files on your server**:

   ```bash
   # On your server
   mkdir -p /etc/nginx/ssl

   # Save origin certificate
   nano /etc/nginx/ssl/cloudflare-origin.pem
   # Paste the certificate

   # Save private key
   nano /etc/nginx/ssl/cloudflare-origin.key
   # Paste the private key

   chmod 600 /etc/nginx/ssl/cloudflare-origin.key
   ```

6. **Update NGINX SSL config**:
   ```nginx
   ssl_certificate /etc/nginx/ssl/cloudflare-origin.pem;
   ssl_certificate_key /etc/nginx/ssl/cloudflare-origin.key;
   ```

---

### 6. Configure Caching Rules

**Go to**: Caching → Configuration

#### Cache Level: Standard

**Page Rules** (create 3 rules):

**Rule 1: Cache Static Assets**

```
URL: *yourdomain.com/*.jpg
      *yourdomain.com/*.png
      *yourdomain.com/*.gif
      *yourdomain.com/*.css
      *yourdomain.com/*.js
      *yourdomain.com/*.svg
      *yourdomain.com/*.woff*

Settings:
- Cache Level: Cache Everything
- Edge Cache TTL: 1 month
- Browser Cache TTL: 1 year
```

**Rule 2: Bypass Cache for API (dynamic routes)**

```
URL: *api.yourdomain.com/auth/*
     *api.yourdomain.com/2fa/*
     *api.yourdomain.com/users/*

Settings:
- Cache Level: Bypass
```

**Rule 3: Cache Public API Responses** (optional)

```
URL: *api.yourdomain.com/health
     *api.yourdomain.com/public/*

Settings:
- Cache Level: Cache Everything
- Edge Cache TTL: 5 minutes
```

**Browser Cache TTL**: Respect Existing Headers

---

### 7. Configure Security Settings

#### **A. Firewall Rules**

**Go to**: Security → WAF

**Create Rule**: Block Bad Bots

```
Field: Known Bots
Operator: equals
Value: Off
Action: Block
```

**Create Rule**: Rate Limiting (Pro plan feature, or use NGINX)

```
Field: Incoming Requests
Operator: exceeds
Value: 100 requests per 10 seconds
Action: Challenge
```

#### **B. Security Level**

**Go to**: Security → Settings

**Security Level**: Medium

Options:

- Essentially Off
- Low
- **Medium** ✅ (recommended)
- High
- I'm Under Attack

#### **C. Bot Fight Mode**

**Go to**: Security → Bots

Enable **Bot Fight Mode** (Free)

This blocks known bad bots automatically.

---

### 8. Performance Optimization

#### **A. Auto Minify**

**Go to**: Speed → Optimization

Enable:

- ✅ JavaScript
- ✅ CSS
- ✅ HTML

#### **B. Brotli Compression**

**Go to**: Speed → Optimization

Enable: ✅ Brotli

#### **C. Early Hints**

**Go to**: Speed → Optimization

Enable: ✅ Early Hints (HTTP 103)

#### **D. HTTP/3 (QUIC)**

**Go to**: Network

Enable: ✅ HTTP/3 (with QUIC)

---

### 9. Configure CORS for API

**In your backend** (`src/main.ts`):

```typescript
app.enableCors({
  origin: [
    "https://yourdomain.com",
    "https://www.yourdomain.com",
    "https://app.yourdomain.com",
  ],
  credentials: false,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  maxAge: 3600,
});
```

---

### 10. Test CDN Setup

#### **A. Check DNS Propagation**

```bash
# Check if pointing to Cloudflare
nslookup yourdomain.com

# Should show Cloudflare IPs:
# 104.21.x.x or 172.67.x.x
```

#### **B. Test HTTPS**

```bash
curl -I https://api.yourdomain.com/health

# Should see:
# CF-Cache-Status: DYNAMIC (for API)
# CF-RAY: xxx-xxx (Cloudflare identifier)
# Server: cloudflare
```

#### **C. Test Caching**

```bash
# First request (cache miss)
curl -I https://yourdomain.com/logo.png
# CF-Cache-Status: MISS

# Second request (cache hit)
curl -I https://yourdomain.com/logo.png
# CF-Cache-Status: HIT ✅
```

#### **D. SSL Test**

Visit: https://www.ssllabs.com/ssltest/analyze.html?d=yourdomain.com

Should get: **A+ rating**

---

## Cloudflare Dashboard Overview

### Key Metrics to Monitor

**Go to**: Analytics → Traffic

Monitor:

- **Requests** - Total requests served
- **Bandwidth** - Data transferred
- **Cached Requests** - % served from edge
- **Response Time** - Latency improvement
- **Threats Blocked** - Security events

**Good Targets**:

- Cached Requests: >70% for static sites, >30% for APIs
- Bandwidth Saved: >60%
- Threats Blocked: Varies by traffic

---

## Environment-Specific Configuration

### Development

```env
# .env.development
NODE_ENV=development
BACKEND_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Staging

```env
# .env.staging
NODE_ENV=staging
BACKEND_URL=https://api-staging.yourdomain.com
FRONTEND_URL=https://staging.yourdomain.com
CORS_ORIGINS=https://staging.yourdomain.com
```

### Production

```env
# .env.production
NODE_ENV=production
BACKEND_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com,https://app.yourdomain.com
```

---

## Troubleshooting

### Issue: SSL Certificate Errors

**Problem**: "Your connection is not private"

**Solution**:

1. Check SSL mode is **Full (strict)**
2. Verify origin certificate is installed on server
3. Restart NGINX: `docker-compose restart nginx`
4. Wait 5 minutes for propagation

### Issue: CORS Errors

**Problem**: "No 'Access-Control-Allow-Origin' header"

**Solution**:

1. Check backend CORS configuration
2. Verify domain in allowed origins
3. Check if request has `Authorization` header
4. Add `credentials: false` in backend

### Issue: API Responses Being Cached

**Problem**: Stale data being served

**Solution**:

1. Add Page Rule to bypass cache for `/auth/*`, `/2fa/*`, `/users/*`
2. Add `Cache-Control: no-cache, private` header in backend
3. Purge cache: Caching → Configuration → Purge Everything

### Issue: Slow Performance

**Problem**: CDN not helping

**Solution**:

1. Check if orange cloud is enabled (proxied)
2. Verify cache hit ratio in analytics
3. Enable Brotli compression
4. Enable HTTP/3
5. Check backend response times (not CDN issue if backend is slow)

### Issue: Real IP Not Detected

**Problem**: All requests show Cloudflare IPs

**Solution**:
Already configured in `nginx.conf`:

```nginx
real_ip_header CF-Connecting-IP;
```

Backend will see real user IPs via `CF-Connecting-IP` header.

---

## Cache Purging

### Purge Entire Cache

1. Go to **Caching → Configuration**
2. Click **"Purge Everything"**
3. Confirm

### Purge Specific Files

1. Go to **Caching → Configuration**
2. Click **"Custom Purge"**
3. Enter URLs to purge:
   ```
   https://yourdomain.com/logo.png
   https://yourdomain.com/style.css
   ```
4. Click **"Purge"**

### Purge via API

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/ZONE_ID/purge_cache" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

---

## Advanced Features (Pro Plan)

### Image Optimization

- **Polish**: Automatic image compression (WebP, AVIF)
- **Mirage**: Lazy loading for images

### Argo Smart Routing

- Optimizes routing across Cloudflare network
- ~30% faster on average
- $5/month + $0.10 per GB

### Load Balancing

- Distribute traffic across multiple origins
- Health checks
- Failover
- $5/month per pool

---

## Monitoring & Alerts

### Set Up Notifications

**Go to**: Notifications

**Create Alert**:

1. **DDoS Attack Detected**
   - Action: Send email
2. **Traffic Spike**

   - Trigger: Requests > 10,000/hour
   - Action: Send email

3. **Origin Error Rate**
   - Trigger: Error rate > 5%
   - Action: Send email

---

## Security Best Practices

### ✅ Enable

- SSL/TLS Full (strict)
- HTTP Strict Transport Security (HSTS)
- Always Use HTTPS
- Automatic HTTPS Rewrites
- Bot Fight Mode
- Email Obfuscation

### ❌ Disable (for APIs)

- Rocket Loader (breaks AJAX)
- Auto Minify for JSON responses

### 🔍 Monitor

- Firewall events
- Bot traffic
- Threat analytics
- Error rates

---

## Cost Breakdown

### Free Plan (Current)

- ✅ Unlimited bandwidth
- ✅ Unlimited requests
- ✅ Free SSL
- ✅ DDoS protection
- ✅ Global CDN
- ✅ Page Rules: 3

### Pro Plan ($20/month)

- Everything in Free +
- ✅ Image optimization
- ✅ Mobile optimization
- ✅ Page Rules: 20
- ✅ Smarter tiered cache

### Business Plan ($200/month)

- Everything in Pro +
- ✅ 100% uptime SLA
- ✅ Priority support
- ✅ Custom SSL

**Recommendation**: Start with **Free Plan**, upgrade only if needed.

---

## Integration Checklist

- [ ] Domain added to Cloudflare
- [ ] Nameservers updated
- [ ] DNS records configured (orange cloud enabled)
- [ ] SSL mode set to Full (strict)
- [ ] Origin certificate installed on server
- [ ] Page rules configured (cache/bypass)
- [ ] CORS configured in backend
- [ ] Real IP detection configured in NGINX
- [ ] Cache headers added to responses
- [ ] Performance optimizations enabled
- [ ] Security settings configured
- [ ] SSL test passed (A+ rating)
- [ ] Cache test passed (HIT status)
- [ ] Monitoring/alerts set up

---

## Related Documentation

- [SECURITY.md](backend/SECURITY.md) - Security implementation
- [MONITORING.md](backend/MONITORING.md) - Monitoring setup
- [CI_CD.md](CI_CD.md) - CI/CD pipeline

---

## Support

**Cloudflare Documentation**: https://developers.cloudflare.com/
**Community**: https://community.cloudflare.com/
**Status Page**: https://www.cloudflarestatus.com/

---

**Status**: 🟢 Ready for Production

**Last Updated**: 2025-12-24
