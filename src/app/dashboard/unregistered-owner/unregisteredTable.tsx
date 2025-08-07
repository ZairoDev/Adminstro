"use client";

import { useSearchParams } from "next/navigation";

interface UnregisteredOwnersInterface {
  ownerName: string;
  ownerPhone: string;
}

export default function UnregisteredOwnersTable() {
  const searchParams = useSearchParams();
  const ownersParam = searchParams.get("owners");

  let owners = [];
  if (ownersParam) {
    try {
      owners = JSON.parse(decodeURIComponent(ownersParam));
    } catch (err) {
      console.error("Failed to parse owners list:", err);
    }
  }
  return (
    <div className="relative rounded-md p-4">
      <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">
        Unregistered Owners
      </h2>
      <table className="table-auto w-full border">
        <thead>
          <tr>
            <th className="px-4 py-2">Owner Name</th>
            <th className="px-4 py-2">Phone Number</th>
          </tr>
        </thead>
        <tbody>
          {owners.map((owner: UnregisteredOwnersInterface, index: number) => (
            <tr key={index}>
              <td className="border px-4 py-2">{owner.ownerName}</td>
              <td className="border px-4 py-2">{owner.ownerPhone}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
