"use client";

import WeeksVisit from "@/hooks/(VS)/useWeeksVisit";
import { List, AutoSizer } from "react-virtualized";

interface UnregisteredOwnersInterface {
  ownerName: string;
  ownerPhone: string;
}

export default function UnregisteredOwnersTable() {
  const { loading, unregisteredOwners = [] } = WeeksVisit();

  if (loading) {
    return (
      <div className="p-4 text-gray-600 dark:text-gray-300">
        Loading unregistered owners...
      </div>
    );
  }

  if (unregisteredOwners.length === 0) {
    return (
      <div className="p-4 text-gray-600 dark:text-gray-300">
        No unregistered owners found.
      </div>
    );
  }

  // Row renderer
  const rowRenderer = ({
    index,
    key,
    style,
  }: {
    index: number;
    key: string | number;
    style: React.CSSProperties;
  }) => {
    const owner = unregisteredOwners[index];
    return (
      <div         
        key={key}
        style={style}
        className={`flex border-b border-gray-200 dark:border-gray-700 px-4 py-2 ${
          index % 2 === 0 ? "bg-gray-50 dark:bg-gray-900" : ""
        }`}
      >
        <div className="w-1/2">{owner.ownerName}</div>
        <div className="w-1/2">{owner.ownerPhone}</div>
      </div>
    );
  };

  return (
    <div className="p-4 rounded-md border border-gray-200 dark:border-gray-700">
      <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
        Unregistered Owners ({unregisteredOwners.length})
      </h2>

      {/* Table Header */}
      <div className="flex border-b border-gray-300 dark:border-gray-600 px-4 py-2 font-semibold bg-gray-100 dark:bg-gray-800">
        <div className="w-1/2">Owner Name</div>
        <div className="w-1/2">Phone Number</div>
      </div>

      {/* Virtualized List */}
      <div style={{ height: 800 }}>
        <AutoSizer>
          {({ width, height }) => (
            <List
              width={width}
              height={height}
              rowCount={unregisteredOwners.length}
              rowHeight={50}
              rowRenderer={rowRenderer}
            />
          )}
        </AutoSizer>
      </div>
    </div>
  );
}
