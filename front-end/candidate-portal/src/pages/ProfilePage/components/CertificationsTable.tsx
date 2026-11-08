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
import { openAuthenticatedFile } from '@utils/fileActions';
import type {
  CertificationPayload,
  Skill,
} from '../../../types/profile.types';

interface CertificationRow extends CertificationPayload {
  skillName?: string | null;
}

interface CertificationsTableProps {
  items: CertificationRow[];
  skills: Skill[];
  onAdd: () => void;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
}

export function CertificationsTable({
  items,
  skills,
  onAdd,
  onEdit,
  onDelete,
}: CertificationsTableProps) {
  const { t } = useTranslation();
  const skillNames = new Map(skills.map((skill) => [skill.id, skill.name]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">
            {t('profile.certifications.title')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t('profile.certifications.description')}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="mr-2 size-4" />
          {t('profile.certifications.add')}
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t('profile.certifications.empty')}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('profile.certifications.columnTitle')}</TableHead>
              <TableHead>{t('profile.certifications.columnIssuer')}</TableHead>
              <TableHead>{t('profile.certifications.columnSkill')}</TableHead>
              <TableHead>
                {t('profile.certifications.columnCredential')}
              </TableHead>
              <TableHead className="w-[90px] text-right">
                {t('common.edit')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={item.id ?? `certification-${index}`}>
                <TableCell className="font-medium">{item.title}</TableCell>
                <TableCell>{item.issuer ?? '—'}</TableCell>
                <TableCell>
                  {item.skillId
                    ? (item.skillName ?? skillNames.get(item.skillId) ?? '—')
                    : '—'}
                </TableCell>
                <TableCell>
                  {item.credentialUrl ? (
                    <a
                      className="text-primary underline"
                      href={item.credentialUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t('profile.certifications.url')}
                    </a>
                  ) : item.fileId ? (
                    <button
                      type="button"
                      className="text-primary underline"
                      onClick={() => void openAuthenticatedFile(item.fileId as string)}
                    >
                      {t('profile.certifications.softCopy')}
                    </button>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(index)}
                      aria-label={t('profile.certifications.edit')}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(index)}
                      aria-label={t('profile.certifications.delete')}
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
