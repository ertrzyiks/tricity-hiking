export const style =
  import.meta.env.MODE === "production"
    ? "https://api.maptiler.com/maps/81336bdc-08e3-4a3f-981c-55f06f6e3e42/style.json?key=bHa0L2mKhjZqOJctPuVf#1.0/0.00000/0.00000"
    : {
        version: 8 as const,
        sources: {
          osm: {
            type: "raster" as const,
            tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "&copy; OpenStreetMap Contributors",
            maxzoom: 19,
          },
        },
        layers: [
          {
            id: "osm" as const,
            type: "raster" as const,
            source: "osm" as const, // This must match the source key above
          },
        ],
      };
