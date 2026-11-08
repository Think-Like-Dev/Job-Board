import { useTranslation } from 'react-i18next';
import { Button } from '@ui/button';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@ui/table';
import type { EducationPayload } from '../../../types/profile.types';

interface EducationTableProps {
  items: EducationPayload[];
  required?: boolean;
  error?: string | null;
  onAdd: () => void;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
}

export function EducationTable({
  items,
  required = false,
  error,
  onAdd,
  onEdit,
  onDelete,
}: EducationTableProps) {
  const { t } = useTranslation();

  function formatRange(start: string, end?: string | null): string {
    const startLabel = start ? new Date(start).getFullYear() : '—';
    const endLabel = end
      ? new Date(end).getFullYear()
      : t('profile.education.present');
    return `${startLabel} – ${endLabel}`;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">
            {t('profile.education.title')}
            {required && <span className="text-destructive"> *</span>}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t('profile.education.description')}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="mr-2 size-4" />
          {t('profile.education.add')}
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t('profile.education.empty')}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('profile.education.institution')}</TableHead>
              <TableHead>{t('profile.education.degree')}</TableHead>
              <TableHead>{t('profile.education.field')}</TableHead>
              <TableHead>{t('profile.education.duration')}</TableHead>
              <TableHead className="w-[90px] text-right">
                {t('common.edit')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={item.id ?? `education-${index}`}>
                <TableCell className="font-medium">
                  {item.institution}
                </TableCell>
                <TableCell>{item.degree}</TableCell>
                <TableCell>{item.fieldOfStudy}</TableCell>
                <TableCell>{formatRange(item.startDate, item.endDate)}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(index)}
                      aria-label={t('profile.education.edit')}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(index)}
                      aria-label={t('profile.education.delete')}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
