import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store';
import { addNotification } from '../store/slices/notificationSlice';

export function useSSE() {
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const timeoutRef = useRef<null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const connectAndFetch = () => {
      // In a real application, this would be:
      // const token = btoa(JSON.stringify(user));
      // const eventSource = new EventSource(`${import.meta.env.VITE_API_BASE_URL}/notifications/stream?token=${token}`);
      // eventSource.onmessage = (event) => {
      //   const data = JSON.parse(event.data);
      //   if (data.type === 'completed') {
      //     eventSource.close();
      //   } else {
      //     dispatch(addNotification(data.notification));
      //   }
      // };

      // Since there is no backend, we simulate the SSE connection opening, 
      // receiving a notification, and then closing when "completed" is received.
      
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
