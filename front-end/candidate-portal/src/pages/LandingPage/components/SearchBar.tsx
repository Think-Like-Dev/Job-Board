import { Filter, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onFilterClick: () => void;
  onSearch: () => void;
  hasActiveFilters: boolean;
}

export function SearchBar({
  value,
  onChange,
  onFilterClick,
  onSearch,
  hasActiveFilters,
}: SearchBarProps) {
  const { t } = useTranslation();

  return (
    <div className="relative z-30 mx-auto -mt-8 w-full max-w-4xl px-4">
      <div className="flex items-center gap-2 rounded-full border bg-background p-2 shadow-lg">
        <div className="flex flex-1 items-center pl-4">
          <Search className="mr-2 h-5 w-5 shrink-0 text-muted-foreground" />
          <Input
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={t('jobs.searchPlaceholder')}
            className="border-0 text-base shadow-none focus-visible:ring-0"
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative shrink-0 rounded-full"
          onClick={onFilterClick}
          aria-label={t('jobs.filters.open')}
        >
          <Filter className="h-5 w-5" size={32}/>
          {hasActiveFilters && (
            <span className="absolute inset-e-2 top-2 h-2 w-2 rounded-full bg-primary" />
          )}
        </Button>
        <Button
          type="button"
          size="lg"
          className="shrink-0 rounded-full px-4 sm:px-8"
          onClick={onSearch}
        >
          {t('jobs.search')}
        </Button>
      </div>
    </div>
  );
}
