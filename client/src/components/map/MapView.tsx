// src/components/map/MapView.tsx

import { MapContainer, TileLayer, Marker, Popup, useMap, FeatureGroup, GeoJSON as GeoJSONComponent, GeoJSONProps} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import L from "leaflet";
import { EditControl } from "react-leaflet-draw";
import { useEffect, useRef, useState } from "react";
import { User, Point } from "@shared/schema";
import type { GeoJSON } from "geojson";
import { ZoneLayer } from "./ZoneLayer";

export interface SurveyorLocation {
  id: number;
  userId: number;
  user?: Pick<User, "id" | "name" | "username" | "role">;
  location: Point;
  isActive: boolean;
  updatedAt: string;
  createdAt: string;
}
interface SurveyorResponse {
  id: number;
  surveyId: number;
  userId: number;
  createdAt: string; // ISO date string
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  responses: Array<{
    // Podés definir mejor esta parte según la estructura interna de cada respuesta
    [key: string]: any;
  }>;
}

interface MapViewProps {
  onZoneDrawn?: (geojson: GeoJSON) => void; // Para enviar el resultado al padre
  surveyors?: SurveyorLocation[];
  height?: string;
  drawingEnabled?: boolean; // indica si se puede dibujar
  handleZoneGeoJSON?: (geojson: GeoJSON.Feature) => void;
  zones?: Zones[]; // << NUEVO
  responseSurveyor?: SurveyorResponse | undefined | [];
}

interface Zones {
  coordinates: {
    type: "Polygon";
    coordinates: number[][][]; // arreglo 3D para un polígono GeoJSON
  };
  createdAt: string;
  description: string;
  id: number;
  name: string;
}


//draw controll

const DrawControls = ({
  onZoneDrawn,
  zones,
}: {
  onZoneDrawn?: (geojson: GeoJSON.Feature | null) => void;
  zones?: GeoJSON.Feature[];
}) => {
  const featureGroupRef = useRef<L.FeatureGroup>(null);
  const zoneSelected = zones?.[0] ?? null;

  useEffect(() => {
    if (!zoneSelected || !featureGroupRef.current) return;

    const fg = featureGroupRef.current;
    fg.clearLayers();

    const layer = L.geoJSON(zoneSelected).getLayers()[0];
    if (layer) {
      fg.addLayer(layer);
    }
  }, [zoneSelected]);

  return (
    <FeatureGroup ref={featureGroupRef}>
      <EditControl
        position="topright"
        draw={{
          polygon: !zoneSelected, // solo permite dibujar si no hay zona
          rectangle: false,
          circle: false,
          circlemarker: false,
          marker: false,
          polyline: false,
        }}
        edit={{
          edit: zoneSelected ? {} : false,
          remove: zoneSelected ? {} : false,
        }}
        onCreated={(e) => {
          const geojson = e.layer.toGeoJSON();
          onZoneDrawn?.(geojson);
        }}
        onEdited={(e) => {
          if (!featureGroupRef.current) return;

          // 1️⃣ Limpia todas las capas dibujadas antes
          featureGroupRef.current.clearLayers();

          let newFeature: GeoJSON.Feature | null = null;

          // 2️⃣ Recorre lo editado y toma el primero (o todos si quieres)
          e.layers.eachLayer((layer: any) => {
            const geojson = layer.toGeoJSON();
            newFeature = geojson;
            featureGroupRef.current?.addLayer(layer); // agrega solo lo nuevo
          });

          // 3️⃣ Actualiza el estado y notifica al padre
          if (newFeature) {
            onZoneDrawn?.(newFeature);
          }
        }}
        onDeleted={(e) => {
          onZoneDrawn?.(null); // si se borra, devolvés null
        }}
      />
    </FeatureGroup>
  );
};

const tucumanBounds: [[number, number], [number, number]] = [
    [-28.0, -67.0], // suroeste de Tucumán
    [-25.5, -64.0], // noreste
];

const tucumanCenter: [number, number] = [-26.8083, -65.2176];

//map
export const MapView = ({  
  surveyors, 
  height = "500px", 
  drawingEnabled = false, 
  handleZoneGeoJSON,
  zones = [],
  responseSurveyor = []
}: MapViewProps) => {
  useEffect(() => {
    // Solución al icono de marker por defecto que no carga
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });
  }, []);

const [ reloadMap, setReloadMap ] = useState<boolean>(true);
const [zonesMaped, setZonesMaped] = useState<GeoJSON.Feature[]>([]);

useEffect(() => {
  if (!zones || !Array.isArray(zones) || !zones[0]) return;

  const mappedZones: GeoJSON.Feature[] = zones.map((zone) => {
    return {
      type: "Feature" as const,
      geometry: {
        type: "Polygon" as const, // o "MultiPolygon", según corresponda
        coordinates: zone?.coordinates?.coordinates as number[][][], // asegurate que el formato sea correcto
      },
      properties: {
        id: zone?.id,
        name: zone?.name,
        description: zone?.description,
        createdAt: zone?.createdAt,
      },
    };
  });
  setZonesMaped(mappedZones);
  //recarga el zoneLayer para areglar un bug
  setReloadMap(false);
  setTimeout(()=>{
      setReloadMap(true);
  },200)
}, [zones]);

  const getRelativeTime = (timestamp: string) => {
    const minutes = Math.floor(
      (new Date().getTime() - new Date(timestamp).getTime()) / (1000 * 60)
    );

    if (minutes < 1) return "justo ahora";
    if (minutes === 1) return "hace 1 minuto";
    if (minutes < 60) return `hace ${minutes} minutos`;

    const hours = Math.floor(minutes / 60);
    if (hours === 1) return "hace 1 hora";
    if (hours < 24) return `hace ${hours} horas`;

    return "hace más de un día";
  };

  const handleZoneDrawn = (geojson: GeoJSON.Feature | null) => {
    if (geojson) {
      setZonesMaped([geojson]); // reemplaza todo
      handleZoneGeoJSON?.(geojson);
    } else {
      setZonesMaped([]);
      handleZoneGeoJSON?.(null as any);
    }
  };
  return (
    <div style={{ height }} className="w-full flex items-center justify-center">
      <div className="w-[90%] sm:w-full h-full">
      <MapContainer
        dragging={true}
        touchZoom={true}
        className="z-10"
        center={tucumanCenter}
        zoom={8}
        scrollWheelZoom={true}
        maxZoom={16}
        minZoom={8}
        maxBounds={tucumanBounds}
        maxBoundsViscosity={1.0}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        {/* Controles de dibujo */}
        {drawingEnabled && (
          <DrawControls
            onZoneDrawn={handleZoneDrawn}
            zones={zonesMaped} // solo la primera zona
          />
        )}
        {/* Muestra las Encuestas como puntos en el mapa*/} 
        {responseSurveyor?.map((survey) => {
          const coords = survey.location?.coordinates;
          if (!coords || coords.length < 2) return null; // 🚨 Evita error si es null o mal formado

          return (
            <Marker
              key={survey?.id}
              position={[coords[0], coords[1]]} // lat, lng
              icon={L.divIcon({
                className: "survey-point",
                html: `<div style="
                  width: 10px;
                  height: 10px;
                  background-color: #f97316;
                  border-radius: 50%;
                  border: 1px solid white;
                  box-shadow: 0 0 2px #000;
                "></div>`,
                iconSize: [10, 10],
                iconAnchor: [5, 5],
              })}
            >
              <Popup>
                Encuesta ID: {survey?.id}
                <br />
                Fecha: {new Date(survey?.createdAt).toLocaleString()}
                <br />
                Usuario: {survey?.userId}
              </Popup>
            </Marker>
          );
        })}

        {/* Muestra las zonas como GeoJSON si existen */}
       { reloadMap && <ZoneLayer zones={zonesMaped}/> }

        {surveyors?.map((surveyor) => {
          const coords = surveyor.location?.coordinates ?? [0, 0]; // [lng, lat] por defecto
          return (
            <Marker
              key={surveyor.userId}
              position={[coords[0], coords[1]]} // lat, lng
              icon={L.divIcon({
                className: "survey-point",
                html: `
                  <div style="display: flex; flex-direction: column; align-items: center; pointer-events: none;">
                    <span style="
                      font-size: 10px; 
                      font-weight: medium; 
                      background: rgba(255, 255, 255, 0.8); 
                      padding: 0px 3px; 
                      border-radius: 3px;
                      margin-bottom: 1px;
                      white-space: nowrap;
                    ">
                      ${surveyor.user?.name || "?"}
                    </span>
                    <div style="
                      width: 10px;
                      height: 10px;
                      background-color: ${surveyor.isActive ? "green" : "gray"};
                      border-radius: 50%;
                      border: 1px solid white;
                      box-shadow: 0 0 2px #000;
                    "></div>
                  </div>
                `,
                iconSize: [12, 20],  // ancho del punto, alto total incluyendo el nombre
                iconAnchor: [6, 12],  // centro del punto
              })}
              >
              <Popup>
                <div>
                  <strong>{surveyor.user?.name || "Desconocido"}</strong>
                  <br />
                  Estado: {surveyor.isActive ? "Activo" : "Inactivo"}
                  <br />
                  Últ. actualización: {getRelativeTime(surveyor.updatedAt)}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      </div>
    </div>
  );
};
export default MapView;