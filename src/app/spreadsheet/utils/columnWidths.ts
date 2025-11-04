export const columnWidths = {
  serial: "w-[40px] min-w-[40px] max-w-[40px]",
  name: "w-[150px] min-w-[150px] max-w-[150px]",
  phone: "w-[120px] min-w-[120px] max-w-[120px]",
  location: "w-[120px] min-w-[120px] max-w-[120px]",
  price: "w-[100px] min-w-[100px] max-w-[100px]",
  area: "w-[120px] min-w-[120px] max-w-[120px]",
  availability: "w-[80px] min-w-[80px] max-w-[80px]",
  interiorStatus: "w-[100px] min-w-[100px] max-w-[100px]",
  petStatus: "w-[80px] min-w-[80px] max-w-[80px]",
  propertyType: "w-[150px] min-w-[150px] max-w-[150px]",
  remarks: "w-[180px] min-w-[180px] max-w-[180px]",
  refLink: "w-[130px] min-w-[130px] max-w-[130px]",
  vsLink: "w-[130px] min-w-[130px] max-w-[130px]",
  vsid: "w-[120px] min-w-[120px] max-w-[120px]",
  address: "w-[180px] min-w-[180px] max-w-[180px]",
  actions: "w-[80px] min-w-[80px] max-w-[80px]",
} as const;

export type ColumnKey = keyof typeof columnWidths;

export interface Column {
  label: string | React.ReactNode;
  field: string;
  sortable: boolean;
  width: string;
}

export const columns: Column[] = [
  { label: "S.No", field: "serial", sortable: false, width: columnWidths.serial },
  { label: "Name", field: "name", sortable: true, width: columnWidths.name },
  { label: "Phone", field: "phoneNumber", sortable: false, width: columnWidths.phone },
  { label: "Location", field: "location", sortable: true, width: columnWidths.location },
  { label: "Price", field: "price", sortable: true, width: columnWidths.price },
  { label: "Area", field: "area", sortable: false, width: columnWidths.area },
  { label: "Avail.", field: "availability", sortable: true, width: columnWidths.availability },
  { label: "Int. Status", field: "intStatus", sortable: false, width: columnWidths.interiorStatus },
  { label: "Pet. Status", field: "petStatus", sortable: false, width: columnWidths.petStatus },
  { label: "Property Type", field: "propertyType", sortable: false, width: columnWidths.propertyType },
  { label: "Remarks", field: "remarks", sortable: false, width: columnWidths.remarks },
  { label: "Ref. Link", field: "refLink", sortable: false, width: columnWidths.refLink },
  { label: "VsLink", field: "link", sortable: false, width: columnWidths.vsLink },
  { label: "VSID", field: "vsid", sortable: false, width: columnWidths.vsid },
  { label: "Address", field: "address", sortable: false, width: columnWidths.address },
  { label: "Actions", field: "upload", sortable: false, width: columnWidths.actions },
];