'use client';

import { useRouter, useSearchParams } from 'next/navigation';

interface FilterSelectProps {
  name: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
}

export function FilterSelect({ name, defaultValue, options }: FilterSelectProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newParams = new URLSearchParams();
    searchParams.forEach((v, k) => {
      if (k !== name && k !== 'page') newParams.set(k, v);
    });
    if (e.target.value) newParams.set(name, e.target.value);
    // Reset to page 1 when filter changes
    router.push(`?${newParams.toString()}`);
  };

  return (
    <div className="relative">
      <select
        className="h-9 px-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
        defaultValue={defaultValue || ''}
        onChange={handleChange}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
