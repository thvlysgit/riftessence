# Theming Guide for RiftEssence

## Overview
The app now uses a **CSS variables** approach for theming. All themes are defined in `contexts/ThemeContext.tsx` and CSS variables are set on the document root.

## Available CSS Variables

### Colors
- `--color-bg-primary` - Main background color
- `--color-bg-secondary` - Secondary background (cards, etc.)
- `--color-bg-tertiary` - Tertiary background (inputs, dropdowns, etc.)
- `--color-text-primary` - Main text color
- `--color-text-secondary` - Secondary text color
- `--color-text-muted` - Muted text color (placeholders, hints, etc.)
- `--color-accent-1` - Primary accent color (gold/theme color)
- `--color-accent-2` - Secondary accent color (for gradients)
- `--color-border` - Border color
- `--color-border-hover` - Border color on hover/focus

### Styling
- `--border-radius` - Border radius for elements (e.g., "8px", "16px")
- `--border-width` - Border width (e.g., "1px", "2px")
- `--shadow` - Box shadow value

## How to Convert Components to Use Theming

### Method 1: Inline Styles (Recommended for complex elements)
```tsx
<div
  className="px-4 py-2 border"
  style={{
    backgroundColor: 'var(--color-bg-secondary)',
    borderColor: 'var(--color-border)',
    borderRadius: 'var(--border-radius)',
    color: 'var(--color-text-primary)',
  }}
>
  Content
</div>
```

### Method 2: CSS Variable Classes (from globals.css)
```tsx
<div className="bg-primary text-primary border-themed rounded-[var(--border-radius)]">
  Content
</div>
```

Available utility classes:
- `.bg-primary`, `.bg-secondary`, `.bg-tertiary`
- `.text-primary`, `.text-secondary`, `.text-muted`, `.text-accent`
- `.border-themed`
- `.card` - Complete card styling
- `.btn-primary`, `.btn-secondary` - Button styles
- `.input-themed` - Input field styling

### Method 3: Hover States with Inline Event Handlers
```tsx
<button
  style={{ color: 'var(--color-text-secondary)' }}
  onMouseEnter={(e) => {
    e.currentTarget.style.color = 'var(--color-accent-1)';
    e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.color = 'var(--color-text-secondary)';
    e.currentTarget.style.backgroundColor = 'transparent';
  }}
>
  Hover me
</button>
```

## Converting Existing Components

### Step 1: Replace hardcoded colors
Find and replace common patterns:

- `bg-[#0B0D12]` → `style={{ backgroundColor: 'var(--color-bg-primary)' }}`
- `bg-[#1A1A1D]` → `style={{ backgroundColor: 'var(--color-bg-secondary)' }}`
- `bg-[#2B2B2F]` → `style={{ backgroundColor: 'var(--color-bg-tertiary)' }}`
- `text-[#C8AA6E]` → `style={{ color: 'var(--color-accent-1)' }}`
- `text-gray-300` → `style={{ color: 'var(--color-text-secondary)' }}`
- `text-gray-500` → `style={{ color: 'var(--color-text-muted)' }}`
- `border-[#2B2B2F]` → `style={{ borderColor: 'var(--color-border)' }}`

### Step 2: Replace gradients
```tsx
// Before:
className="bg-gradient-to-r from-[#C8AA6E] to-[#9A8352]"

// After:
style={{
  background: 'linear-gradient(to right, var(--color-accent-1), var(--color-accent-2))'
}}
```

### Step 3: Replace border radius
```tsx
// Before:
className="rounded-lg"

// After:
style={{ borderRadius: 'var(--border-radius)' }}

// Or use Tailwind with CSS var:
className="rounded-[var(--border-radius)]"
```

### Step 4: Update hover states
Convert Tailwind hover classes to event handlers or use CSS variables in Tailwind:

```tsx
// Before:
className="hover:bg-[#2B2B2F] hover:text-[#C8AA6E]"

// After (inline events):
onMouseEnter={(e) => {
  e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
  e.currentTarget.style.color = 'var(--color-accent-1)';
}}
onMouseLeave={(e) => {
  e.currentTarget.style.backgroundColor = 'transparent';
  e.currentTarget.style.color = 'var(--color-text-secondary)';
}}
```

## Examples from Navbar Component

### Logo with Gradient
```tsx
<div 
  className="w-10 h-10 flex items-center justify-center font-bold text-xl"
  style={{
    background: 'linear-gradient(to bottom right, var(--color-accent-1), var(--color-accent-2))',
    borderRadius: 'var(--border-radius)',
    color: 'var(--color-bg-primary)',
  }}
>
  LFD
</div>
```

### Dropdown Menu
```tsx
<div 
  className="absolute right-0 mt-2 w-48 border py-1 z-10"
  style={{
    backgroundColor: 'var(--color-bg-tertiary)',
    borderColor: 'var(--color-border)',
    borderRadius: 'var(--border-radius)',
    boxShadow: 'var(--shadow)',
  }}
>
  {/* Menu items */}
</div>
```

### Input Field
```tsx
<input
  type="text"
  className="w-full px-4 py-2 border"
  style={{
    backgroundColor: 'var(--color-bg-tertiary)',
    borderColor: 'var(--color-border)',
    color: 'var(--color-text-primary)',
    borderRadius: 'var(--border-radius)',
  }}
  onFocus={(e) => {
    e.currentTarget.style.borderColor = 'var(--color-border-hover)';
  }}
  onBlur={(e) => {
    e.currentTarget.style.borderColor = 'var(--color-border)';
  }}
/>
```

## Testing Themes

1. Open settings page at `/settings`
2. Select different themes to see changes
3. Theme selection is saved to localStorage
4. All pages using CSS variables will update automatically

## Current Themes

1. **Classic Dark** - Original dark theme with gold accents
2. **Arcane Pastel** - Soft pastels inspired by Arcane
3. **Nightshade** - Deep purples and dark blues
4. **Infernal Ember** - Warm reds and oranges
5. **Radiant Light** - Light mode with warm tones

## Priority Pages to Convert

1. ✅ Navbar (DONE)
2. ⏳ Feed page (`pages/feed.tsx`)
3. ⏳ Profile page (`pages/profile/[id].tsx`)
4. ⏳ Create post page (`pages/create.tsx`)
5. ⏳ Settings page (already themed, but could use utility classes)
6. ⏳ Auth pages (`pages/login.tsx`, `pages/register.tsx`)

## Tips

- Use inline styles for dynamic elements that need hover states
- Use utility classes for static styling
- Keep Tailwind for spacing, layout, and sizing classes
- Only replace color-related classes
- Test each theme after converting a component
