# Form Patterns Reference

Documentation for form components usage patterns.

## Components Available

| Component | File | Purpose |
|-----------|------|---------|
| Input | `input.tsx` | Text input fields |
| Label | `label.tsx` | Form field labels |
| Textarea | `textarea.tsx` | Multi-line text input |
| Checkbox | `checkbox.tsx` | Boolean toggle |
| Switch | `switch.tsx` | On/off toggle |
| Form | `form.tsx` | React Hook Form wrapper |

## Basic Input Pattern

```tsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

<div className="space-y-2">
  <Label htmlFor="nama">Nama</Label>
  <Input id="nama" placeholder="Masukkan nama..." />
</div>
```

## Textarea Pattern

```tsx
import { Textarea } from "@/components/ui/textarea";

<Textarea 
  id="deskripsi" 
  placeholder="Masukkan deskripsi..."
  rows={4}
/>
```

## Checkbox Pattern

```tsx
import { Checkbox } from "@/components/ui/checkbox";

<Checkbox id="setuju" />
<Label htmlFor="setuju">Saya setuju</Label>
```

## Switch Pattern

```tsx
import { Switch } from "@/components/ui/switch";

<Switch id="notifikasi" />
<Label htmlFor="notifikasi">Aktifkan notifikasi</Label>
```

## Form with React Hook Form

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const schema = z.object({
  nama: z.string().min(1, "Nama wajib diisi"),
  email: z.string().email("Email tidak valid"),
});

export function MyForm() {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { nama: "", email: "" },
  });

  const onSubmit = (data) => console.log(data);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="nama" render={({ field }) => (
          <FormItem>
            <FormLabel>Nama</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <Button type="submit">Simpan</Button>
      </form>
    </Form>
  );
}
```
