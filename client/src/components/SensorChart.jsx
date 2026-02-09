import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { format } from "date-fns";

const COLORS = {
  temperature_c: "#ef4444",
  humidity_pct: "#3b82f6",
  pressure_hpa: "#8b5cf6",
  eco2_ppm: "#f59e0b",
  tvoc_ppb: "#10b981",
  pm25_ugm3: "#6366f1",
  battery_pct: "#64748b",
};

function formatTick(ts) {
  try {
    return format(new Date(ts), "MM/dd HH:mm");
  } catch {
    return ts;
  }
}

function formatTooltipTime(ts) {
  try {
    return format(new Date(ts), "yyyy-MM-dd HH:mm:ss");
  } catch {
    return ts;
  }
}

export default function SensorChart({ data, dataKey, title, unit }) {
  const color = COLORS[dataKey] || "#3b82f6";

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3">{title}</h3>
      {data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
          No data
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="ts"
              tickFormatter={formatTick}
              tick={{ fontSize: 10 }}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: 11 }} width={50} />
            <Tooltip
              labelFormatter={formatTooltipTime}
              formatter={(value) => [`${value} ${unit}`, title]}
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={1.5}
              dot={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
