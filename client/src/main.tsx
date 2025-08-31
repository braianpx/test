import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

// Renderiza la aplicación
createRoot(document.getElementById("root")!).render(<App />);
