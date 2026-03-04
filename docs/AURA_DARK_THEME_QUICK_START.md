# NU AURA Dark Theme - Quick Start Guide

Transform your HRMS to a modern, executive-grade dark interface in **3 simple steps**.

## 🚀 3-Step Quick Start

### Step 1: Replace Configuration Files (2 minutes)

```bash
# Navigate to frontend directory
cd frontend

# Replace Tailwind config
mv tailwind.config.js tailwind.config.light.backup.js
cp tailwind.config.aura-dark.js tailwind.config.js

# Replace root layout
mv app/layout.tsx app/layout.light.backup.tsx
cp app/layout.aura-dark.tsx app/layout.tsx

# Replace global CSS
mv app/globals.css app/globals.light.backup.css
cp app/globals.aura-dark.css app/globals.css
```

### Step 2: Restart Dev Server

```bash
npm run dev
# or
pnpm dev
```

### Step 3: View Your Dark Theme!

Open `http://localhost:3000` - Your app is now dark-themed! 🌙

## 🎨 Color Reference Card

Use this quick reference when updating components:

### Backgrounds
```tsx
bg-aura-bg        →  #0B0F19 (Main background)
bg-aura-surface   →  #111827 (Elevated surfaces)
bg-aura-card      →  #151D2E (Cards)
bg-aura-hover     →  #1A2235 (Hover states)
```

### Text
```tsx
text-text-primary    →  #F1F5F9 (Main text)
text-text-secondary  →  #94A3B8 (Secondary text)
text-text-muted      →  #64748B (Muted text)
```

### Colors
```tsx
primary-500   →  #3B82F6 (Blue)
success-500   →  #10B981 (Green)
danger-500    →  #EF4444 (Red)
warning-500   →  #F59E0B (Amber)
accent-500    →  #8B5CF6 (Purple)
```

### Borders
```tsx
border-aura-border  →  #1E293B
```

## 📝 Common Replacements

### Cards
```tsx
// OLD
<div className="bg-white border-gray-200 shadow-sm">

// NEW
<div className="bg-aura-card border-aura-border shadow-card">
```

### Buttons
```tsx
// OLD
<button className="bg-blue-600 hover:bg-blue-700 text-white">

// NEW
<button className="bg-primary-500 hover:bg-primary-600 text-white shadow-glow-primary">
```

### Text
```tsx
// OLD
<h1 className="text-gray-900">Title</h1>
<p className="text-gray-600">Content</p>

// NEW
<h1 className="text-text-primary">Title</h1>
<p className="text-text-secondary">Content</p>
```

### Inputs
```tsx
// OLD
<input className="bg-white border-gray-300 text-gray-900" />

// NEW
<input className="bg-aura-card border-aura-border text-text-primary" />
```

## 🎯 Update Priority

### High Priority (Do First)
1. ✅ Root layout
2. ✅ Global CSS
3. ✅ Tailwind config
4. ⬜ Card component
5. ⬜ Button component
6. ⬜ Input components

### Medium Priority (Next)
7. ⬜ Sidebar/Navigation
8. ⬜ Header
9. ⬜ Dashboard pages
10. ⬜ Table components

### Low Priority (Polish)
11. ⬜ Charts styling
12. ⬜ Modal dialogs
13. ⬜ Tooltips
14. ⬜ Animations

## 🔥 Quick Component Templates

### Card with Glow
```tsx
<Card className="bg-aura-card border-aura-border shadow-glow-primary">
  <CardHeader>
    <CardTitle className="text-text-primary">Revenue</CardTitle>
  </CardHeader>
  <CardContent>
    <p className="text-3xl font-bold font-mono text-text-primary">
      $1.012B
    </p>
    <p className="text-text-secondary">↑ 6.5% vs target</p>
  </CardContent>
</Card>
```

### Metric Tile
```tsx
<div className="bg-gradient-success rounded-xl p-6">
  <div className="flex items-start justify-between">
    <div>
      <p className="text-xs uppercase tracking-wide text-success-200">
        Active Users
      </p>
      <p className="text-3xl font-bold font-mono text-white mt-2">
        2,847
      </p>
      <div className="flex items-center gap-2 mt-2">
        <ArrowUp className="h-4 w-4 text-success-300" />
        <span className="text-sm font-semibold text-success-300">
          +12.4%
        </span>
      </div>
    </div>
    <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
      <Users className="h-6 w-6 text-white" />
    </div>
  </div>
</div>
```

### Status Badge
```tsx
<span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-success-500/20 text-success-400">
  <span className="w-1.5 h-1.5 rounded-full bg-success-400" />
  Active
</span>
```

### Button with Glow
```tsx
<button className="px-4 py-2 rounded-lg font-medium text-white bg-gradient-to-b from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-glow-primary transition-all">
  View Dashboard
</button>
```

## 📊 Chart Example

```tsx
<ResponsiveContainer width="100%" height={300}>
  <AreaChart data={data}>
    <defs>
      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="rgb(59 130 246)" stopOpacity={0.25} />
        <stop offset="100%" stopColor="rgb(59 130 246)" stopOpacity={0} />
      </linearGradient>
    </defs>
    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
    <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} />
    <YAxis stroke="#94A3B8" fontSize={11} />
    <Tooltip
      contentStyle={{
        background: 'rgba(21, 29, 46, 0.95)',
        border: '1px solid #1E293B',
        borderRadius: '8px',
        color: '#F1F5F9',
      }}
    />
    <Area
      type="monotone"
      dataKey="revenue"
      stroke="rgb(59 130 246)"
      fill="url(#revGrad)"
      strokeWidth={2.5}
    />
  </AreaChart>
</ResponsiveContainer>
```

## ✨ Special Effects

### Glow on Hover
```tsx
<Card className="hover:shadow-glow-primary transition-shadow duration-300">
```

### Gradient Background
```tsx
<div className="bg-gradient-to-br from-primary-500/10 via-transparent to-accent-500/10">
```

### Glassmorphism
```tsx
<div className="bg-aura-card/60 backdrop-blur-lg border border-white/5">
```

### Status Dot with Pulse
```tsx
<span className="relative flex h-3 w-3">
  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-400 opacity-75"></span>
  <span className="relative inline-flex rounded-full h-3 w-3 bg-success-500"></span>
</span>
```

## 🐛 Troubleshooting

### Problem: Can't see text
**Solution:** Replace `text-gray-*` with `text-text-*`
```tsx
text-gray-900  →  text-text-primary
text-gray-600  →  text-text-secondary
text-gray-400  →  text-text-muted
```

### Problem: Cards blend into background
**Solution:** Use `bg-aura-card` instead of `bg-aura-bg`
```tsx
<Card className="bg-aura-card border-aura-border">
```

### Problem: Buttons don't have glow
**Solution:** Add shadow class
```tsx
<Button className="shadow-glow-primary">
```

### Problem: Charts are hard to read
**Solution:** Update stroke colors
```tsx
<CartesianGrid stroke="#1E293B" />
<XAxis stroke="#94A3B8" />
```

## 📦 What You Get

After applying the dark theme:

✅ **Automatic dark mode** - No manual toggle needed
✅ **Optimized fonts** - DM Sans + JetBrains Mono loaded via Next.js
✅ **High contrast** - WCAG AA compliant
✅ **Smooth transitions** - Professional animations
✅ **Glow effects** - Subtle depth for important elements
✅ **Consistent design** - Unified color palette
✅ **Better charts** - Optimized for dark backgrounds
✅ **Reduced eye strain** - True dark theme

## 🎓 Next Steps

1. ✅ Apply quick start (above)
2. 📖 Read full [Migration Guide](./AURA_DARK_THEME_MIGRATION_GUIDE.md)
3. 🎨 Update your components gradually
4. 🧪 Test all pages
5. 🚀 Deploy to production

## 💡 Pro Tips

1. **Use font-mono for metrics**: Numbers look better in monospace
   ```tsx
   <span className="font-mono">$1,234.56</span>
   ```

2. **Add subtle glows to important cards**:
   ```tsx
   <Card className="shadow-glow-primary">
   ```

3. **Use gradients for CTAs**:
   ```tsx
   className="bg-gradient-to-b from-primary-500 to-primary-600"
   ```

4. **Layer backgrounds for depth**:
   ```tsx
   bg-aura-bg          (Page background)
   bg-aura-surface     (Section background)
   bg-aura-card        (Card background)
   bg-aura-hover       (Hover state)
   ```

5. **Consistent spacing with Tailwind**:
   ```tsx
   p-4 gap-4    (Small)
   p-6 gap-6    (Medium)
   p-8 gap-8    (Large)
   ```

## 🎉 You're Ready!

Your nu-aura HRMS now has a professional, executive-grade dark theme that matches modern SaaS standards.

**Questions?** Check the full [Migration Guide](./AURA_DARK_THEME_MIGRATION_GUIDE.md)

---

**Happy coding! 🌙✨**
