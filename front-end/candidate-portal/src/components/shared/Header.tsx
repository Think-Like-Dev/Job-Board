import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { Button } from '../ui/button';
import { AuthModal } from '../auth/AuthModal';
import { NotificationDropdown } from './NotificationDropdown';
import { useLogout } from '@api/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

export function Header() {
  const { t } = useTranslation();
  const { isAuthenticated, isInitialized, user } = useSelector((state: RootState) => state.auth);
  const logoutMutation = useLogout();
  const navigate = useNavigate();
  return (
    <header className="h-16 border-b flex items-center justify-between px-8 shrink-0 bg-background sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <Link to="/" className="text-xl font-bold tracking-tight">
          Job Board
        </Link>
      </div>

      <div className="flex items-center relative gap-4">
        {!isInitialized ? (
          <div className="h-9 w-24 animate-pulse rounded bg-muted" />
        ) : isAuthenticated ? (
          <>
            <NotificationDropdown />
            <DropdownMenu modal={false} closeParentOnEsc>
              <DropdownMenuTrigger>
                  <div className="flex h-full w-full min-w-8 min-h-8 items-center justify-center rounded-full bg-muted border">
                    {user?.firstName?.charAt(0) || 'U'}
                  </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className={"relative"}>
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  {t('nav.profile')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/applications')}>
                  {t('nav.applications')}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-destructive cursor-pointer"
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                >
                  {logoutMutation.isPending ? 'Logging out...' : t('nav.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <AuthModal>
            <Button>
              {t('nav.login')}
            </Button>
          </AuthModal>
        )}
      </div>
    </header>
  );
}
