# Custom Components Reference

Documentation for custom-built components (not from shadcn/ui).

## Components Available

| Component | File | Purpose |
|-----------|------|---------|
| ConfirmDialog | `confirm-dialog.tsx` | Async confirmation dialog with Promise |
| EmployeeSelect | `employee-select.tsx` | Employee search and select |
| RichTextEditor | `rich-text-editor.tsx` | HTML content editor |

## ConfirmDialog Pattern

```tsx
import { useConfirm } from "@/components/ui/confirm-dialog";

// In component:
const confirm = useConfirm();

const handleDelete = async (id: number) => {
  const ok = await confirm({
    title: "Hapus Data",
    description: "Apakah Anda yakin menghapus data ini?",
    confirmText: "Ya, Hapus",
    cancelText: "Batal",
    variant: "danger",
  });

  if (!ok) return;
  // Proceed with deletion
  await api.delete(`/resource/${id}`);
};
```

**Requires**: `ConfirmDialogProvider` in `frontend/src/components/providers.tsx` ✅

## EmployeeSelect Pattern

```tsx
import { EmployeeSelect } from "@/components/ui/employee-select";

<EmployeeSelect
  value={selectedEmployeeId}
  onChange={setSelectedEmployeeId}
  placeholder="Pilih Pegawai..."
/>
```

## RichTextEditor Pattern

```tsx
import { RichTextEditor } from "@/components/ui/rich-text-editor";

<RichTextEditor
  value={content}
  onChange={setContent}
  placeholder="Tulis konten..."
/>
```

**Note**: Uses react-quill-new for rich text editing.
