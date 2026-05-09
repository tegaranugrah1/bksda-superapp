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

**File**: `frontend/src/lib/bmn-utils.ts`

Formats numbers as Indonesian Rupiah currency.

```tsx
import { formatRupiah } from "@/lib/bmn-utils";

formatRupiah(1500000);     // "Rp 1.500.000"
formatRupiah("2500000");   // "Rp 2.500.000"
formatRupiah(null);        // "Rp 0"
formatRupiah(undefined);    // "Rp 0"
```

### `getAssetConditionStyle()` - Condition Badge Styling

**File**: `frontend/src/lib/bmn-utils.ts`

Returns Tailwind classes for asset condition badges.

```tsx
import { getAssetConditionStyle } from "@/lib/bmn-utils";

getAssetConditionStyle("Baik");        // green classes
getAssetConditionStyle("Rusak Ringan"); // amber classes
getAssetConditionStyle("Rusak Berat"); // red classes + pulse animation
```

## BMN Constants

**File**: `frontend/src/lib/constants/bmn.ts`

```tsx
import { CONDITIONS, LOCATIONS } from "@/lib/constants/bmn";

// CONDITIONS: ["Baik", "Rusak Ringan", "Rusak Berat"]
// LOCATIONS: office location strings
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
