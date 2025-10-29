"use client"

import React from "react"

import type { ReactElement } from "react"
import { debounce } from "lodash" // Import debounce from lodash
import  CustomTooltip  from "@/components/CustomToolTip" // Import CustomTooltip component

import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  Ban,
  CheckCheck,
  CircleDot,
  Copy,
  Download,
  ImageUp,
  Loader2,
  PawPrint,
  Phone,
  Pin,
  Plus,
  Star,
  X,
  MoreVertical,
} from "lucide-react"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { EditableCell } from "./EditableCell"
import { EditableCopyCell } from "./EditableCopyCell"
import { SelectableCell } from "./SelectableCell"
import axios from "axios"
import type { unregisteredOwners } from "@/util/type"
import { useBunnyUpload } from "@/hooks/useBunnyUpload"
import JSZip from "jszip"
import { saveAs } from "file-saver"
import { AreaSelect } from "@/components/leadTableSearch/page"
import { useAuthStore } from "@/AuthStore"
import { CiTextAlignCenter } from "react-icons/ci"
import { useToast } from "@/hooks/use-toast"

export const apartmentTypes = [
  { label: "Studio", value: "Studio" },
  { label: "1 Bedroom", value: "1 Bedroom" },
  { label: "2 Bedroom", value: "2 Bedroom" },
  { label: "3 Bedroom", value: "3 Bedroom" },
  { label: "4 Bedroom", value: "4 Bedroom" },
  { label: "Villa", value: "Villa" },
  { label: "Pent House", value: "Pent House" },
  { label: "Detached House", value: "Detached House" },
  { label: "Loft", value: "Loft" },
  { label: "Shared Apartment", value: "Shared Apartment" },
  { label: "Maisotte", value: "Maisotte" },
]

const propertyTypeColors: Record<string, string> = {
  Studio: "bg-blue-200 dark:bg-blue-800/30 text-blue-900 dark:text-blue-200",
  "1 Bedroom": "bg-green-200 dark:bg-green-800/30 text-green-900 dark:text-green-200",
  "2 Bedroom": "bg-orange-200 dark:bg-orange-800/30 text-orange-900 dark:text-orange-200",
  "3 Bedroom": "bg-yellow-200 dark:bg-yellow-800/30 text-yellow-900 dark:text-yellow-200",
  "4 Bedroom": "bg-red-200 dark:bg-red-800/30 text-red-900 dark:text-red-200",
  Villa: "bg-rose-200 dark:bg-rose-800/30 text-rose-900 dark:text-rose-200",
  "Pent House": "bg-purple-200 dark:bg-purple-800/30 text-purple-900 dark:text-purple-200",
  "Detached House": "bg-cyan-200 dark:bg-cyan-800/30 text-cyan-900 dark:text-cyan-200",
  Loft: "bg-teal-200 dark:bg-teal-800/30 text-teal-900 dark:text-teal-200",
  "Shared Apartment": "bg-amber-200 dark:bg-amber-800/30 text-amber-900 dark:text-amber-200",
  Maisotte: "bg-lime-200 dark:bg-lime-800/30 text-lime-900 dark:text-lime-200",
}

export function SpreadsheetTable({
  tableData,
  setTableData,
  serialOffset,
  onAvailabilityChange,
}: {
  tableData: unregisteredOwners[]
  setTableData: React.Dispatch<React.SetStateAction<unregisteredOwners[]>>
  serialOffset: number
  onAvailabilityChange?: () => void
}): ReactElement {
  const columns = [
    { label: "S.No", field: "serial", sortable: false },
    { label: "Name", field: "name", sortable: true },
    { label: <Phone size={16} />, field: "phoneNumber", sortable: false },
    { label: "Location", field: "location", sortable: true },
    { label: "Price", field: "price", sortable: true },
    { label: "Area", field: "area", sortable: false },
    { label: "Avail.", field: "availability", sortable: true },
    { label: "Int. Status", field: "intStatus", sortable: false },
    { label: "Pet. Status", field: "petStatus", sortable: false },
    { label: "Property Type", field: "propertyType", sortable: false },
    { label: "Address", field: "address", sortable: false },
    { label: "Ref. Link", field: "refLink", sortable: false },
    { label: "VsLink", field: "link", sortable: false },
    { label: "VSID", field: "vsid", sortable: false },
    { label: "Remarks", field: "remarks", sortable: false },
    { label: "Actions", field: "upload", sortable: false },
  ]

  interface TargetType {
    _id: string
    city: string
    areas: AreaType[]
  }
  interface AreaType {
    _id: string
    city: string
    name: string
  }

  const [targets, setTargets] = React.useState<TargetType[]>([])

  const [areas, setAreas] = React.useState<AreaType[]>([])
  const [sortedData, setSortedData] = React.useState<unregisteredOwners[]>([])
  const [sortBy, setSortBy] = React.useState<keyof unregisteredOwners | null>(null)
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc")
  const [locationws, setLocationws] = React.useState<string[]>([])
  const [cityAreas, setCityAreas] = React.useState<Record<string, string[]>>({})
  const [selectedRow, setSelectedRow] = React.useState<string | null>(null)
  const [petStatus, setPetStatus] = React.useState<("Allowed" | "Not Allowed" | "None")[]>(
    Array.from({ length: tableData?.length }, () => "None"),
  )
  const [filterMode, setFilterMode] = React.useState<0 | 1 | 2>(0)
  // 0 = default, 1 = refLink/images, 2 = missing everything

  const interiorStatus = [
    { label: "F", value: "Fully Furnished" },
    { label: "S F", value: "SemiFurnished" },
    { label: "Un", value: "Unfurnished" },
  ]

  const avail = [
    {
      label: "A",
      value: "Available",
    },
    {
      label: "NA",
      value: "Not Available",
    },
  ]
  const { toast } = useToast()

  const token = useAuthStore((state: any) => state.token)

  const handleResponseStatus = async (id: string, index: number) => {
    const currentStatus = tableData[index].isVerified
    const newStatus = currentStatus === "Verified" ? "None" : "Verified"

    // Optimistic UI update — create deep copy of the target object
    const updatedData = tableData.map((item, i) => (i === index ? { ...item, isVerified: newStatus } : item))
    setTableData(updatedData)

    try {
      await axios.put(`/api/unregisteredOwners/updateData/${id}`, {
        field: "isVerified",
        value: newStatus,
      })

      toast({
        title: "Response status updated",
        description: "Owner verified successfully.",
        variant: "default",
      })
    } catch (error) {
      console.error("Response status update failed", error)

      // Rollback to previous state
      const rollbackData = tableData.map((item, i) => (i === index ? { ...item, isVerified: currentStatus } : item))
      setTableData(rollbackData)

      toast({
        title: "Failed to update the Owner status",
        variant: "destructive",
      })
    }
  }

  const handleImportantStatus = async (id: string, index: number) => {
    const currentStatus = tableData[index].isImportant
    const newStatus = currentStatus === "Important" ? "None" : "Important"

    // Optimistic UI update — create deep copy of the target object
    const updatedData = tableData.map((item, i) => (i === index ? { ...item, isImportant: newStatus } : item))
    setTableData(updatedData)

    try {
      await axios.put(`/api/unregisteredOwners/updateData/${id}`, {
        field: "isImportant",
        value: newStatus,
      })

      toast({
        title: "Response status updated",
        description: "Important set successfully.",
        variant: "default",
      })
    } catch (error) {
      console.error("Response status update failed", error)

      // Rollback to previous state
      const rollbackData = tableData.map((item, i) => (i === index ? { ...item, isImportant: currentStatus } : item))
      setTableData(rollbackData)

      toast({
        title: "Failed to update the Owner status",
        variant: "destructive",
      })
    }
  }

  const handlePinnedStatus = async (id: string, index: number) => {
    const currentStatus = tableData[index].isPinned
    const newStatus = currentStatus === "Pinned" ? "None" : "Pinned"

    // Optimistic UI update — create deep copy of the target object
    const updatedData = tableData.map((item, i) => (i === index ? { ...item, isPinned: newStatus } : item))
    setTableData(updatedData)

    try {
      await axios.put(`/api/unregisteredOwners/updateData/${id}`, {
        field: "isPinned",
        value: newStatus,
      })

      toast({
        title: "Response status updated",
        description: "Pin set successfully.",
        variant: "default",
      })
    } catch (error) {
      console.error("Response status update failed", error)

      // Rollback to previous state
      const rollbackData = tableData.map((item, i) => (i === index ? { ...item, isPinned: currentStatus } : item))
      setTableData(rollbackData)

      toast({
        title: "Failed to update the Owner status",
        variant: "destructive",
      })
    }
  }

  const applyFilter = (data: unregisteredOwners[]) => {
    if (filterMode === 1) {
      return data.filter(
        (item) =>
          ((item.referenceLink && item.referenceLink.trim() !== "") || (item.imageUrls && item.imageUrls.length > 0)) &&
          (!item.VSID || (item.VSID.trim() === "" && !item.link) || item.link.trim() === ""),
      )
    }

    if (filterMode === 2) {
      return data.filter(
        (item) =>
          (!item.VSID || item.VSID.trim() === "") &&
          (!item.link || item.link.trim() === "") &&
          (!item.referenceLink || item.referenceLink.trim() === "") &&
          (!item.imageUrls || item.imageUrls.length === 0),
      )
    }

    return data // filterMode === 0 → default
  }

  React.useEffect(() => {
    if (sortBy) {
      applySort(sortBy, sortOrder)
    } else {
      setSortedData(tableData) // no sort applied
    }
  }, [tableData])

  React.useEffect(() => {
    const getAllLocations = async () => {
      try {
        // 1. Fetch all locations
        const res = await axios.get(`/api/addons/target/getAlLocations`)
        const fetchedCities: string[] = res.data.data.map((loc: any) => loc.city)

        setLocationws(fetchedCities)

        // make city → area mapping (just area names)
        const cityAreaMap: Record<string, string[]> = {}
        res.data.data.forEach((loc: any) => {
          cityAreaMap[loc.city] = (loc.area || []).map(
            (a: any) => a.name, // extract only name
          )
        })

        setCityAreas(cityAreaMap)
      } catch (error) {
        console.error("Error fetching locations:", error)
        setLocationws([])
      }
    }

    const fetchTargets = async () => {
      try {
        const res = await axios.get("/api/addons/target/getAreaFilterTarget")
        // const data = await res.json();
        setTargets(res.data.data)
      } catch (error) {
        console.error("Error fetching targets:", error)
      }
    }
    fetchTargets()

    // getAllLocations();
  }, [])

  const handleAddRow = async () => {
    const tempRow: Omit<unregisteredOwners, "_id"> = {
      VSID: "",
      name: "",
      phoneNumber: "",
      location: "",
      price: "",
      interiorStatus: "Fully Furnished",
      petStatus: "None",
      propertyType: "studio",
      link: "",
      area: "",
      referenceLink: "",
      address: "",
      remarks: "",
      availability: "Available",
      date: new Date(),
      imageUrls: [],
      isVerified: "None",
      isImportant: "None",
      isPinned: "None",
    }
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    const optimisticRow = { ...tempRow, _id: tempId }

    setTableData((prev) => [optimisticRow, ...prev])

    try {
      const res = await axios.post(`/api/unregisteredOwners/addUser`, tempRow)
      const savedRow = res.data.data

      if (!savedRow || !savedRow._id) {
        throw new Error("Backend response missing _id field")
      }

      setTableData((prev) => {
        const updatedData = prev.map((item) => {
          if (item._id === tempId) {
            return { ...savedRow }
          }
          return item
        })

        // Verify the replacement actually happened
        const hasTemp = updatedData.some((item) => item._id === tempId)
        const hasReal = updatedData.some((item) => item._id === savedRow._id)

        if (hasTemp) {
          console.warn("Temp row still exists after replacement!")
        }
        if (!hasReal) {
          console.warn("Real row not found after replacement!")
        }

        return updatedData
      })
    } catch (error) {
      console.error("Row creation failed", error)
      // console.log("Rolling back optimistic update for tempId:", tempId);
      setTableData((prev) => {
        const rolledBack = prev.filter((row) => row._id !== tempId)
        // console.log("Rollback complete, remaining rows:", rolledBack.length);
        return rolledBack
      })

      alert("Failed to add new lead. Please try again.")
    }
  }

  const getPropertyTypeColor = (propertyType: string) => {
    return propertyTypeColors[propertyType] || "bg-gray-100 dark:bg-gray-900/30"
  }

  const applySort = (field: keyof unregisteredOwners, order: "asc" | "desc") => {
    const sorted = [...tableData].sort((a, b) => {
      const aVal = a[field]
      const bVal = b[field]

      if (aVal === undefined || bVal === undefined) return 0

      if (typeof aVal === "number" && typeof bVal === "number") {
        return order === "asc" ? aVal - bVal : bVal - aVal
      }

      return order === "asc" ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal))
    })

    setSortedData(sorted)
  }

  const handleSort = (field: keyof unregisteredOwners) => {
    let newOrder: "asc" | "desc" = "asc"
    if (sortBy === field) {
      newOrder = sortOrder === "asc" ? "desc" : "asc" // toggle
    }
    setSortBy(field)
    setSortOrder(newOrder)
    applySort(field, newOrder)
  }

  const handleSave = async (_id: string, key: keyof unregisteredOwners, newValue: string) => {
    // optimistic UI update

    const prev = tableData
    const updatedData = tableData.map((item) => (item._id === _id ? { ...item, [key]: newValue } : item))
    setTableData(updatedData)

    try {
      await axios.put(`/api/unregisteredOwners/updateData/${_id}`, {
        field: key,
        value: newValue,
      })
      toast({
        title: "Response status updated",
        description: "Lead verified successfully.",
        variant: "default", // optional
      })

      if (key === "availability" && onAvailabilityChange) {
        onAvailabilityChange()
      }
    } catch (error) {
      console.error("Update failed", error)
      toast({
        title: "Error deleting lead",
        variant: "destructive",
      })
      // rollback if API fails
      setTableData(prev)
    }
  }

  React.useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "Delete" && selectedRow) {
        setTableData((prev) => prev.filter((row) => row._id !== selectedRow))
        setSelectedRow(null)

        const res = await axios.delete(`/api/unregisteredOwners/updateData/${selectedRow}`)
        if (res.status === 200) {
          toast({
            title: "Response status updated",
            description: "Owner Deleted successfully.",
            variant: "default", // optional
          })
        } else {
          toast({
            title: "Error deleting Owner",
            variant: "destructive",
          })
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedRow])

  const handlePetStatus = (petId: string | undefined, index: number) => {
    if (!petId) return

    const newPetStatus = [...petStatus]
    const newMessage = newPetStatus[index]

    if (newPetStatus[index] === "None") {
      newPetStatus[index] = "Allowed"
      tableData[index].petStatus = "Allowed"
    } else if (newPetStatus[index] === "Allowed") {
      newPetStatus[index] = "Not Allowed"
      tableData[index].petStatus = "Not Allowed"
    } else {
      newPetStatus[index] = "None"
      tableData[index].petStatus = "None"
    }

    setPetStatus(newPetStatus)
    changePetStatus(petId, newPetStatus[index])
  }

  const changePetStatus = React.useCallback(
    debounce(async (petId: string, status: string) => {
      const response = await axios.post("/api/unregisteredOwners/updatePetStatus", {
        petId,
        changedStatus: status,
      })
    }, 1000),
    [],
  )

  function UploadCell({ item, onUploadComplete }: UploadCellProps) {
    const { uploadFiles, loading } = useBunnyUpload()
    const [isUploading, setIsUploading] = React.useState(false)
    const [hasImages, setHasImages] = React.useState(!!(item.imageUrls && item.imageUrls.length > 0))
    const fileInputRef = React.useRef<HTMLInputElement | null>(null)
    const { toast } = useToast()

    // Update hasImages when item.imageUrls changes
    React.useEffect(() => {
      setHasImages(!!(item.imageUrls && item.imageUrls.length > 0))
    }, [item.imageUrls])

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files
      if (!files || files.length === 0) {
        console.log("No files selected")
        return
      }

      console.log("Files selected:", files.length)
      const currentInput = event.target
      const fileList = Array.from(files)
      currentInput.value = ""

      setIsUploading(true)

      try {
        console.log("Starting upload...")
        const { imageUrls, error } = await uploadFiles(fileList, "Uploads")
        console.log("Upload result:", { imageUrls, error })

        if (error || !imageUrls?.length) {
          console.error("Upload failed:", error)
          toast({
            title: "Upload failed",
            description: error || "No URLs returned.",
            variant: "destructive",
          })
          setIsUploading(false)
          return
        }

        const existingUrls = item.imageUrls || []
        const allImageUrls = [...existingUrls, ...imageUrls]
        console.log("Saving to server:", allImageUrls)

        const response = await axios.put(`/api/unregisteredOwners/updateData/${item._id}`, {
          field: "imageUrls",
          value: allImageUrls,
        })
        console.log("Server response:", response.status)

        // Update parent state immediately
        if (onUploadComplete) {
          onUploadComplete(item._id, allImageUrls)
          console.log("Parent state updated")
        }

        // Update local state immediately for instant visual feedback
        setHasImages(true)

        toast({
          title: "Uploaded successfully",
          description: `${imageUrls.length} image(s) uploaded.`,
        })
      } catch (err) {
        console.error("Upload error:", err)
        toast({
          title: "Failed to update server",
          description: "An error occurred while saving image URLs.",
          variant: "destructive",
        })
      } finally {
        setIsUploading(false)
        console.log("Upload process complete")
      }
    }

    return (
      <div onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          multiple
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileChange}
          key={item._id}
        />
        <Button
          variant="ghost"
          size="icon"
          className="p-0 h-6 w-6"
          disabled={loading || isUploading}
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            console.log("Button clicked!")
            if (loading || isUploading) {
              console.log("Blocked: loading or uploading")
              return
            }
            if (fileInputRef.current) {
              console.log("Triggering file input click")
              fileInputRef.current.click()
            }
          }}
          onMouseDown={(e) => {
            e.stopPropagation()
          }}
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          ) : (
            <ImageUp
              className={`h-4 w-4 ${hasImages ? "text-green-600 dark:text-green-500" : "text-muted-foreground"}`}
            />
          )}
        </Button>
      </div>
    )
  }

  function DownloadCell({ item }: { item: unregisteredOwners }) {
    const handleDownloadZip = async () => {
      if (!item.imageUrls || item.imageUrls.length === 0) {
        alert("No images to download")
        return
      }

      const zip = new JSZip()

      // Fetch and add each image to the zip
      for (let i = 0; i < item.imageUrls.length; i++) {
        const url = item.imageUrls[i]
        try {
          const response = await fetch(url)
          const blob = await response.blob()
          const filename = url.split("/").pop() || `image-${i + 1}.jpg`
          zip.file(filename, blob)
        } catch (err) {
          console.error(`Failed to fetch ${url}`, err)
        }
      }

      // Generate and trigger download
      const content = await zip.generateAsync({ type: "blob" })
      saveAs(content, `${item.name || "images"}.zip`)
    }

    return (
      <Button variant="ghost" size="icon" className="p-0 h-6 w-6" onClick={handleDownloadZip}>
        <Download className="h-4 w-4 text-muted-foreground" />
      </Button>
    )
  }

  interface ActionMenuProps {
    item: unregisteredOwners
    onUploadComplete?: (id: string, newUrls: string[]) => void
  }

  function ActionMenu({ item, onUploadComplete }: ActionMenuProps) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="p-0 h-6 w-6" onClick={(e) => e.stopPropagation()}>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuItem asChild>
            <div onClick={(e) => e.stopPropagation()}>
              <UploadCell item={item} onUploadComplete={onUploadComplete} />
              <span className="ml-2 text-sm">Upload</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <div onClick={(e) => e.stopPropagation()}>
              <DownloadCell item={item} />
              <span className="ml-2 text-sm">Download</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  interface RemarksDropdownProps {
    item: unregisteredOwners
    onSave: (id: string, field: keyof unregisteredOwners, value: string) => void
  }

  function RemarksDropdown({ item, onSave }: RemarksDropdownProps) {
    // Ensure remarks is always an array
    const initialRemarks = item.remarks ? item.remarks.split("\n") : []

    const [remarks, setRemarks] = React.useState<string[]>(initialRemarks)
    const [newRemark, setNewRemark] = React.useState("")

    const handleAddRemark = () => {
      if (!newRemark.trim()) return
      const updatedRemarks = [...remarks, newRemark]
      setRemarks(updatedRemarks)
      onSave(item._id, "remarks", updatedRemarks.join("\n"))
      setNewRemark("")
    }

    const handleDeleteRemark = (index: number) => {
      const updatedRemarks = remarks.filter((_, i) => i !== index)
      setRemarks(updatedRemarks)
      onSave(item._id, "remarks", updatedRemarks.join("\n"))
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="truncate max-w-[120px] text-xs h-6 bg-transparent"
            title={remarks.join(", ")}
          >
            <CiTextAlignCenter />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-74 p-3 space-y-3">
          <div className="space-y-2 max-h-54 overflow-y-auto">
            <p className="text-sm font-medium">Previous Remarks:</p>
            {remarks.length > 0 ? (
              remarks.map((remark, index) => (
                <div key={index} className="flex justify-between items-center text-sm bg-muted p-2 rounded-md">
                  <span className="break-words">{remark}</span>
                  <button
                    className="ml-2 text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400"
                    onClick={() => handleDeleteRemark(index)}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No remarks yet</p>
            )}
          </div>

          <Separator />

          <div className="flex gap-2">
            <Input
              value={newRemark}
              onChange={(e) => setNewRemark(e.target.value)}
              placeholder="Add a remark"
              className="text-sm"
            />
            <Button size="sm" onClick={handleAddRemark}>
              Save
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  interface UploadCellProps {
    item: unregisteredOwners
    onUploadComplete?: (id: string, newUrls: string[]) => void
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Button onClick={handleAddRow} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add New Lead
        </Button>
        <Button variant="outline" onClick={() => setFilterMode((prevMode) => ((prevMode + 1) % 3) as 0 | 1 | 2)}>
          {filterMode === 0 && "Show Filter Options"}
          {filterMode === 1 && "Show Missing Everything"}
          {filterMode === 2 && "Show All"}
        </Button>
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <Table className="text-xs">
          <TableCaption>A list of your unregistered owners.</TableCaption>

          <TableHeader className="sticky top-0 bg-background z-10 border-b">
            <TableRow className="hover:bg-background">
              {columns.map((col) => (
                <TableHead
                  key={col.field}
                  onClick={col.sortable ? () => handleSort(col.field as keyof unregisteredOwners) : undefined}
                  className={`${col.sortable ? "cursor-pointer select-none" : ""} px-2 py-1 h-8 text-xs font-semibold`}
                >
                  {col.label} {col.sortable && sortBy === col.field ? (sortOrder === "asc" ? "↑" : "↓") : ""}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {applyFilter(sortedData).map((item: unregisteredOwners, index: number) => (
              <TableRow
                key={item?._id}
                onClick={() => setSelectedRow(item._id)}
                className={`cursor-pointer hover:bg-accent/50 ${selectedRow === item._id ? "bg-accent" : ""} ${
                  (!item.VSID || item.VSID.trim() === "") &&
                  (!item.link || item.link.trim() === "") &&
                  (!item.referenceLink || item.referenceLink.trim() === "") &&
                  (!item.imageUrls || item.imageUrls.length === 0)
                    ? "bg-red-100 dark:bg-red-900/30" // red if all three are missing
                    : (!item.VSID || item.VSID.trim() === "") && (!item.link || item.link.trim() === "")
                      ? "bg-blue-100 dark:bg-blue-900/30" // blue if VSID & link missing
                      : ""
                }`}
              >
                <TableCell className="font-medium flex items-center gap-1 px-2 py-1 h-8">
                  {serialOffset + index + 1}

                  {token?.role === "Advert" && (
                    <span className="cursor-pointer" onClick={() => handleResponseStatus(item?._id, index)}>
                      {item?.isVerified === "Verified" ? (
                        <CustomTooltip icon={<CheckCheck color="green" size={14} />} desc="Verified" />
                      ) : (
                        <CustomTooltip icon={<CircleDot className="text-muted-foreground" size={14} />} desc="None" />
                      )}
                    </span>
                  )}

                  {(token?.role === "Sales" || token?.role === "Sales-TeamLead" || token?.role === "SuperAdmin") && (
                    <span className="cursor-pointer" onClick={() => handleImportantStatus(item?._id, index)}>
                      {item?.isImportant === "Important" ? (
                        <CustomTooltip icon={<Star color="yellow" fill="yellow" size={14} />} desc="Important" />
                      ) : (
                        <CustomTooltip icon={<CircleDot className="text-muted-foreground" size={14} />} desc="None" />
                      )}
                    </span>
                  )}

                  {(token?.role === "Sales" || token?.role === "Sales-TeamLead" || token?.role === "SuperAdmin") && (
                    <span className="cursor-pointer" onClick={() => handlePinnedStatus(item?._id, index)}>
                      {item?.isPinned === "Pinned" ? (
                        <CustomTooltip icon={<Pin color="red" fill="red" size={14} />} desc="Pinned" />
                      ) : (
                        <CustomTooltip icon={<CircleDot className="text-muted-foreground" size={14} />} desc="None" />
                      )}
                    </span>
                  )}
                </TableCell>

                {/* Name */}
                <TableCell className="font-medium truncate max-w-[150px] px-2 py-1 h-8">
                  <EditableCell
                    value={item.name}
                    onSave={(newValue) => handleSave(item?._id, "name", newValue)}
                    maxWidth="150px"
                  />
                </TableCell>

                {/* Phone Number */}
                <TableCell className="px-2 py-1 h-8">
                  <EditableCopyCell
                    value={item?.phoneNumber?.toString()}
                    onSave={(newValue) => handleSave(item._id, "phoneNumber", newValue)}
                  />
                </TableCell>

                {/* Location */}
                <TableCell className="truncate max-w-[150px] px-2 py-1 h-8" title={item.location}>
                  <SelectableCell
                    maxWidth="100px"
                    value={item.location}
                    data={targets.map((target) => target.city)}
                    save={(newValue: string) => handleSave(item._id, "location", newValue)}
                  />
                </TableCell>

                {/* Price */}
                <TableCell className="px-2 py-1 h-8">
                  <EditableCell
                    maxWidth="70px"
                    value={item.price}
                    onSave={(newValue) => handleSave(item._id, "price", newValue)}
                  />
                </TableCell>

                {/* Area */}
                <TableCell className="px-2 py-1 h-8">
                  <AreaSelect
                    maxWidth="100px"
                    data={(targets.find((t) => t.city === item.location)?.areas || [])
                      .map((a) => ({
                        label: a.name,
                        value: a.name,
                      }))
                      .sort((a, b) => a.label.localeCompare(b.label))}
                    value={item.area || ""}
                    save={(newValue: string) => handleSave(item._id, "area", newValue)}
                    tooltipText="Select an area"
                  />
                </TableCell>

                {/* Availability */}
                <TableCell className="px-2 py-1 h-8">
                  <SelectableCell
                    maxWidth="100px"
                    data={avail}
                    value={item.availability}
                    save={(newValue: string) => handleSave(item._id, "availability", newValue)}
                  />
                </TableCell>

                {/* Int. Status */}
                <TableCell className="px-2 py-1 h-8">
                  <SelectableCell
                    maxWidth="200px"
                    data={interiorStatus}
                    value={item.interiorStatus}
                    save={(newValue: string) => handleSave(item._id, "interiorStatus", newValue)}
                  />
                </TableCell>

                {/* Pet Status */}
                <TableCell className="cursor-pointer px-2 py-1 h-8" onClick={() => handlePetStatus(item?._id, index)}>
                  {item.petStatus === "Allowed" ? (
                    <CustomTooltip icon={<PawPrint color="green" size={14} />} desc="First Message" />
                  ) : item.petStatus === "Not Allowed" ? (
                    <CustomTooltip icon={<Ban color="yellow" size={14} />} desc="Second Message" />
                  ) : (
                    <CustomTooltip icon={<CircleDot fill="" color="gray" size={14} />} desc="No Status" />
                  )}
                </TableCell>

                {/* Property Type */}
                <TableCell className="px-2 py-1 h-8">
                  <div className={`rounded-md px-1 py-0.5 ${getPropertyTypeColor(item.propertyType)}`}>
                    <SelectableCell
                      maxWidth="200px"
                      data={apartmentTypes}
                      value={item.propertyType}
                      save={(newValue: string) => handleSave(item._id, "propertyType", newValue)}
                    />
                  </div>
                </TableCell>

                {/* Address */}
                <TableCell className="truncate max-w-[150px] px-2 py-1 h-8" title={item.address}>
                  <EditableCell
                    maxWidth="200px"
                    value={item.address}
                    onSave={(newValue) => handleSave(item._id, "address", newValue)}
                  />
                </TableCell>

                {/* Ref. Link */}
                <TableCell className="text-right truncate max-w-[60px] px-2 py-1 h-8" title={item.referenceLink}>
                  <div className="flex items-center gap-1">
                    <EditableCell
                      value={item.referenceLink}
                      onSave={(newValue) => handleSave(item._id, "referenceLink", newValue)}
                      maxWidth="60px"
                    />
                  </div>
                  {item.referenceLink && item.referenceLink !== "-" && (
                    <a
                      href={
                        item.referenceLink.startsWith("http") ? item.referenceLink : `https://${item.referenceLink}`
                      }
                      target="_blank"
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 ml-1"
                      rel="noreferrer"
                      title="Open reference link in new tab"
                    >
                      🔗
                    </a>
                  )}
                </TableCell>

                {/* VsLink */}
                <TableCell className="text-right truncate max-w-[60px] px-2 py-1 h-8" title={item.link}>
                  <div className="flex items-center gap-1">
                    {["Advert", "SuperAdmin"].includes(token?.role) ? (
                      <EditableCell
                        value={item.link}
                        onSave={(newValue) => handleSave(item._id, "link", newValue)}
                        maxWidth="60px"
                      />
                    ) : (
                      <span className="truncate block max-w-[60px]">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="ml-1 text-xs h-6 p-0"
                          onClick={() => navigator.clipboard.writeText(item.link)}
                        >
                          <Copy size={14} />
                        </Button>
                      </span>
                    )}
                  </div>

                  {item.link && item.link !== "-" && (
                    <a
                      href={item.link.startsWith("http") ? item.link : `https://${item.link}`}
                      target="_blank"
                      className="text-blue-500 hover:text-blue-700 ml-1"
                      rel="noreferrer"
                      title="Open link in new tab"
                    >
                      🔗
                    </a>
                  )}
                </TableCell>

                {/* VSID */}
                <TableCell className="font-medium truncate max-w-[150px] px-2 py-1 h-8">
                  {["Advert", "SuperAdmin"].includes(token?.role) ? (
                    <EditableCell
                      value={item.VSID}
                      onSave={(newValue) => handleSave(item?._id, "VSID", newValue)}
                      maxWidth="150px"
                    />
                  ) : (
                    <span className="truncate block max-w-[150px]">{item.VSID}</span>
                  )}
                </TableCell>

                {/* Remarks */}
                <TableCell className="text-right truncate max-w-[120px] px-2 py-1 h-8" title={item.remarks}>
                  <RemarksDropdown item={item} onSave={handleSave} />
                </TableCell>

                <TableCell className="px-2 py-1 h-8" onClick={(e) => e.stopPropagation()}>
                  <ActionMenu
                    item={item}
                    onUploadComplete={(id, newUrls) => {
                      setTableData((prev) => prev.map((row) => (row._id === id ? { ...row, imageUrls: newUrls } : row)))
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
