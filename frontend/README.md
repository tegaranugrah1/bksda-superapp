# BKSDA SuperApp — Frontend

> Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui

---

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.x | React framework |
| React | 19.x | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Styling |
| shadcn/ui | latest | UI components |
| React Query | 5.x | Data fetching |
| React Hook Form | 7.x | Form handling |
| Lucide React | latest | Icons |
| Recharts | 3.x | Charts |

---

## Project Structure

```
src/
├── app/                         # Next.js App Router
│   ├── page.tsx                 # Homepage (public)
│   ├── layout.tsx               # Root layout
│   ├── login/                   # Login page
│   │
│   ├── (website)/               # Public pages (no auth)
│   │   ├── _components/
│   │   │   ├── PublicNavbar.tsx
│   │   │   └── PublicFooter.tsx
│   │   ├── informasi/           # News articles
│   │   ├── kawasan/            # Conservation areas
│   │   ├── tsl/                # Flora & fauna species
│   │   ├── galeri/             # Photo & video gallery
│   │   ├── publikasi/          # Publications
│   │   ├── hubungi-kami/       # Contact form
│   │   └── verifikasi/          # Public verification
│   │
│   ├── (dashboard)/             # Admin pages (auth required)
│   │   ├── _components/
│   │   │   ├── AdminLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── StatsCard.tsx
│   │   ├── cms/                # CMS module
│   │   ├── bmn/                # BMN module
│   │   ├── inventory/           # Inventory module
│   │   ├── surat-tugas/        # Assignment letters
│   │   └── dereporting/        # Reporting module
│   │
│   └── global-error.tsx        # Fatal error boundary
│
├── components/
│   ├── ui/                     # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── form.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── table.tsx
│   │   └── ...
│   │
│   └── custom/                 # Custom components
│       ├── EmployeePicker.tsx
│       └── ...
│
└── lib/
    ├── api.ts                  # Axios instance with Bearer token
    ├── utils.ts                # Utilities (cn, formatDate, etc.)
    ├── constants.ts            # Environment URLs, menu items
    ├── bmn-utils.ts           # BMN formatting (rupiah, kondisi)
    └── letter-utils.ts         # Letter formatting (date, number)
```

---

## NPM Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `next dev` | Start dev server (port 3000) |
| `build` | `next build` | Production build |
| `start` | `next start` | Start production server |
| `lint` | `eslint` | Lint code |
| `lint:fix` | `eslint --fix` | Fix lint errors |
| `typecheck` | `tsc --noEmit` | TypeScript check |

---

## Environment Variables

Create `.env.local` in the frontend root:

```bash
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8000

# Supabase Storage URL (for images)
NEXT_PUBLIC_STORAGE_URL=https://xxx.supabase.co/storage/v1/object/public/cms
```

> **Warning**: Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. Never put secrets here!

---

## API Pattern

### Admin API (with Bearer Token)

Use the `api` instance from `@/lib/api` for authenticated endpoints:

```typescript
import api from "@/lib/api";

// Fetch with auth
const { data } = await api.get("/api/cms/admin/informasi");

// Create with auth
await api.post("/api/cms/admin/informasi", formData);

// Update with auth
await api.put(`/api/cms/admin/informasi/${id}`, formData);

// Delete with auth
await api.delete(`/api/cms/admin/informasi/${id}`);
```

### Public API (No Auth)

Use `axios` directly for public endpoints:

```typescript
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Public fetch (no token)
const { data } = await axios.get(`${API_URL}/api/cms/public/informasi`);
```

> **Important**: Never use `api` (with Bearer token) for public endpoints! Tokens can leak through CDN cache.

---

## Authentication Flow

1. User opens `/login`
2. Enters NIP + password
3. Frontend calls `POST /api/login`
4. Backend returns `{ token: "xxx", user: {...} }`
5. Frontend stores token in memory (not localStorage for security)
6. All subsequent requests include `Authorization: Bearer xxx`

---

## Component Patterns

### Using shadcn/ui Components

```typescript
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
```

### Admin Table with React Query

```typescript
const { data, isLoading } = useQuery({
  queryKey: ['informasi'],
  queryFn: async () => {
    const { data } = await api.get('/api/cms/admin/informasi');
    return data;
  },
});
```

### Form with React Hook Form

```typescript
const form = useForm<z.infer<typeof formSchema>>({
  resolver: zodResolver(formSchema),
  defaultValues: { title: "", content: "" },
});

const onSubmit = async (values: z.infer<typeof formSchema>) => {
  await api.post("/api/cms/admin/informasi", values);
  queryClient.invalidateQueries({ queryKey: ["informasi"] });
};
```

---

## Error Handling

### 404 Page

Access a non-existent route → shows `app/not-found.tsx`

```tsx
// app/not-found.tsx
export default function NotFound() {
  return <div>404 - Halaman Tidak Ditemukan</div>;
}
```

### Error Boundary

Component error → shows `app/error.tsx`

```tsx
// app/error.tsx
export default function Error({ error, reset }) {
  return (
    <button onClick={() => reset()}>
      Coba Lagi
    </button>
  );
}
```

### API Error Toast

```typescript
import { toast } from "sonner";

try {
  await api.post("/api/cms/admin/informasi", data);
  toast.success("Berhasil disimpan");
} catch (error) {
  toast.error("Gagal menyimpan data");
}
```

---

## Troubleshooting

### "Module not found" errors

```bash
# Clear .next cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### TypeScript errors

```bash
# Check types
npm run typecheck

# Fix auto
npm run lint:fix
```

### API calls failing

1. Check backend is running: `http://localhost:8000/api`
2. Check `NEXT_PUBLIC_API_URL` in `.env.local`
3. Check token is valid (re-login if expired)

---

## Deployment

### Vercel (Recommended)

1. Connect GitHub repo to Vercel
2. Set environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_API_URL` = Production API URL
   - `NEXT_PUBLIC_STORAGE_URL` = Production Storage URL
3. Deploy automatically on push to `main`

### Build for Production

```bash
npm run build
npm run start
```
