import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store';
import { addNotification } from '../store/slices/notificationSlice';
import { ENV } from '../config/env.config';

export function useSSE() {
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const timeoutRef = useRef<number>(0);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const connectAndFetch = () => {
      if (ENV.MOCK_API) {
        const simulateEvent = () => {
          const mockNotification = {
            id: Math.random().toString(36).substring(7),
            title: 'Application Update',
            message: 'Your application for Senior Frontend Engineer has been reviewed.',
            isRead: false,
            createdAt: new Date().toISOString(),
          };
          dispatch(addNotification(mockNotification));
        };
        simulateEvent();
        return;
      }

      const token = btoa(JSON.stringify(user));
      const eventSource = new EventSource(`${ENV.API_BASE_URL}/notifications/stream?token=${token}`);
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'completed') {
            eventSource.close();
          } else if (data.notification) {
            dispatch(addNotification(data.notification));
          }
        } catch (e) {
          console.error('Failed to parse SSE message', e);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
      };
    };

    // Initial fetch
    connectAndFetch();

    // Reconnect every 5 minutes (300000 ms)
    timeoutRef.current = setInterval(connectAndFetch, 300000);

    return () => {
      if (timeoutRef.current) {
        clearInterval(timeoutRef.current);
      }
    };
  }, [isAuthenticated, user, dispatch]);
}
