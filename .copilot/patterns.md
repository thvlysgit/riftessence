# Patterns

## API Route Structure

### Route Registration Pattern
All route modules export a default async function that registers endpoints:

```typescript
// apps/api/src/routes/auth.ts
export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/register', async (request: any, reply: any) => {
    // Handler implementation
  });
}
```

Register in `apps/api/src/index.ts`:
```typescript
await server.register(authRoutes, { prefix: '/api/auth' });
```

**Reference**: `apps/api/src/routes/auth.ts`, `apps/api/src/routes/posts.ts`, `apps/api/src/routes/user.ts`

### JWT Authentication Pattern
Every protected route extracts userId via middleware:

```typescript
// apps/api/src/routes/posts.ts (inline helper)
const getUserIdFromRequest = async (request: any, reply: any): Promise<string | null> => {
  const authHeader = request.headers['authorization'];
  if (!authHeader) {
    reply.code(401).send({ error: 'Authorization header missing' });
    return null;
  }
  const token = authHeader.replace('Bearer ', '').trim();
  const payload = fastify.jwt.verify(token);
  return payload.userId;
};

// Usage in route
const userId = await getUserIdFromRequest(request, reply);
if (!userId) return; // 401 already sent
```

**Shared version**: `apps/api/src/middleware/auth.ts` exports `getUserIdFromRequest()`
**Inconsistency**: Some routes duplicate this logic inline, others import shared function

### Request Validation Pattern
Validate request body with Zod schemas from `apps/api/src/validation.ts`:

```typescript
// apps/api/src/routes/auth.ts
import { RegisterSchema, validateRequest } from '../validation';

const validation = validateRequest(RegisterSchema, request.body);
if (!validation.success) {
  return reply.code(400).send({ error: 'Invalid input', details: validation.errors });
}

const { username, email, password } = validation.data;
```

**Reference**: All route handlers in `apps/api/src/routes/*.ts`

### Error Response Pattern
Use centralized error helpers from `apps/api/src/middleware/errors.ts`:

```typescript
import { Errors } from '../middleware/errors';

// In route handler
if (user.password !== hashedPassword) {
  return Errors.invalidCredentials(reply, request);
}

// Or inline for specific cases
return reply.code(400).send({ error: 'Username already taken' });
```

**Mixed usage**: Some routes use Errors helpers, others use direct reply.code().send()

### Logging Pattern
Use structured logging with request context:

```typescript
import { logError, logInfo } from '../middleware/logger';

// Error logging
logError(request, 'Failed to create post', error, { postId: '123' });

// Info logging (less common)
logInfo(request, 'User verified', { userId });

// Direct Fastify logger (most common)
fastify.log.error(error);
request.log.error({ err: error }, 'Message');
```

**Predominant pattern**: Direct `fastify.log.error()` usage throughout codebase

## Frontend Data Fetching

### Standard Fetch Pattern
Direct fetch() calls with manual error handling:

```typescript
// apps/web/pages/feed.tsx
const res = await fetch(`${API_URL}/api/posts?region=NA`, {
  headers: getAuthHeader()
});

if (!res.ok) throw new Error('Failed to fetch posts');
const data = await res.json();
```

Constants:
- `API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'`
- Defined at top of every file that makes API calls

**Reference**: All page components in `apps/web/pages/*.tsx`

### Authentication Header Pattern
Use utility functions from `apps/web/utils/auth.ts`:

```typescript
import { getAuthHeader, getAuthToken, setAuthToken, clearAuthToken } from '../utils/auth';

// In fetch calls
fetch(url, { headers: getAuthHeader() });

// After login
setAuthToken(data.token);

// On logout
clearAuthToken();

// Manual JWT parsing (client-side)
const userId = getUserIdFromToken(token); // Decodes base64 payload
```

**Reference**: `apps/web/utils/auth.ts` (canonical implementation)

### State Management Pattern
React useState hooks with useEffect for data loading:

```typescript
// apps/web/pages/feed.tsx
const [posts, setPosts] = useState<Post[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const loadPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/posts`);
      const data = await res.json();
      setPosts(data.posts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  loadPosts();
}, [/* dependencies */]);
```

**Context usage**: Limited to AuthContext, ThemeContext, GlobalUIProvider
**React Query**: Configured but rarely used (QueryClient exists in _app.tsx)

### Component Structure Pattern
Functional components with hooks, no class components:

```tsx
// apps/web/pages/profile.tsx
export default function ProfilePage() {
  const { user } = useAuth();
  const { showToast } = useGlobalUI();
  
  const [localState, setLocalState] = useState(initialValue);
  
  const handleAction = async () => {
    // Logic here
  };
  
  return (
    <div className="...">
      {/* JSX */}
    </div>
  );
}
```

**Styling**: Inline Tailwind classes + CSS variables for theming
**Reference**: All page components follow this structure

## Database Access

### Prisma Query Pattern
Direct Prisma calls in route handlers, no repository layer:

```typescript
// apps/api/src/routes/posts.ts
import prisma from '../prisma';

const posts = await prisma.post.findMany({
  where: { region: 'NA' },
  orderBy: { createdAt: 'desc' },
  include: {
    author: {
      include: { riotAccounts: true }
    }
  }
});
```

**Includes are explicit**: Always specify relations needed (no global eager loading)

### Enum Usage Pattern
Use Prisma enums directly in queries:

```typescript
// prisma/schema.prisma defines: enum Region { NA, EUW, EUNE, ... }

const post = await prisma.post.create({
  data: {
    region: 'NA',  // Type-safe via Prisma
    role: 'MID',
    vcPreference: 'ALWAYS'
  }
});
```

**Validation**: Zod schemas in `apps/api/src/validation.ts` mirror Prisma enums

### Transaction Pattern
Minimal transaction usage (most operations single-query):

```typescript
// When needed, use Prisma $transaction
await prisma.$transaction([
  prisma.user.update({ where: { id }, data: { ... } }),
  prisma.auditLog.create({ data: { ... } })
]);
```

**Observation**: Transactions rare, most mutations don't require atomicity

## Naming Conventions

### Files
- **Routes**: Lowercase, plural for resources: `posts.ts`, `communities.ts`, `auth.ts`
- **Components**: PascalCase: `Navbar.tsx`, `LoadingSpinner.tsx`, `ProfileSkeleton.tsx`
- **Utils**: camelCase: `auth.ts`, `sanitize.ts`, `errorMessages.ts`
- **Pages**: Lowercase, match URL: `feed.tsx`, `profile.tsx`, `login.tsx`

### Functions
- **Route handlers**: Inline arrow functions or named async functions
- **Utilities**: Exported named functions: `getAuthToken()`, `sanitizeText()`
- **Components**: PascalCase exports: `export default function ProfilePage()`

### Variables
- **Constants**: SCREAMING_SNAKE_CASE for true constants: `API_URL`, `JWT_SECRET`
- **React state**: Descriptive camelCase: `currentUserId`, `isEditMode`, `showFeedbackModal`
- **API locals**: camelCase: `userId`, `validation`, `hashedPassword`

## Type Definitions

### Frontend Types
Defined inline in page/component files:

```typescript
// apps/web/pages/feed.tsx
type Post = {
  id: string;
  message: string;
  role: string;
  region: string;
  // ... extensive inline definition
};
```

**Observation**: Frontend types NOT imported from packages/types (underutilized)

### API Types
Rely on Prisma-generated types + TypeScript inference:

```typescript
// apps/api/src/routes/user.ts
import { User } from '@prisma/client';

// Or inline any for flexibility (common pattern)
fastify.post('/endpoint', async (request: any, reply: any) => {
  // Type assertions where needed
  const { field } = request.body as { field: string };
});
```

**Observation**: Heavy use of `any` type in route handlers for Fastify request/reply

## Environment Configuration

### API Environment Pattern
Centralized validation on startup:

```typescript
// apps/api/src/env.ts
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  RIOT_API_KEY: z.string().min(1),
  // ... all required vars
});

export const env = validateEnv(); // Fails fast if invalid
```

Usage:
```typescript
import { env } from './env';
fastify.register(jwt, { secret: env.JWT_SECRET });
```

**Reference**: `apps/api/src/env.ts` (canonical source)

### Frontend Environment Pattern
Direct process.env access with fallbacks:

```typescript
// apps/web/pages/feed.tsx
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
```

**No centralized validation** in frontend (unlike API)

## Testing Patterns

### Unit Tests
Jest + ts-jest, minimal coverage:

```typescript
// packages/types/__tests__/types.test.ts
test('User schema validation', () => {
  const u = { id: '1', username: 'alice' };
  expect(() => User.parse(u)).not.toThrow();
});
```

**Current state**: Types package has tests, API/web lack comprehensive coverage

### Test Structure (Aspirational)
- API tests: None found in codebase
- Web tests: Skeleton files exist in `apps/web/__tests__/` (empty)
- Integration tests: None

**Recommendation**: Test coverage is a known gap

## Canonical Examples

### Complete API Endpoint
**Reference**: `apps/api/src/routes/auth.ts` (login endpoint)
- Request validation with Zod
- Database query with Prisma
- Password verification with bcrypt
- JWT generation
- Error handling with consistent responses

### Complete Frontend Page
**Reference**: `apps/web/pages/feed.tsx`
- useEffect for data loading
- useState for local state
- Error handling with try/catch
- Loading states
- Pagination support
- Filter state management

### Shared Component
**Reference**: `packages/ui/src/Button.tsx`
- Functional component with TypeScript
- Props spread pattern
- Tailwind styling
- Exported as named export
