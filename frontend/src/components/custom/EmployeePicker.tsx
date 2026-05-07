"use client";

import { useState, useEffect, useRef, useCallback, useTransition } from "react";
import { Search, Loader2, UserCheck, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";

export interface Employee {
    id: string;
    nama_lengkap: string;
    nip: string;
}

interface PickerProps {
    onSelect: (employee: Employee) => void;
    placeholder?: string;
}

export function EmployeePicker({ onSelect, placeholder = "Ketik nama atau NIP pegawai..." }: PickerProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<Employee[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [, startTransition] = useTransition();
    const wrapperRef = useRef<HTMLDivElement>(null);
    const abortRef = useRef<AbortController | null>(null);

    const handleClickOutside = useCallback((event: MouseEvent) => {
        if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
            setIsOpen(false);
        }
    }, []);

    useEffect(() => {
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [handleClickOutside]);

    useEffect(() => {
        if (abortRef.current) {
            abortRef.current.abort();
        }
        abortRef.current = new AbortController();
        const controller = abortRef.current;

        const timeoutId = setTimeout(async () => {
            if (controller.signal.aborted || !query.trim()) return;
            startTransition(() => setIsLoading(true));
            try {
                const res = await api.get(`/kepegawaian/employees?search=${query}&limit=5`);
                if (!controller.signal.aborted) {
                    startTransition(() => {
                        setResults(res.data.data ?? []);
                        setIsOpen(true);
                    });
                }
            } catch (error) {
                if (!controller.signal.aborted) {
                    console.error("Gagal menarik radar pegawai:", error);
                    startTransition(() => setResults([]));
                }
            } finally {
                if (!controller.signal.aborted) {
                    startTransition(() => setIsLoading(false));
                }
            }
        }, 300);

        return () => {
            clearTimeout(timeoutId);
            controller.abort();
        };
    }, [query]);

    const handleSelect = (emp: Employee) => {
        onSelect(emp);
        setQuery("");
        setIsOpen(false);
    };

    return (
        <div ref={wrapperRef} className="relative w-full">

            <div className="relative flex items-center">
                <Search className="absolute left-4 w-5 h-5 text-zinc-400" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        if (e.target.value.trim()) setIsOpen(true);
                    }}
                    onFocus={() => query.trim() && setIsOpen(true)}
                    placeholder={placeholder}
                    className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl pl-11 pr-12 py-3.5 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-zinc-500 shadow-inner"
                />
                {isLoading && (
                    <div className="absolute right-4 animate-spin text-emerald-500">
                        <Loader2 className="w-5 h-5" />
                    </div>
                )}
            </div>

            {isOpen && query.trim().length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">

                    {!isLoading && results.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-8 text-zinc-500">
                            <AlertCircle className="w-8 h-8 mb-2 opacity-20" />
                            <p className="text-sm">Pegawai tidak ditemukan.</p>
                        </div>
                    )}

                    <ul className="max-h-64 overflow-y-auto divide-y divide-zinc-800/50">
                        {results.map((emp) => (
                            <li
                                key={emp.id}
                                onClick={() => handleSelect(emp)}
                                className="px-4 py-3 hover:bg-emerald-500/10 cursor-pointer flex items-center gap-4 transition-colors group"
                            >
                                <div className="w-10 h-10 rounded-full bg-zinc-800 group-hover:bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                                    <UserCheck className="w-5 h-5 text-zinc-400 group-hover:text-emerald-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-zinc-200 truncate group-hover:text-emerald-400">{emp.nama_lengkap}</p>
                                    <p className="text-xs text-zinc-500 font-mono mt-0.5">{emp.nip}</p>
                                </div>
                            </li>
                        ))}
                    </ul>

                    {results.length > 0 && (
                        <div className="bg-zinc-950 p-2 text-center text-[10px] text-zinc-600 uppercase font-bold tracking-widest border-t border-zinc-800">
                            Menampilkan maksimal 5 kandidat
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
