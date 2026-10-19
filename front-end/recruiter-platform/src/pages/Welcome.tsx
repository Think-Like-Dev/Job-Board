import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { useLogout } from '@api/hooks/useAuth';
import { Button } from '@ui/button';

export default function Welcome() {
  const { t } = useTranslation();
  const user = useSelector((state: RootState) => state.auth.user);
  const logoutMutation = useLogout();

  const displayName = user?.name ?? user?.email ?? '';
  const roleLabel = user?.role ? t(`roles.${user.role}`) : null;

  return (
    <section className="flex h-screen w-screen flex-col items-center justify-center gap-2 px-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">
        {t('welcome.title', { name: displayName })}
      </h1>
      {roleLabel ? (
        <p className="text-sm text-muted-foreground">{roleLabel}</p>
      ) : null}
      <Button
        variant="outline"
        className="mt-4"
        onClick={() => logoutMutation.mutate()}
        disabled={logoutMutation.isPending}
      >
        {t('nav.logout')}
      </Button>
    </section>
  );
}
