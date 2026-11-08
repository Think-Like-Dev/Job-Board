export interface ApplicationSelection {
  selectedIds: ReadonlySet<string>;
  filteredCount: number;
  isAllCurrentPageSelected: boolean;
  isSomeCurrentPageSelected: boolean;
  isSelectingAll: boolean;
  onToggleRow: (id: string, checked: boolean) => void;
  onToggleCurrentPage: (checked: boolean) => void;
  onSelectAllFiltered: () => void;
  onClear: () => void;
}
