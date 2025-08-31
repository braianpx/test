import { GeoJSON } from "react-leaflet";
import L from "leaflet";

// Generar color consistente por nombre
const getZoneColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name?.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return (
    "#" +
    ((hash >> 24) & 0xff).toString(16).padStart(2, "0") +
    ((hash >> 16) & 0xff).toString(16).padStart(2, "0") +
    ((hash >> 8) & 0xff).toString(16).padStart(2, "0")
  );
};

export const ZoneLayer = ({ zones }: { zones: GeoJSON.Feature[] }) => {

  const onEachFeature = (feature: any, layer: L.Layer) => {
    if (feature.properties && feature.properties.name) {
      // Tooltip al pasar el mouse
      layer.bindTooltip(feature.properties.name, {
        permanent: true, // solo hover
        direction: "top",
        className: "leaflet-tooltip",
        opacity: 0.8
      });
    }
  };

  const style = (feature: any, color: string) => ({
    color: color,
    weight: 2,
    fillOpacity: 0.4,
    fillColor: feature.properties.fillColor,
  });

  return (
    <>
      {zones?.map((feature) => (
        <GeoJSON
          key={feature?.properties?.id}
          data={feature}
          style={style(feature, getZoneColor(feature?.properties?.name))}
          onEachFeature={onEachFeature}
        />
      ))}
    </>
  );
};
