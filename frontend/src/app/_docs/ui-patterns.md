# UI Patterns Reference

Documentation for data display components usage patterns.

## Components Available

| Component | File | Purpose |
|-----------|------|---------|
| Table | `table.tsx` | Data tables with pagination |
| Tabs | `tabs.tsx` | Tabbed content navigation |
| Select | `select.tsx` | Dropdown selection in forms |
| DropdownMenu | `dropdown-menu.tsx` | Action menus per row |
| Command | `command.tsx` | Autocomplete search |

## CRUD Table Pattern

See `docs/issues/112-frontend-data-display-guide.md` for complete implementation example.

```tsx
// Basic imports for CRUD table
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
```

## Tabs Pattern

```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

<Tabs defaultValue="foto">
  <TabsList>
    <TabsTrigger value="foto">📷 Foto</TabsTrigger>
    <TabsTrigger value="video">🎬 Video</TabsTrigger>
  </TabsList>
  <TabsContent value="foto">...</TabsContent>
  <TabsContent value="video">...</TabsContent>
</Tabs>
```

## Select Pattern

```tsx
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

<Select onValueChange={handleChange}>
  <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
  <SelectContent>
    <SelectItem value="1">Option 1</SelectItem>
    <SelectItem value="2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

## DropdownMenu Pattern

```tsx
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem><Pencil /> Edit</DropdownMenuItem>
    <DropdownMenuItem variant="destructive"><Trash2 /> Hapus</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```
