import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { ChevronUpIcon, ChevronDownIcon } from "@heroicons/react/24/outline";

function fmt(val, decimals = 1) {
  if (val === null || val === undefined) return "—";
  return Number(val).toFixed(decimals);
}

const columns = [
  {
    accessorKey: "ts",
    header: "Timestamp",
    cell: ({ getValue }) => {
      try {
        return format(new Date(getValue()), "yyyy-MM-dd HH:mm:ss");
      } catch {
        return getValue();
      }
    },
  },
  { accessorKey: "temperature_c", header: "Temp (°C)", cell: ({ getValue }) => fmt(getValue()) },
  { accessorKey: "humidity_pct", header: "Humidity (%)", cell: ({ getValue }) => fmt(getValue()) },
  { accessorKey: "pressure_hpa", header: "Pressure (hPa)", cell: ({ getValue }) => fmt(getValue(), 0) },
  { accessorKey: "eco2_ppm", header: "eCO2 (ppm)", cell: ({ getValue }) => fmt(getValue(), 0) },
  { accessorKey: "tvoc_ppb", header: "TVOC (ppb)", cell: ({ getValue }) => fmt(getValue(), 0) },
  { accessorKey: "pm25_ugm3", header: "PM2.5 (µg/m³)", cell: ({ getValue }) => fmt(getValue()) },
  { accessorKey: "battery_pct", header: "Battery (%)", cell: ({ getValue }) => fmt(getValue(), 0) },
  { accessorKey: "battery_v", header: "Battery (V)", cell: ({ getValue }) => fmt(getValue(), 2) },
];

export default function ReadingsTable({ data }) {
  const [sorting, setSorting] = useState([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 50 } },
  });

  const pageCount = table.getPageCount();
  const pageIndex = table.getState().pagination.pageIndex;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider cursor-pointer select-none hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === "asc" && <ChevronUpIcon className="h-3 w-3" />}
                      {header.column.getIsSorted() === "desc" && <ChevronDownIcon className="h-3 w-3" />}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-100">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-gray-400 text-sm">
                  No data
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2 text-sm text-gray-700 whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-gray-200 text-sm">
          <span className="text-gray-600">
            Page {pageIndex + 1} of {pageCount} ({data.length} rows)
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="px-3 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-40"
            >
              Prev
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="px-3 py-1 rounded border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
