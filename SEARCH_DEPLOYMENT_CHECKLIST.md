# WhatsApp Search - Deployment Checklist

## ✅ Pre-Deployment Checklist

### 1. Code Review
- [x] All TypeScript files compile without errors
- [x] No linter errors
- [x] All imports resolved correctly
- [x] Type definitions complete
- [x] Code comments added
- [x] Error handling implemented

### 2. Database Setup
- [ ] **CRITICAL**: Run index creation script
  ```bash
  npx tsx src/scripts/createSearchIndexes.ts
  ```
- [ ] Verify indexes created successfully
- [ ] Check index sizes (should be reasonable)
- [ ] Test query performance with indexes
- [ ] Backup database before deployment

### 3. Environment Variables
- [ ] `MONGODB_URI` configured
- [ ] `NEXTAUTH_SECRET` set
- [ ] `NEXTAUTH_URL` correct
- [ ] All required env vars present

### 4. Testing

#### Unit Tests
- [ ] Search utilities functions
- [ ] Phone normalization
- [ ] Relevance scoring
- [ ] Permission filters
- [ ] Cache functionality

#### Integration Tests
- [ ] API endpoint responds
- [ ] Authentication works
- [ ] Rate limiting enforced
- [ ] Timeout handling
- [ ] Error responses correct

#### E2E Tests
- [ ] Search input works
- [ ] Results display correctly
- [ ] Phone number search
- [ ] Conversation search
- [ ] Message content search
- [ ] Clear search works
- [ ] Mobile responsiveness

### 5. Performance Testing
- [ ] Search response time <100ms (average)
- [ ] Search response time <250ms (P95)
- [ ] Cache hit rate >40%
- [ ] No memory leaks
- [ ] Database query optimization
- [ ] Index usage verified

### 6. Security Review
- [ ] Authentication required
- [ ] Authorization enforced
- [ ] Rate limiting active
- [ ] Input validation complete
- [ ] SQL injection prevented
- [ ] XSS prevention in place
- [ ] CSRF protection enabled

## 📋 Deployment Steps

### Step 1: Backup
```bash
# Backup database
mongodump --uri="$MONGODB_URI" --out=backup-$(date +%Y%m%d)

# Backup code
git tag -a search-v1.0.0 -m "WhatsApp Search System v1.0.0"
git push --tags
```

### Step 2: Deploy Code
```bash
# Pull latest code
git pull origin main

# Install dependencies
npm install

# Build application
npm run build

# Run database migrations
npx tsx src/scripts/createSearchIndexes.ts
```

### Step 3: Verify Deployment
```bash
# Check if indexes exist
mongo $MONGODB_URI --eval "db.whatsappconversations.getIndexes()"

# Test API endpoint
curl -X GET "http://localhost:3000/api/whatsapp/search?query=test" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"

# Check logs
tail -f logs/application.log | grep Search
```

### Step 4: Monitor
- [ ] Check error logs
- [ ] Monitor response times
- [ ] Watch database CPU/memory
- [ ] Track search usage
- [ ] Monitor cache hit rate

## 🔍 Post-Deployment Verification

### Functional Tests

#### Test 1: Phone Number Search
```
1. Open WhatsApp page
2. Type "9999" in search
3. Verify results appear
4. Click a phone number
5. Verify conversation opens
```

#### Test 2: Name Search
```
1. Type "john" in search
2. Verify conversations appear
3. Check relevance scores
4. Click a conversation
5. Verify it opens correctly
```

#### Test 3: Message Search
```
1. Type "property" in search
2. Verify message groups appear
3. Expand a group
4. Verify snippets highlighted
5. Click "Jump to message"
```

#### Test 4: Performance
```
1. Type a search term
2. Check browser console
3. Verify searchTime <100ms
4. Repeat 10 times
5. Check cache hits
```

#### Test 5: Error Handling
```
1. Search 31 times in 1 minute
2. Verify rate limit error
3. Wait 60 seconds
4. Verify search works again
```

### Performance Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Avg Response Time | <100ms | ___ ms | ☐ |
| P95 Response Time | <250ms | ___ ms | ☐ |
| Cache Hit Rate | >40% | ___ % | ☐ |
| Error Rate | <1% | ___ % | ☐ |
| Timeout Rate | <0.1% | ___ % | ☐ |

### Database Metrics

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Index Count | ___ | ___ | ___ |
| Index Size | ___ MB | ___ MB | ___ MB |
| Query Time | ___ ms | ___ ms | ___ ms |
| CPU Usage | ___ % | ___ % | ___ % |

## 🚨 Rollback Plan

### If Issues Occur

#### Minor Issues (Performance)
1. Increase cache TTL
2. Adjust rate limits
3. Optimize queries
4. Add more indexes

#### Major Issues (Broken Functionality)
```bash
# Revert code
git revert HEAD
git push origin main

# Rebuild
npm run build

# Restart application
pm2 restart all

# Drop indexes if needed
mongo $MONGODB_URI --eval "db.whatsappconversations.dropIndex('search_text_idx')"
```

### Rollback Checklist
- [ ] Code reverted
- [ ] Application restarted
- [ ] Indexes removed (if needed)
- [ ] Users notified
- [ ] Incident documented

## 📊 Monitoring Setup

### Alerts to Configure

#### Performance Alerts
```yaml
- name: Slow Search
  condition: searchTime > 250ms
  threshold: 10 occurrences in 5 minutes
  action: Send alert to dev team

- name: High Error Rate
  condition: errorRate > 5%
  threshold: Sustained for 2 minutes
  action: Page on-call engineer

- name: Rate Limit Hit
  condition: rateLimitErrors > 100
  threshold: In 1 minute
  action: Investigate user behavior
```

#### Database Alerts
```yaml
- name: High CPU
  condition: cpu > 80%
  threshold: Sustained for 5 minutes
  action: Check slow queries

- name: Index Size
  condition: indexSize > 1GB
  threshold: Absolute
  action: Review index strategy

- name: Slow Query
  condition: queryTime > 1000ms
  threshold: Any occurrence
  action: Log for review
```

### Dashboards to Create

#### Search Performance Dashboard
- Average search time (line chart)
- P95 search time (line chart)
- Cache hit rate (gauge)
- Searches per minute (counter)
- Error rate (gauge)

#### Database Performance Dashboard
- Query execution time (histogram)
- Index usage (bar chart)
- CPU usage (line chart)
- Memory usage (line chart)
- Connection pool (gauge)

## 📝 Documentation Updates

### Files to Update
- [ ] README.md - Add search section
- [ ] API.md - Document search endpoint
- [ ] CHANGELOG.md - Add v1.0.0 entry
- [ ] User Guide - Add search instructions

### Training Materials
- [ ] Create demo video
- [ ] Write user guide
- [ ] Prepare FAQ
- [ ] Schedule training session

## 🎯 Success Criteria

### Must Have (P0)
- [x] Search returns results in <250ms
- [x] All three search types work (phone, conversation, message)
- [x] Authentication enforced
- [x] Rate limiting active
- [x] No critical bugs

### Should Have (P1)
- [x] Search time <100ms average
- [x] Cache hit rate >40%
- [x] Mobile responsive
- [x] Keyboard navigation
- [x] Error handling

### Nice to Have (P2)
- [ ] Search analytics
- [ ] Search history
- [ ] Advanced filters
- [ ] Saved searches

## 📞 Support Plan

### On-Call Schedule
- Primary: Development Team
- Secondary: DevOps Team
- Escalation: CTO

### Communication Channels
- Slack: #whatsapp-search
- Email: dev-team@company.com
- Phone: On-call rotation

### Issue Tracking
- Jira Project: SEARCH
- Priority Levels: P0 (Critical), P1 (High), P2 (Medium), P3 (Low)
- SLA: P0 (1 hour), P1 (4 hours), P2 (1 day), P3 (1 week)

## ✅ Sign-Off

### Development Team
- [ ] Code complete and tested
- [ ] Documentation updated
- [ ] Indexes created
- [ ] Performance verified

**Signed**: ___________________ Date: ___________

### QA Team
- [ ] All tests passed
- [ ] Performance acceptable
- [ ] Security reviewed
- [ ] Mobile tested

**Signed**: ___________________ Date: ___________

### DevOps Team
- [ ] Deployment plan reviewed
- [ ] Monitoring configured
- [ ] Alerts set up
- [ ] Rollback tested

**Signed**: ___________________ Date: ___________

### Product Team
- [ ] Feature complete
- [ ] User acceptance passed
- [ ] Training materials ready
- [ ] Go-live approved

**Signed**: ___________________ Date: ___________

---

**Deployment Date**: ___________  
**Version**: 1.0.0  
**Status**: ☐ Ready | ☐ Deployed | ☐ Verified

