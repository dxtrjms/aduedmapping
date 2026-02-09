import { useReadings } from "../hooks/useReadings";
import DateRangeFilter from "../components/DateRangeFilter";
import SensorChart from "../components/SensorChart";

const SENSORS = [
  { key: "temperature_c", title: "Temperature", unit: "°C" },
  { key: "humidity_pct", title: "Humidity", unit: "%" },
  { key: "pressure_hpa", title: "Pressure", unit: "hPa" },
  { key: "eco2_ppm", title: "eCO2", unit: "ppm" },
  { key: "tvoc_ppb", title: "TVOC", unit: "ppb" },
  { key: "pm25_ugm3", title: "PM2.5", unit: "µg/m³" },
  { key: "battery_pct", title: "Battery", unit: "%" },
];

export default function DashboardPage() {
  const { rows, loading, error, fetchReadings } = useReadings();

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">Dashboard</h2>
      <DateRangeFilter onFilter={fetchReadings} loading={loading} />

      {error && (
        <div className="bg-red-50 text-red-700 text-sm rounded px-3 py-2 mb-4">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SENSORS.map((s) => (
          <SensorChart key={s.key} data={rows} dataKey={s.key} title={s.title} unit={s.unit} />
        ))}
      </div>
    </div>
  );
}
