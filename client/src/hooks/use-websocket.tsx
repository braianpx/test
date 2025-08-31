import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "./use-auth";

type WebSocketContextType = {
  isConnected: boolean;
  sendMessage: (message: any) => void;
  lastMessage: any | null;
  responsesSurvey: any[];
  surveyorLocations: any[];
};

export const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any | null>(null);
  const [responsesSurvey, setResponsesSurvey] = useState<any[]>([]);
  const [surveyorLocations, setSurveyorLocations] = useState<any[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  // --- acumulador y debounce para responses ---
  const pendingResponses = useRef<any[]>([]);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // --- geolocation watch ---
  const geoWatchId = useRef<number | null>(null);

  useEffect(() => {
    if (!user) {
      // cerrar socket
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
        setIsConnected(false);
      }

      // detener geolocation
      if (geoWatchId.current !== null) {
        navigator.geolocation.clearWatch(geoWatchId.current);
        geoWatchId.current = null;
      }

      return;
    }

    const wsUrl = `${import.meta.env.VITE_API_URL}/ws`;
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      console.log("WebSocket conectado");
      setIsConnected(true);

      // 🔹 Autenticación
      socket.send(
        JSON.stringify({
          type: "authenticate",
          data: {
            userId: user.id,
            role: user.role,
          },
        })
      );

      // 🔹 Suscribirse a channels
      socket.send(JSON.stringify({ type: "subscribe", channel: "responses-survey" }));
      socket.send(JSON.stringify({ type: "subscribe", channel: "surveyor-locations" }));

      // 🔹 Empezar a enviar ubicación en tiempo real
      if (navigator.geolocation) {
        geoWatchId.current = navigator.geolocation.watchPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(
                JSON.stringify({
                  type: "subscribe",
                  channel:"updateLocation",
                  data: { userId: user.id, location:{ type:"Point", coordinates:[ latitude, longitude]} },
                })
              );
            }
          },
          (err) => console.error("Error obteniendo ubicación:", err),
          { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
        );
      }
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === "responses-survey") {
          pendingResponses.current.push(message.data);
          if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
          debounceTimeout.current = setTimeout(() => {
            setResponsesSurvey((prev) => [...prev, ...pendingResponses.current]);
            pendingResponses.current = [];
          }, 200);
        } else if (message.type === "surveyor-locations") {
          setSurveyorLocations(message.data);
        } else {
          setLastMessage(message);
        }
      } catch (error) {
        console.error("Error al parsear mensaje WS:", error);
      }
    };

    socket.onclose = () => {
      console.log("WebSocket desconectado");
      setIsConnected(false);
      if (geoWatchId.current !== null) {
        navigator.geolocation.clearWatch(geoWatchId.current);
        geoWatchId.current = null;
      }
    };

    socket.onerror = (error) => {
      console.error("Error en WebSocket:", error);
    };

    return () => {
      socket.close();
      if (geoWatchId.current !== null) {
        navigator.geolocation.clearWatch(geoWatchId.current);
        geoWatchId.current = null;
      }
    };
  }, [user]);

  const sendMessage = (message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.error("WebSocket no está conectado");
    }
  };

  return (
    <WebSocketContext.Provider
      value={{
        isConnected,
        sendMessage,
        lastMessage,
        responsesSurvey,
        surveyorLocations,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context)
    throw new Error("useWebSocket debe usarse dentro de un WebSocketProvider");
  return context;
}
