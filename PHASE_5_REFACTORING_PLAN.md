# Phase 5: Application Refactoring Plan

**Goal**: Replace all direct Supabase dependencies with provider-agnostic storage abstraction layer.

**Duration Estimate**: 8-12 weeks

**Status**: 🟡 In Progress

---

## Dependency Audit Results

### 1. Database Queries (`supabase.from()`)
**Total**: 14 direct calls in 6 files

#### High Priority (User-facing components)
- [ ] `src/components/CreateTicketDialog.tsx` (1 call)
  - Creating new tickets
  - Complexity: Low
  - Est: 1-2 hours

- [ ] `src/components/FilterPresets.tsx` (1 call)
  - Saving filter presets
  - Complexity: Low
  - Est: 1 hour

- [ ] `src/components/InviteTeamMemberDialog.tsx` (1 call)
  - Team invitations
  - Complexity: Low
  - Est: 1 hour

- [ ] `src/components/TicketDetail.tsx` (2 calls)
  - Ticket activities and messages
  - Complexity: Medium
  - Est: 2-3 hours

- [ ] `src/pages/Team.tsx` (7 calls)
  - Team member management
  - Complexity: High (multiple related queries)
  - Est: 4-5 hours

#### Low Priority (Infrastructure)
- [ ] `src/lib/storage/providers/SupabaseProvider.ts` (1 call)
  - Health check
  - Already abstracted, just needs cleanup
  - Est: 30 mins

**Subtotal**: ~12-15 hours

---

### 2. Authentication (`supabase.auth.*`)
**Total**: 57 calls in 23 files

#### Pattern Analysis
- **`supabase.auth.getUser()`**: ~45 calls (most common)
- **`supabase.auth.getSession()`**: ~5 calls
- **`supabase.auth.signInWithPassword()`**: 1 call
- **`supabase.auth.signUp()`**: 1 call
- **`supabase.auth.signOut()`**: 1 call
- **`supabase.auth.onAuthStateChange()`**: 1 call (already abstracted)

#### Strategy
Create a global auth context that wraps the storage provider's auth interface.

**Files Requiring Changes**: 23 files
**Estimated Time**: 20-25 hours (most are simple find-replace)

---

### 3. File Storage (`supabase.storage.*`)
**Total**: 1 call (already abstracted)

✅ **Status**: Complete - Already abstracted in `SupabaseProvider.ts`

---

### 4. Real-time (`supabase.channel()`)
**Total**: 1 call (already abstracted)

✅ **Status**: Complete - Already abstracted in `SupabaseProvider.ts`

---

## Implementation Strategy

### Phase 5.1: Database Query Refactoring (Week 1-2)
**Goal**: Replace all `supabase.from()` calls

#### Approach
1. Create storage hook: `useStorage()` that provides provider access
2. Update components one by one, starting with simplest
3. Test each component after refactoring

#### Implementation Order
1. ✅ **Proof of Concept** - Tickets page (this PR)
2. FilterPresets component
3. CreateTicketDialog component
4. InviteTeamMemberDialog component
5. TicketDetail component
6. Team page (most complex)

**Deliverable**: All database queries use storage abstraction

---

### Phase 5.2: Authentication Refactoring (Week 3-4)
**Goal**: Abstract all authentication calls

#### Approach
1. Create `AuthContext` that wraps storage provider auth
2. Create `useAuth()` hook for easy access
3. Replace all `supabase.auth.*` calls with `useAuth()`

#### Pattern
```typescript
// Before
const { data: { user } } = await supabase.auth.getUser();

// After
const { user } = useAuth();
```

**Deliverable**: All auth calls use abstraction layer

---

### Phase 5.3: File Storage Abstraction (Week 5)
**Goal**: Provider-agnostic file operations

✅ Already complete in `SupabaseProvider.ts`

Additional work:
- [ ] Add support for other storage providers (S3, Azure Blob)
- [ ] Update FileAttachment component to use abstraction

**Deliverable**: File operations work with any storage provider

---

### Phase 5.4: Real-time Updates (Week 6-7)
**Goal**: Polling fallback for providers without real-time

#### Approach
1. Detect if provider supports real-time
2. If yes: use native real-time channels
3. If no: implement polling with configurable interval
4. Graceful degradation with UI indicators

**Deliverable**: Real-time works across all providers

---

### Phase 5.5: Edge Functions Migration (Week 8-12)
**Goal**: Provider-agnostic serverless functions

#### Current Edge Functions
1. `ai-ticket-assistant` - AI ticket analysis
2. `autonomous-ticket-agent` - Automated ticket handling
3. `detect-sensitive-data` - PII detection
4. `mysql-query` - MySQL query execution
5. `postgres-query` - PostgreSQL query execution
6. `process-dsr` - Data subject requests
7. `validate-ip` - IP validation

#### Strategy
**Option A**: Keep as Supabase Edge Functions (recommended)
- Minimal changes needed
- Only available when using Supabase provider
- Other providers can implement as API endpoints

**Option B**: Convert to provider-agnostic API
- Create abstraction for serverless functions
- Each provider implements its own runtime
- More complex but fully portable

**Recommendation**: Option A - Keep edge functions Supabase-specific but make them optional features

**Deliverable**: Application works without edge functions (degraded mode)

---

## Testing Strategy

### Unit Tests
- [ ] Test storage abstraction with mock providers
- [ ] Test auth context with different auth providers
- [ ] Test query builder with various SQL dialects

### Integration Tests
- [ ] Test full user flows with Supabase
- [ ] Test full user flows with PostgreSQL
- [ ] Test full user flows with MySQL
- [ ] Test provider switching

### Manual Testing Checklist
- [ ] Create ticket (all providers)
- [ ] Edit ticket (all providers)
- [ ] Filter tickets (all providers)
- [ ] User authentication (all providers)
- [ ] File upload (all providers)
- [ ] Team management (all providers)
- [ ] Migration between providers

---

## Risk Mitigation

### High Risk Areas
1. **Authentication**: Session management across providers
   - Mitigation: Thorough testing of auth flows

2. **Data Integrity**: Ensuring data consistency during provider switch
   - Mitigation: Migration validation and rollback capability

3. **Performance**: Polling-based real-time may be slower
   - Mitigation: Optimized polling intervals, background updates

### Rollback Plan
- Keep Supabase as primary provider
- Feature flags to enable/disable new providers
- Database backups before migrations
- Ability to revert to direct Supabase calls

---

## Success Metrics

### Functional
- [ ] All features work with Supabase (baseline)
- [ ] All features work with PostgreSQL
- [ ] All features work with MySQL
- [ ] Zero data loss during provider migration
- [ ] No increase in error rates

### Performance
- [ ] Query response time < 200ms (same as current)
- [ ] Real-time updates < 5s latency (polling mode)
- [ ] Authentication operations < 100ms

### Code Quality
- [ ] Zero direct Supabase imports in components
- [ ] All storage operations use abstraction
- [ ] All auth operations use abstraction
- [ ] 100% test coverage on abstraction layer

---

## Timeline

### Week 1-2: Database Queries
- Implement storage hook
- Refactor 6 components
- Testing

### Week 3-4: Authentication
- Create auth context
- Refactor 23 files
- Testing

### Week 5: File Storage
- Add S3/Azure support
- Update file components
- Testing

### Week 6-7: Real-time
- Implement polling fallback
- UI indicators
- Performance tuning

### Week 8-12: Edge Functions
- Evaluate migration strategy
- Implement abstraction (if Option B)
- Comprehensive testing

### Week 12: Final Testing & Documentation
- End-to-end testing
- Performance benchmarking
- Documentation updates
- Demo video

---

## Current Status: Week 1 - Proof of Concept

### Completed
- ✅ Dependency audit
- ✅ Refactoring plan created
- ⏳ Starting proof of concept with Tickets page

### Next Steps
1. Create `useStorage()` hook
2. Refactor Tickets page queries
3. Test ticket creation, editing, filtering
4. Document patterns for team
