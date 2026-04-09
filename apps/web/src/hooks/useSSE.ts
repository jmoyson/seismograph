import { useEffect, useRef, useState } from 'react';

interface UseSSEOptions {
  url: string;
  onMessage: (data: any) => void;
  eventType?: string;
  enabled?: boolean;
}

export function useSSE({ url, onMessage, eventType, enabled = true }: UseSSEOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // useRef pour onMessage : on stocke la dernière version du callback
  // sans l'ajouter aux deps du useEffect. Si on le mettait dans les deps,
  // chaque re-render du parent recréerait la fonction → useEffect se
  // re-exécuterait → la connexion SSE serait fermée et rouverte.
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!enabled) return;

    const source = new EventSource(url);

    source.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    const handler = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        onMessageRef.current(data);
      } catch (e) {
        console.error('SSE parse error:', e);
      }
    };

    if (eventType) {
      source.addEventListener(eventType, handler);
    } else {
      source.onmessage = handler;
    }

    source.onerror = () => {
      setIsConnected(false);
      setError('Connection lost, reconnecting...');
    };

    return () => {
      source.close();
      setIsConnected(false);
    };
  }, [url, eventType, enabled]);

  return { isConnected, error };
}
