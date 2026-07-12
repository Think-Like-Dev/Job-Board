import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { Button } from '../ui/button';
import { AuthModal } from '../auth/AuthModal';
import { NotificationDropdown } from './NotificationDropdown';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

export function Header() {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  return (
    <header className="h-16 border-b flex items-center justify-between px-8 shrink-0 bg-background sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <Link to="/" className="text-xl font-bold tracking-tight">
          Job Board
        </Link>
      </div>

      <div className="flex items-center gap-4">
        {isAuthenticated ? (
          <>
            <NotificationDropdown />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-muted border">
                    {user?.firstName?.charAt(0) || 'U'}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/profile">{t('nav.profile')}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/applications">{t('nav.applications')}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">
                  {t('nav.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <AuthModal>
            <Button>{t('nav.login')}</Button>
          </AuthModal>
        )}
      </div>
    </header>
  );
}
