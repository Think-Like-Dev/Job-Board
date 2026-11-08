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
import type { ExperiencePayload } from '../../../types/profile.types';

interface ExperienceTableProps {
  items: ExperiencePayload[];
  onAdd: () => void;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
}

export function ExperienceTable({
  items,
  onAdd,
  onEdit,
  onDelete,
}: ExperienceTableProps) {
  const { t } = useTranslation();

  function formatRange(start: string, end?: string | null): string {
    const startLabel = start ? new Date(start).getFullYear() : '—';
    const endLabel = end
      ? new Date(end).getFullYear()
      : t('profile.experience.present');
    return `${startLabel} – ${endLabel}`;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">
            {t('profile.experience.title')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t('profile.experience.description')}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="mr-2 size-4" />
          {t('profile.experience.add')}
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t('profile.experience.empty')}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('profile.experience.company')}</TableHead>
              <TableHead>{t('profile.experience.role')}</TableHead>
              <TableHead>{t('profile.experience.duration')}</TableHead>
              <TableHead className="w-[90px] text-right">
                {t('common.edit')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={item.id ?? `experience-${index}`}>
                <TableCell className="font-medium">
                  {item.companyName}
                </TableCell>
                <TableCell>{item.jobTitle}</TableCell>
                <TableCell>{formatRange(item.startDate, item.endDate)}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(index)}
                      aria-label={t('profile.experience.edit')}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(index)}
                      aria-label={t('profile.experience.delete')}
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
