import { Bell, Check, Trash2, CheckCircle2 } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { 
  markAsRead, 
  markAllAsRead, 
  clearRead, 
  clearAll 
} from '../../store/slices/notificationSlice';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { formatDateToLocale } from '../../utils/date';

export function NotificationDropdown() {
  const dispatch = useDispatch();
  const { notifications, unreadCount } = useSelector((state: RootState) => state.notifications);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative p-2 rounded-full hover:bg-muted transition-colors">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-destructive rounded-full">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex justify-between items-center px-4 py-2">
          <span className="font-semibold text-sm">Notifications</span>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8" 
              title="Mark all as read"
              onClick={() => dispatch(markAllAsRead())}
            >
              <CheckCircle2 className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-destructive" 
              title="Clear all"
              onClick={() => dispatch(clearAll())}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <DropdownMenuSeparator />
        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-8">
              <Bell className="w-8 h-8 mb-2 opacity-20" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div 
                key={notif.id} 
                className={`p-4 border-b last:border-0 hover:bg-muted/50 transition-colors ${!notif.isRead ? 'bg-muted/20' : ''}`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 cursor-default">
                    <h4 className={`text-sm font-medium ${!notif.isRead ? 'text-foreground' : 'text-foreground/70'}`}>
                      {notif.title}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-2">
                      {formatDateToLocale(notif.createdAt)}
                    </p>
                  </div>
                  {!notif.isRead && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 shrink-0" 
                      title="Mark as read"
                      onClick={() => dispatch(markAsRead(notif.id))}
                    >
                      <Check className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </ScrollArea>
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full text-xs text-muted-foreground"
                onClick={() => dispatch(clearRead())}
              >
                Clear Read Notifications
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
