# Utility Functions Reference

Documentation for utility functions available in the project.

## Available Utilities

### `cn()` - Class Name Merger

**File**: `frontend/src/lib/utils.ts`

Merges Tailwind CSS classes intelligently, resolving conflicts.

```tsx
import { cn } from "@/lib/utils";

// clsx merges conditional classes
// twMerge resolves Tailwind conflicts
cn("p-4", conditional && "mt-2")  // "p-4 mt-2"
cn("p-4", "p-8")                 // "p-8" (not both!)
```

**Why?**
- `clsx` handles conditional classes: `cn("p-4", isActive && "bg-blue-500")`
- `twMerge` resolves conflicts: `cn("p-4", "p-8")` → `p-8`

### `formatRupiah()` - Currency Formatter

**File**: `frontend/src/app/bmn/_lib/asset-utils.ts`

Formats numbers as Indonesian Rupiah currency.

```tsx
import { formatRupiah } from "@/app/bmn/_lib/asset-utils";

formatRupiah(1500000);     // "Rp 1.500.000"
formatRupiah(null);        // "Rp 0"
formatRupiah(undefined);   // "Rp 0"
```

## API Client

**File**: `frontend/src/lib/api.ts`

Axios instance with auth interceptors.

```tsx
import api from "@/lib/api";

// GET
const { data } = await api.get("/endpoint", { params: { page: 1 } });

// POST
const { data } = await api.post("/endpoint", payload);

// With blob response (for downloads)
const response = await api.get("/export", { responseType: "blob" });
```
