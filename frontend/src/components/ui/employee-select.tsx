import * as React from "react";
import { Check, ChevronsUpDown, Loader2, Search, X } from "lucide-react";
import { useDebounce } from 'use-debounce';

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import api from "@/lib/api";

export interface Employee {
    id: number;
    nip: string | null;
    name: string;
    position: string | null;
    department: string | null;
    rank: string | null;
}

interface EmployeeSelectProps {
    value?: number | null;
    onChange: (value: number | null, employee?: Employee) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    clearable?: boolean;
}

export function EmployeeSelect({
    value,
    onChange,
    placeholder = "Pilih Pegawai...",
    disabled = false,
    className,
    clearable = false,
}: EmployeeSelectProps) {
    const [open, setOpen] = React.useState(false);
    const [employees, setEmployees] = React.useState<Employee[]>([]);
    const [loading, setLoading] = React.useState(false);

    // Search state
    const [searchTerm, setSearchTerm] = React.useState("");
    const [debouncedSearch] = useDebounce(searchTerm, 300);

    // Fetch employees
    const fetchEmployees = React.useCallback(async (query: string = "") => {
        setLoading(true);
        try {
            const response = await api.get("/employees/select", {
                params: { search: query }
            });
            setEmployees(response.data);
        } catch (error) {
            console.error("Failed to fetch employees:", error);
            setEmployees([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // Effect for debounced search
    React.useEffect(() => {
        if (!open) return;

        const controller = new AbortController();

        api.get("/employees/select", {
            params: { search: debouncedSearch },
            signal: controller.signal,
        })
            .then(response => {
                setEmployees(response.data);
            })
            .catch(error => {
                console.error("Failed to fetch employees:", error);
                setEmployees([]);
            });

        return () => controller.abort();
    }, [debouncedSearch, open]);

    const selectedEmployee = value
        // If we have employees loaded, try to find it there
        ? employees.find((emp) => emp.id === value)
        : null;

    // Display for selected value (might need handling if selected item isn't in current list)
    // For now, we rely on the parent or current list. 
    // Ideally, the parent should pass the full object if 'value' is just an ID 
    // but here we just show what we can find.

    return (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between", className)}
                    disabled={disabled}
                >
                    <span className="truncate">
                        {selectedEmployee
                            ? `${selectedEmployee.name}${selectedEmployee.nip ? ` - ${selectedEmployee.nip}` : ""}`
                            : placeholder}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
                <div className="flex flex-col max-h-[300px]">
                    <div className="flex items-center border-b px-3">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <Input
                            className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0 focus-visible:ring-0 px-0"
                            placeholder="Cari nama atau NIP..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 hover:bg-transparent"
                                onClick={() => setSearchTerm("")}
                            >
                                <X className="h-4 w-4 opacity-50" />
                            </Button>
                        )}
                    </div>

                    <div className="overflow-y-auto flex-1 p-1">
                        {/* Clear option */}
                        {clearable && !loading && (
                            <div
                                className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-red-50 hover:text-red-600 text-red-500 border-b border-gray-100 mb-1"
                                onClick={() => {
                                    onChange(null);
                                    setOpen(false);
                                }}
                            >
                                <X className="mr-2 h-4 w-4" />
                                <span className="font-medium">Hapus Pengguna</span>
                            </div>
                        )}
                        {loading ? (
                            <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Memuat data...
                            </div>
                        ) : employees.length === 0 ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                                Pegawai tidak ditemukan.
                            </div>
                        ) : (
                            employees.map((employee) => (
                                <div
                                    key={employee.id}
                                    className={cn(
                                        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
                                        value === employee.id && "bg-accent text-accent-foreground"
                                    )}
                                    onClick={() => {
                                        onChange(employee.id, employee);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === employee.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <div className="flex flex-col">
                                        <span className="font-medium">{employee.name}</span>
                                        {employee.nip && <span className="text-xs text-muted-foreground">{employee.nip}</span>}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
