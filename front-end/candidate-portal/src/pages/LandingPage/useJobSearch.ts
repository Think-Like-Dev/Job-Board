import { useEffect, useMemo, useState } from 'react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { JobFilters } from '@/types/job.types';

export const PAGE_SIZE = 10;
export const SEARCH_DEBOUNCE_MS = 500;

export const SALARY_MIN = 0;
export const SALARY_MAX = 1_000_000;
export const SALARY_STEP = 5_000;

export type SalaryRange = [number, number];

export const DEFAULT_SALARY_RANGE: SalaryRange = [SALARY_MIN, SALARY_MAX];

/** Owns the landing-page search, filter and pagination state. */
export function useJobSearch() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>();
  const [location, setLocation] = useState<string>();
  const [yearsOfExperience, setYearsOfExperience] = useState<string>();
  const [currency, setCurrency] = useState<string>();
  const [salaryRange, setSalaryRange] =
    useState<SalaryRange>(DEFAULT_SALARY_RANGE);
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);
  const debouncedCategory = useDebouncedValue(category, SEARCH_DEBOUNCE_MS);
  const debouncedLocation = useDebouncedValue(location, SEARCH_DEBOUNCE_MS);
  const debouncedExperience = useDebouncedValue(
    yearsOfExperience,
    SEARCH_DEBOUNCE_MS,
  );

  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    debouncedCategory,
    debouncedLocation,
    debouncedExperience,
    currency,
    salaryRange,
  ]);

  const filters = useMemo<JobFilters>(() => {
    const [min, max] = salaryRange;

    return {
      page,
      limit: PAGE_SIZE,
      search: debouncedSearch.trim() || undefined,
      category: debouncedCategory?.trim() || undefined,
      location: debouncedLocation?.trim() || undefined,
      yearsOfExperience: debouncedExperience?.trim() || undefined,
      currency,
      compensationMin: min > SALARY_MIN ? min : undefined,
      compensationMax: max < SALARY_MAX ? max : undefined,
      orderBy: 'publishedAt',
      orderByDirection: 'DESC',
    };
  }, [
    page,
    debouncedSearch,
    debouncedCategory,
    debouncedLocation,
    debouncedExperience,
    currency,
    salaryRange,
  ]);

  const clearFilters = () => {
    setSearch('');
    setCategory(undefined);
    setLocation(undefined);
    setYearsOfExperience(undefined);
    setCurrency(undefined);
    setSalaryRange(DEFAULT_SALARY_RANGE);
  };

  const isFiltered = Boolean(
    search.trim() ||
      category?.trim() ||
      location?.trim() ||
      yearsOfExperience?.trim() ||
      currency ||
      salaryRange[0] > SALARY_MIN ||
      salaryRange[1] < SALARY_MAX,
  );

  return {
    search,
    setSearch,
    category,
    setCategory,
    location,
    setLocation,
    yearsOfExperience,
    setYearsOfExperience,
    currency,
    setCurrency,
    salaryRange,
    setSalaryRange,
    page,
    setPage,
    filters,
    clearFilters,
    isFiltered,
  };
}
