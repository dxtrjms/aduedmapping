import { useReadings } from "../hooks/useReadings";
import DateRangeFilter from "../components/DateRangeFilter";
import ReadingsTable from "../components/ReadingsTable";

export default function DataTablePage() {
  const { rows, loading, error, fetchReadings } = useReadings();

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">Data Table</h2>
      <DateRangeFilter onFilter={fetchReadings} loading={loading} />

      {error && (
        <div className="bg-red-50 text-red-700 text-sm rounded px-3 py-2 mb-4">{error}</div>
      )}

      <ReadingsTable data={rows} />
    </div>
  );
}
