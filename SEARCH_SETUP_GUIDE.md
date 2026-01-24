# WhatsApp Search - Quick Setup Guide

## 🚀 5-Minute Setup

### Step 1: Create Database Indexes (Required)

```bash
npx tsx src/scripts/createSearchIndexes.ts
```

**Expected Output**:
```
✅ Connected to MongoDB
✅ Text search index created
✅ Phone number index created
✅ Permission + sort index created
✅ All search indexes created successfully!
```

### Step 2: Verify Installation

All files are already in place:
- ✅ API Route: `/api/whatsapp/search/route.ts`
- ✅ Search Utils: `/lib/whatsapp/searchUtils.ts`
- ✅ React Hook: `/hooks/useWhatsAppSearch.ts`
- ✅ UI Component: `/components/SearchResults.tsx`
- ✅ Integration: `ConversationSidebar.tsx` (modified)

### Step 3: Test the Search

1. Open your WhatsApp page: `http://localhost:3000/whatsapp`
2. Click on the search box in the conversation sidebar
3. Type any search term (e.g., "john", "9999", "property")
4. Results appear in real-time!

## ✅ Verification Checklist

- [ ] Database indexes created successfully
- [ ] Search box visible in conversation sidebar
- [ ] Typing shows loading spinner
- [ ] Results appear within 1 second
- [ ] Can click phone number results
- [ ] Can click conversation results
- [ ] Can expand message groups
- [ ] Clear button (X) works
- [ ] Search time shown (<100ms ideal)

## 🎯 Quick Test Cases

### Test 1: Phone Number Search
```
Type: "9999"
Expected: Phone numbers ending in 9999
Action: Click to open conversation or start new chat
```

### Test 2: Name Search
```
Type: "john"
Expected: Conversations with "John" in name
Action: Click to open conversation
```

### Test 3: Message Search
```
Type: "property"
Expected: Messages containing "property"
Action: Click to expand and see snippets
```

## 🐛 Troubleshooting

### Issue: No results found

**Solution 1**: Check if you have conversations
```bash
# In MongoDB shell
db.whatsappconversations.countDocuments()
```

**Solution 2**: Check permissions
- SuperAdmin sees all conversations
- Sales sees only assigned conversations
- Verify your role in the system

### Issue: Search is slow (>1 second)

**Solution 1**: Verify indexes exist
```bash
npx tsx src/scripts/createSearchIndexes.ts
```

**Solution 2**: Check database connection
- Ensure MongoDB is running
- Check network latency
- Monitor database CPU/memory

### Issue: Rate limit error

**Solution**: Wait 1 minute
- Default limit: 30 searches per minute
- Error message: "Rate limit exceeded"
- Automatic reset after 60 seconds

## 📊 Performance Expectations

| Search Type | Expected Time | What It Searches |
|-------------|---------------|------------------|
| Phone Number | <50ms | Exact, suffix, contains matches |
| Conversation | <100ms | Name, phone, notes, tags |
| Message Content | <200ms | All message text & captions |
| Combined (All) | <250ms | All of the above in parallel |

## 🎨 UI Features

### Search Input
- **Placeholder**: "Search or start new chat"
- **Debounce**: 300ms after typing stops
- **Loading**: Spinner on right side
- **Clear**: X button appears when typing

### Results Display
- **Phone Numbers**: Green WhatsApp icon
- **Conversations**: Profile pictures + names
- **Messages**: Grouped by conversation
- **Highlighting**: Yellow background on matched terms
- **Empty State**: "No results found" message

### Interactions
- **Click Phone**: Opens conversation or new chat form
- **Click Conversation**: Opens that conversation
- **Click Message**: Expands to show full snippet
- **Keyboard**: Arrow keys to navigate, Enter to select, Escape to clear

## 🔒 Security & Permissions

### Who Can Search What?

**SuperAdmin**:
- ✅ All conversations
- ✅ All messages
- ✅ All phone numbers

**Sales-TeamLead**:
- ✅ Assigned conversations
- ✅ Conversations in their location
- ✅ Messages in accessible conversations

**Sales**:
- ✅ Only assigned conversations
- ✅ Messages in assigned conversations
- ✅ Phone numbers they have access to

### Rate Limiting

- **Limit**: 30 searches per minute per user
- **Window**: 60 seconds rolling
- **Reset**: Automatic after 1 minute
- **Error**: 429 status code with message

## 💡 Pro Tips

### For Faster Searches

1. **Be specific**: "John Doe" faster than "j"
2. **Use phone numbers**: Most accurate search
3. **Clear when done**: Resets to normal view
4. **Check cache**: Repeated searches are instant

### For Better Results

1. **Try variations**: "property", "properties", "prop"
2. **Use full names**: "John Doe" better than "John"
3. **Include area codes**: "+91" for Indian numbers
4. **Check archived**: Toggle to include archived chats

### For Troubleshooting

1. **Check console**: F12 → Console tab
2. **Look for errors**: Red messages
3. **Check network**: Network tab → search requests
4. **Verify response**: Should be <1 second

## 📈 Monitoring

### Browser Console

Look for these logs:
```javascript
[Search] { query: "john", searchTime: 87, cached: false }
[Slow Search] { query: "property in bangalore", searchTime: 245 }
```

### Performance Metrics

Check in browser DevTools:
- **Network tab**: Request time
- **Console**: Search time in ms
- **Performance tab**: Component render time

### Database Monitoring

```bash
# Check slow queries
db.setProfilingLevel(2)
db.system.profile.find().sort({ts:-1}).limit(10)
```

## 🆘 Getting Help

### Documentation
1. `WHATSAPP_SEARCH_SYSTEM.md` - Complete documentation
2. `SEARCH_IMPLEMENTATION_SUMMARY.md` - Implementation details
3. Code comments - Inline explanations

### Common Issues

**"No results found"**
- Check if conversations exist
- Verify user permissions
- Try different search terms

**"Rate limit exceeded"**
- Wait 60 seconds
- Reduce search frequency
- Contact admin to increase limit

**"Search timeout"**
- Query too complex
- Database overloaded
- Try simpler search term

### Contact Support

If issues persist:
1. Check documentation files
2. Review code comments
3. Check browser console
4. Monitor database logs
5. Contact development team

## ✨ What's Next?

### Immediate Actions
1. ✅ Run index creation script
2. ✅ Test search functionality
3. ✅ Verify performance
4. ✅ Train users

### Future Enhancements
- [ ] Search history
- [ ] Saved searches
- [ ] Advanced filters
- [ ] Fuzzy matching
- [ ] Search analytics

---

**Setup Time**: ~5 minutes  
**Difficulty**: Easy  
**Status**: Ready to use  
**Support**: See documentation files

