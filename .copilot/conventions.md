# Conventions

## Error Handling

### API Error Handling Pattern

**Consistent response format**:
```typescript
// Success
{ success: true, data: {...} }

// Error
{ error: 'User-friendly message', code?: 'ERROR_CODE', timestamp?: '...' }
```

**Error response helper usage**:
```typescript
import { Errors } from '../middleware/errors';

// Preferred for common cases
Errors.invalidCredentials(reply, request);
Errors.unauthorized(reply, request, 'Token expired');

// Direct reply for specific cases
reply.code(400).send({ error: 'Specific validation message' });
```

**Logging on error**:
```typescript
try {
  // ... operation
} catch (error: any) {
  request.log.error(error); // OR fastify.log.error(error)
  return reply.code(500).send({ error: 'Failed to...' });
}
```

**Reference**: `apps/api/src/middleware/errors.ts` (error helpers), all route handlers

### Frontend Error Handling Pattern

**Try-catch with user feedback**:
```typescript
const { showToast } = useGlobalUI();

const handleAction = async () => {
  try {
    const res = await fetch(`${API_URL}/api/...`);
    if (!res.ok) {
      const error = await res.json();
      showToast(error.error || 'Something went wrong', 'error');
      return;
    }
    // Success handling
    showToast('Success!', 'success');
  } catch (err) {
    showToast('Network error', 'error');
  }
};
```

**Error message utilities**:
```typescript
import { getFriendlyErrorMessage, extractErrorMessage } from '../utils/errorMessages';

const message = getFriendlyErrorMessage(error);
```

**Reference**: All pages in `apps/web/pages/*.tsx`, `apps/web/utils/errorMessages.ts`

### Error Codes (Where Used)

**Centralized codes in API**:
- `INVALID_INPUT`
- `MISSING_FIELD`
- `USERNAME_TAKEN`
- `INVALID_CREDENTIALS`
- `UNAUTHORIZED`
- `FORBIDDEN`

**Usage inconsistent**: Some errors have codes, many use plain strings

## Logging

### API Logging

**Fastify logger preferred**:
```typescript
// Most common pattern
fastify.log.error(error);
request.log.error({ err: error }, 'Message with context');

// Structured logging (less common)
request.log.error({ reqId: request.id, userId, error }, 'Structured message');
```

**Custom logger utilities (underutilized)**:
```typescript
import { logError, logInfo, logWarning } from '../middleware/logger';

logError(request, 'Failed to create post', error, { postId });
```

**Console.log usage**:
- Found in `src/riotClient.ts` (game activity, role detection)
- Found in `src/env.ts` (startup validation)
- Found in `src/utils/cache.ts` (Redis connection, cleanup)
- **Convention**: Use console.log for startup/initialization, request.log for runtime

**Reference**: `apps/api/src/middleware/logger.ts` (utilities), codebase-wide logging

### Frontend Logging

**Console methods**:
```typescript
console.error('Error loading posts:', err);  // Most common
console.log('Debug info:', data);            // Development only
console.warn('Deprecated pattern');          // Rare
```

**No structured logging in frontend** (plain console.* calls)

## TypeScript Usage

### Strictness Configuration

**Root tsconfig.json**:
```json
{
  "compilerOptions": {
    "strict": true,
    "skipLibCheck": true
  }
}
```

**ESLint overrides** (`.eslintrc.cjs`):
```javascript
{
  '@typescript-eslint/no-explicit-any': 'off',
  '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
}
```

**Observed practice**:
- `any` type pervasive in API route handlers
- Type assertions common: `as { field: string }`
- Strict mode enabled but not rigorously enforced

**Convention**: Prefer typed when obvious, use `any` when Fastify types unclear

### Type Import Pattern

**Frontend**:
```typescript
// Inline definitions preferred
type User = { id: string; username: string; ... };

// Rarely imports from @lfd/types (underutilized)
```

**API**:
```typescript
// Prisma-generated types
import { User, Post } from '@prisma/client';

// Zod inferred types
import { z } from 'zod';
const schema = z.object({...});
type InferredType = z.infer<typeof schema>;
```

**Convention**: API uses generated types, frontend uses inline definitions

## Code Organization

### File Structure

**API routes**: One route module per resource
- `apps/api/src/routes/auth.ts` (authentication)
- `apps/api/src/routes/posts.ts` (posts CRUD)
- `apps/api/src/routes/user.ts` (user profile, Riot accounts)
- Inline handlers in `src/index.ts` for cross-cutting concerns (feedback, reports)

**Frontend pages**: One file per route
- `apps/web/pages/feed.tsx` → /feed
- `apps/web/pages/profile.tsx` → /profile
- `apps/web/pages/login.tsx` → /login
- Dynamic routes: `pages/profile/[id].tsx` → /profile/:id

**Shared utilities**: Flat structure
- `apps/api/src/utils/*.ts` (auditLog, cache)
- `apps/web/utils/*.ts` (auth, sanitize, errorMessages)

**Middleware**: Flat structure in middleware/ directory
- `apps/api/src/middleware/auth.ts`
- `apps/api/src/middleware/errors.ts`
- `apps/api/src/middleware/logger.ts`

### Import Order (Informal Convention)

**Observed pattern**:
1. External libraries (React, Next.js, Fastify)
2. Internal utilities (auth, validation)
3. Database client (Prisma)
4. Types
5. Components (frontend)

**Not enforced** by tooling (no import sorting plugin)

## Naming Conventions

### Variables

**Boolean flags**: Prefix with `is`, `has`, `should`, `can`
```typescript
const isAdmin = user.badges.some(b => b.key === 'admin');
const hasVerifiedAccount = riotAccounts.some(a => a.verified);
const showModal = true;
```

**Collections**: Plural nouns
```typescript
const posts = await prisma.post.findMany();
const riotAccounts = user.riotAccounts;
const badges = ['admin', 'verified'];
```

**API URL constant**: Uppercase, repeated per file
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
```

### Functions

**Event handlers (frontend)**: Prefix with `handle`
```typescript
const handleSubmit = async (e: FormEvent) => { ... };
const handleDelete = async (id: string) => { ... };
```

**Async operations**: Prefix with verb
```typescript
const fetchPosts = async () => { ... };
const createPost = async (data) => { ... };
const validateUser = async (userId) => { ... };
```

**Utilities**: Imperative verbs
```typescript
export function getAuthToken(): string | null { ... }
export function sanitizeText(html: string): string { ... }
export async function cacheGet<T>(key: string): Promise<T | null> { ... }
```

### Constants

**Environment-derived**: SCREAMING_SNAKE_CASE
```typescript
const JWT_SECRET = env.JWT_SECRET;
const DATABASE_URL = env.DATABASE_URL;
```

**Configuration objects**: camelCase
```typescript
const corsOptions = { origin: true, credentials: true };
const paginationDefaults = { limit: 10, offset: 0 };
```

## Database Conventions

### Prisma Model Naming

**Models**: PascalCase singular
```prisma
model User { ... }
model Post { ... }
model RiotAccount { ... }
```

**Fields**: camelCase
```prisma
model User {
  id        String   @id
  username  String
  createdAt DateTime @default(now())
}
```

**Enums**: PascalCase, values SCREAMING_SNAKE_CASE
```prisma
enum Region {
  NA
  EUW
  EUNE
}
```

### Query Patterns

**Always specify select/include explicitly**:
```typescript
// ✅ Explicit includes
const user = await prisma.user.findUnique({
  where: { id },
  include: { riotAccounts: true, badges: true }
});

// ❌ Avoid over-fetching
const user = await prisma.user.findUnique({ where: { id } });
// Missing relations when needed
```

**Use transactions sparingly**:
- Single-query operations: No transaction
- Multiple related writes: Use $transaction
- Long-running operations: Avoid transactions (lock contention)

### Migration Naming

**Pattern**: `YYYYMMDD_descriptive_name`
```
migrations/20251229_add_feed_vcpreference_index/migration.sql
```

**Convention**: Descriptive, lowercase with underscores

## React Conventions

### Component Structure

**Functional components only** (no class components found)

**Hook ordering**:
1. Context hooks (useAuth, useTheme, etc.)
2. Router hooks (useRouter)
3. useState
4. useMemo, useCallback
5. useEffect

**Example**:
```tsx
export default function ProfilePage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const memoizedValue = useMemo(() => computeExpensive(data), [data]);
  
  useEffect(() => {
    // Side effects
  }, []);
  
  return <div>...</div>;
}
```

### State Management

**Local state preferred**:
```typescript
const [posts, setPosts] = useState<Post[]>([]);
const [filters, setFilters] = useState(defaultFilters);
```

**Context for global concerns only**:
- AuthContext (user session)
- ThemeContext (UI theme)
- GlobalUIProvider (toasts, modals)

**React Query underutilized** (QueryClient configured but rarely used)

### Props Pattern

**Inline type definitions**:
```tsx
type ProfileSkeletonProps = {
  isViewingOther: boolean;
};

export function ProfileSkeleton({ isViewingOther }: ProfileSkeletonProps) {
  // ...
}
```

**Props spreading**:
```tsx
export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = 
  ({ children, className = '', ...rest }) => {
    return <button className={`... ${className}`} {...rest}>{children}</button>;
  };
```

## Styling Conventions

### Tailwind Usage

**Inline classes**:
```tsx
<div className="flex items-center justify-between p-4 rounded-lg bg-gray-800">
```

**CSS variables for theming**:
```tsx
<div style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' }}>
```

**Combination pattern** (Tailwind + CSS vars):
```tsx
<button className="px-4 py-2 rounded" style={{ backgroundColor: 'var(--color-accent-1)' }}>
```

**No CSS modules** (all Tailwind or inline styles)

**Reference**: All frontend components

## API Response Conventions

### Success Response

**With data**:
```json
{
  "success": true,
  "data": { ... },
  "pagination": { "hasMore": true, "total": 100 }
}
```

**Simple operation**:
```json
{ "success": true }
```

**With token**:
```json
{
  "userId": "123",
  "username": "alice",
  "token": "jwt.token.here"
}
```

**Inconsistency**: No single standard (mix of { success, data }, direct data, and custom shapes)

### Error Response

**Standard shape**:
```json
{
  "error": "User-friendly message",
  "code": "ERROR_CODE",
  "timestamp": "2025-12-30T..."
}
```

**With details**:
```json
{
  "error": "Invalid input",
  "details": [
    { "field": "email", "message": "Invalid email format" }
  ]
}
```

## Security Conventions

### Password Handling

**Hashing**:
```typescript
import bcrypt from 'bcryptjs';
const hashedPassword = await bcrypt.hash(password, 10);
const isValid = await bcrypt.compare(password, user.password);
```

**Never log or expose**:
- Plain text passwords
- Hashed passwords in API responses
- JWT secrets

### JWT Token Handling

**Generation**:
```typescript
const token = fastify.jwt.sign({ userId: user.id });
// 7-day expiry configured in Fastify JWT plugin
```

**Verification**:
```typescript
const payload = fastify.jwt.verify(token);
const userId = payload.userId;
```

**Storage (frontend)**:
```typescript
localStorage.setItem('lfd_token', token);
const token = localStorage.getItem('lfd_token');
```

### Input Sanitization

**API**: Zod validation strips unknown fields
**Frontend**: DOMPurify for HTML content
```typescript
import { sanitizeText } from '../utils/sanitize';
const clean = sanitizeText(userInput);
```

**Reference**: `apps/web/utils/sanitize.ts`

## Git Conventions

### Commit Messages (Inferred from Husky)

**Pre-commit hook exists**: `.husky/pre-commit`
- Prevents committing .env files
- No other commit message linting observed

**Convention**: Not enforced by tooling

### Branch Strategy

**Not evident from codebase** (no branch protection config found)

## Documentation Conventions

**Inline comments**:
- Sparse in route handlers
- More verbose in utility functions
- JSDoc comments rare

**README files**:
- Root README (basic getting started)
- discord-bot/README (separate service)
- No per-package READMEs

**Markdown docs**:
- Recent analysis documents (COMPREHENSIVE_CODEBASE_ANALYSIS.md, etc.)
- Setup guides (COMMUNITIES_SETUP.md)
- Not versioned or maintained historically

**Convention**: Minimal inline documentation, rely on code clarity

## Dependency Management

### Version Pinning

**Root package.json**: Caret ranges (`^4.0.0`)
**pnpm-lock.yaml**: Exact versions locked
**Convention**: Use caret ranges, rely on lockfile for reproducibility

### Workspace Dependencies

**Use workspace protocol**:
```json
{
  "dependencies": {
    "@lfd/types": "workspace:*",
    "@lfd/ui": "workspace:*"
  }
}
```

**Reference**: All apps/*/package.json files

## Performance Conventions

### Frontend Optimization

**React.useMemo for expensive computations**:
```typescript
const filteredPosts = React.useMemo(() => {
  return allPosts.filter(/* expensive filter */);
}, [allPosts, filters]);
```

**Loading states**:
```typescript
const [loading, setLoading] = useState(true);
if (loading) return <LoadingSpinner />;
```

**Pagination**: Server-side with offset/limit
**Reference**: `apps/web/pages/feed.tsx` (pagination implementation)

### API Optimization

**Database indexes**: Defined in Prisma schema
```prisma
@@index([region, role, vcPreference, createdAt])
```

**Caching layer**: Redis utilities exist, minimally used
**Reference**: `apps/api/src/utils/cache.ts`

**Rate limiting**: Configured globally
**Reference**: `apps/api/src/index.ts` (rate limit plugin)

## Testing Conventions

**Test files**: `__tests__/*.test.ts`
**Test framework**: Jest + ts-jest
**Coverage**: Minimal (only packages/types has tests)

**Naming**:
```typescript
test('User schema validation', () => { ... });
test('Post requires author and content', () => { ... });
```

**Convention**: Tests live in __tests__ directories, not co-located

## Formatting Enforcement

**Prettier**: Configured (`.prettierrc`)
**ESLint**: Configured (`.eslintrc.cjs`)
**No pre-commit formatting**: Husky only checks for .env files

**Convention**: Format manually, no auto-format on commit
