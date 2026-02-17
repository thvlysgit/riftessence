# State Management

> Last updated: 2026-02-11

## Architecture

Local `useState` + React Context for globals. No Redux/Zustand.

## Context Providers (wrapped in `_app.tsx`)

1. **`QueryClientProvider`** — TanStack React Query (configured, underutilized)
2. **`ThemeProvider`** — Theme selection + CSS variable injection
3. **`LanguageProvider`** — i18n with `t()` function
4. **`AuthProvider`** — JWT auth state, login/register/logout, token refresh (every 10 min)
5. **`GlobalUIProvider`** — `showToast(message, type)`, `showConfirm(options)`

## Data Fetching Pattern

Direct `fetch()` calls with `useEffect` and `useState`:

```tsx
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/endpoint`, { headers: getAuthHeader() });
      const json = await res.json();
      setData(json);
    } catch (err) { showToast(t('common.error'), 'error'); }
    finally { setLoading(false); }
  };
  load();
}, []);
```

React Query (`useQuery`/`useMutation`) is available but not currently adopted.

## Key Utilities

- `apps/web/utils/auth.ts` — `getAuthToken()`, `setAuthToken()`, `clearAllAuthState()`, `getAuthHeader()`, `refreshAuthToken()`
- `apps/web/utils/storage.ts` — SSR-safe localStorage wrapper
- `apps/web/utils/errorMessages.ts` — `getFriendlyErrorMessage()`, `extractErrorMessage()`
