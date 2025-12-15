"use client";

import {
  Copy,
  Loader2,
  BookUser,
  ArrowUp01,
  LucideIcon,
  ShieldPlus,
  AlertTriangle,
  Plus,
  Trash2,
  Mail,
  MailCheck,
  MailX,
  Clock,
  Building2,
  UserCheck,
  TrendingUp,
  CalendarRange,
  CheckCircle2,
  XCircle,
  Target,
  Award,
  Star,
  Trophy,
} from "lucide-react";
import axios from "axios";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import React, { useEffect, useState } from "react";

import {
  User,
  Flag,
  Home,
  Phone,
  Globe,
  AtSign,
  Calendar,
  Languages,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogTitle,
  AlertDialogHeader,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogFooter,
  AlertDialogContent,
  AlertDialogTrigger,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import Loader from "@/components/loader";
import Heading from "@/components/Heading";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  EmployeeInterface,
  WarningRecord,
  WarningType,
  PIPRecord,
  PIPLevel,
  AppreciationRecord,
  AppreciationType,
} from "@/util/type";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmailPreviewDialog } from "@/components/EmailPreviewDialog";

interface PageProps {
  params: {
    id: string[];
  };
}

const statusVariants = {
  inactive: { x: 3 },
  active: { x: 48 },
};

// Warning type labels and colors
const WARNING_TYPE_CONFIG: Record<
  WarningType,
  { label: string; color: string; icon: string }
> = {
  disciplineIssue: {
    label: "Discipline Issue",
    color: "bg-red-500/10 text-red-600 border-red-500/30",
    icon: "🚫",
  },
  lateAttendance: {
    label: "Late Attendance",
    color: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    icon: "⏰",
  },
  unplannedLeaves: {
    label: "Unplanned Leaves",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/30",
    icon: "📅",
  },
  poshWarning: {
    label: "POSH Warning",
    color: "bg-purple-500/10 text-purple-600 border-purple-500/30",
    icon: "⚠️",
  },
  combinedWarning: {
    label: "Combined Warning",
    color: "bg-red-700/10 text-red-700 border-red-700/30",
    icon: "🔴",
  },
};

// PIP level labels and colors
const PIP_LEVEL_CONFIG: Record<
  PIPLevel,
  { label: string; shortLabel: string; color: string; icon: string }
> = {
  forTrainees: {
    label: "For Trainees",
    shortLabel: "For Trainees",
    color: "bg-green-500/10 text-green-600 border-green-500/30",
    icon: "📘",
  },
  level1: {
    label: "Level 1 - Supportive Guidance",
    shortLabel: "Level 1",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/30",
    icon: "📘",
  },
  level2: {
    label: "Level 2 - Strict Monitoring",
    shortLabel: "Level 2",
    color: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    icon: "📙",
  },
  level3: {
    label: "Level 3 - Final Warning",
    shortLabel: "Level 3",
    color: "bg-red-500/10 text-red-600 border-red-500/30",
    icon: "📕",
  },
};

const PIP_STATUS_CONFIG = {
  active: { label: "Active", color: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  completed: { label: "Completed", color: "bg-green-500/10 text-green-600 border-green-500/30" },
  failed: { label: "Failed", color: "bg-red-500/10 text-red-600 border-red-500/30" },
};

// Appreciation type labels and colors
const APPRECIATION_TYPE_CONFIG: Record<
  AppreciationType,
  { label: string; color: string; icon: string }
> = {
  outstandingContribution: {
    label: "Outstanding Contribution",
    color: "bg-green-500/10 text-green-600 border-green-500/30",
    icon: "🌟",
  },
  outstandingAchievement: {
    label: "Outstanding Achievement",
    color: "bg-purple-500/10 text-purple-600 border-purple-500/30",
    icon: "🏆",
  },
  excellentAttendance: {
    label: "Excellent Attendance",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/30",
    icon: "⭐",
  },
};

export default function EmployeeProfilePage({ params }: PageProps) {
  const userId = params.id[0];
  const { toast } = useToast();
  const [user, setUser] = useState<EmployeeInterface>();
  const [loadinguserDetails, setLoadinguserDetails] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);

  // Warning Section State - declared before getUserDetails
  const [warnings, setWarnings] = useState<WarningRecord[]>([]);
  const [warningDialogOpen, setWarningDialogOpen] = useState(false);
  const [sendingWarning, setSendingWarning] = useState(false);
  const [deletingWarningId, setDeletingWarningId] = useState<string | null>(null);
  const [newWarning, setNewWarning] = useState({
    warningType: "" as WarningType | "",
    department: "",
    reportingManager: "",
    date: "",
    notes: "",
    sendEmail: true,
  });

  // PIP Section State
  const [pips, setPips] = useState<PIPRecord[]>([]);
  const [pipDialogOpen, setPipDialogOpen] = useState(false);
  const [sendingPIP, setSendingPIP] = useState(false);
  const [deletingPIPId, setDeletingPIPId] = useState<string | null>(null);
  const [newPIP, setNewPIP] = useState({
    pipLevel: "" as PIPLevel | "",
    startDate: "",
    endDate: "",
    concerns: [""],
    notes: "",
    sendEmail: true,
  });

  // Appreciation Section State
  const [appreciations, setAppreciations] = useState<AppreciationRecord[]>([]);
  const [appreciationDialogOpen, setAppreciationDialogOpen] = useState(false);
  const [sendingAppreciation, setSendingAppreciation] = useState(false);
  const [deletingAppreciationId, setDeletingAppreciationId] = useState<string | null>(null);
  const [newAppreciation, setNewAppreciation] = useState({
    appreciationType: "" as AppreciationType | "",
    notes: "",
    sendEmail: true,
  });

  // Email Preview State
  const [emailPreviewOpen, setEmailPreviewOpen] = useState(false);
  const [emailPreviewSubject, setEmailPreviewSubject] = useState("");
  const [emailPreviewHtml, setEmailPreviewHtml] = useState("");
  const [emailPreviewType, setEmailPreviewType] = useState<"warning" | "pip" | "appreciation" | null>(null);
  const [emailPreviewPayload, setEmailPreviewPayload] = useState<any>(null);

  const getUserDetails = async () => {
    try {
      setLoadinguserDetails(true);
      const response = await axios.post("/api/employee/getEmployeeDetails", {
        userId,
      });
      setIsActive(response?.data?.data?.isActive ?? false);
      setIsFeatured(response?.data?.data?.isfeatured ?? false);
      if (response.status == 404) {
        toast({
          variant: "destructive",
          title: "Uh oh! Error",
          description: "Looks like the user doesn't exist.",
        });
        setLoadinguserDetails(false);
      } else {
        setUser(response?.data?.data);
        setWarnings(response?.data?.data?.warnings || []);
        setPips(response?.data?.data?.pips || []);
        setAppreciations(response?.data?.data?.appreciations || []);
        setLoadinguserDetails(false);
      }
    } catch (error: any) {
      console.log(error);
      setLoadinguserDetails(false);
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: `Some error occured ${error}`,
      });
    }
  };
  useEffect(() => {
    getUserDetails();
  }, []);

  const [copySuccess, setCopySuccess] = useState("");
  const [generatingPassword, setGeneratingPassword] = useState<boolean>(false);
  const [newpassword, setNewPassword] = useState<string>("");

  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(newpassword)
      .then(() => {
        setCopySuccess("Password copied!");
        toast({
          description: "Password copied successfully",
        });
      })
      .catch((err) => {
        setCopySuccess("Failed to copy!");
        toast({
          description: "An error occurred while processing your request.",
        });
        console.error("Error copying text: ", err);
      });
  };

  const passwordGeneration = async () => {
    try {
      setGeneratingPassword(true);
      const resposne = await axios.post("/api/generateNewpassword", {
        employeeId: userId,
      });

      setNewPassword(resposne.data.newPassword);
      setGeneratingPassword(false);
    } catch (error: any) {
      console.log(error, "Password error will be render here");

      setGeneratingPassword(false);
      return error;
    }
  };
  const [open, setOpen] = useState(false);

  const handleConfirm = () => {
    setOpen(false);
    setGeneratingPassword(true);
    passwordGeneration();
  };

  const handleStatusChange = async (active: boolean) => {
    setIsActive(active);
    try {
      const statusResponse = await axios.put("/api/employee/editEmployee", {
        _id: user?._id,
        isActive: active,
      });
    } catch (error) {
      setIsActive(!active);
      alert("Status cannot be changed");
    }
  };

  const handleFeaturedChange = async (featured: boolean) => {
    setIsFeatured(featured);
    try {
      await axios.put("/api/employee/editEmployee", {
        _id: user?._id,
        isfeatured: featured,
      });
    } catch (error) {
      setIsFeatured(!featured);
      alert("Featured cannot be changed");
    }
  };

  const resetWarningForm = () => {
    setNewWarning({
      warningType: "",
      department: "",
      reportingManager: "",
      date: "",
      notes: "",
      sendEmail: true,
    });
  };

  const handleSendWarning = async () => {
    if (
      !newWarning.warningType ||
      !newWarning.department ||
      !newWarning.reportingManager ||
      !newWarning.date
    ) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description:
          "Please fill all required fields (Warning Type, Department, Reporting Manager, Date).",
      });
      return;
    }

    if (!newWarning.sendEmail || !user?.email) {
      // If email is not to be sent, directly save without preview
      try {
        setSendingWarning(true);
        const response = await axios.post("/api/employee/warnings", {
          employeeId: userId,
          warningType: newWarning.warningType,
          department: newWarning.department,
          reportingManager: newWarning.reportingManager,
          date: newWarning.date,
          issuedBy: "Admin",
          notes: newWarning.notes,
          sendEmail: false,
        });

        if (response?.data?.success) {
          await getUserDetails();
          resetWarningForm();
          setWarningDialogOpen(false);
          toast({
            title: "Warning recorded",
            description: "Warning has been recorded without sending email.",
          });
        }
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error?.response?.data?.error || "Failed to record warning",
        });
      } finally {
        setSendingWarning(false);
      }
      return;
    }

    // Generate email template and show preview
    try {
      setSendingWarning(true);
      const templateResponse = await axios.post("/api/email/generateTemplate", {
        type: "warning",
        payload: {
          to: user?.email,
          employeeName: user?.name,
          warningType: newWarning.warningType,
          department: newWarning.department,
          reportingManager: newWarning.reportingManager,
          date: newWarning.date,
          dateTime: newWarning.date,
          companyName: "Zairo International",
        },
      });

      if (templateResponse?.data?.success) {
        setEmailPreviewSubject(templateResponse.data.subject);
        setEmailPreviewHtml(templateResponse.data.html);
        setEmailPreviewType("warning");
        setEmailPreviewPayload({
          employeeId: userId,
          warningType: newWarning.warningType,
          department: newWarning.department,
          reportingManager: newWarning.reportingManager,
          date: newWarning.date,
          issuedBy: "Admin",
          notes: newWarning.notes,
          sendEmail: true,
        });
        setWarningDialogOpen(false);
        setEmailPreviewOpen(true);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.response?.data?.error || "Failed to generate email template",
      });
    } finally {
      setSendingWarning(false);
    }
  };

  const handleSendWarningWithCustomEmail = async (subject: string, html: string) => {
    try {
      setSendingWarning(true);
      const response = await axios.post("/api/employee/warnings", {
        ...emailPreviewPayload,
        customEmailSubject: subject,
        customEmailHtml: html,
      });

      if (response?.data?.success) {
        await getUserDetails();
        resetWarningForm();
        setEmailPreviewOpen(false);
        toast({
          title: response?.data?.emailSent
            ? "Warning sent successfully"
            : "Warning recorded",
          description: response?.data?.emailSent
            ? `Warning email has been sent to ${user?.email}`
            : "Warning has been recorded without sending email.",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.response?.data?.error || "Failed to send warning",
      });
    } finally {
      setSendingWarning(false);
    }
  };

  const handleDeleteWarning = async (warningId: string) => {
    try {
      setDeletingWarningId(warningId);
      const response = await axios.delete("/api/employee/warnings", {
        data: { employeeId: userId, warningId },
      });

      if (response?.data?.success) {
        // Refetch employee details to get updated warnings
        await getUserDetails();
        toast({
          title: "Warning removed",
          description: "The warning has been removed from the record.",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error?.response?.data?.error || "Failed to delete warning.",
      });
    } finally {
      setDeletingWarningId(null);
    }
  };

  // PIP Functions
  const resetPIPForm = () => {
    setNewPIP({
      pipLevel: "",
      startDate: "",
      endDate: "",
      concerns: [""],
      notes: "",
      sendEmail: true,
    });
  };

  const addConcern = () => {
    setNewPIP({ ...newPIP, concerns: [...newPIP.concerns, ""] });
  };

  const removeConcern = (index: number) => {
    const updatedConcerns = newPIP.concerns.filter((_, i) => i !== index);
    setNewPIP({ ...newPIP, concerns: updatedConcerns.length ? updatedConcerns : [""] });
  };

  const updateConcern = (index: number, value: string) => {
    const updatedConcerns = [...newPIP.concerns];
    updatedConcerns[index] = value;
    setNewPIP({ ...newPIP, concerns: updatedConcerns });
  };

  const handleSendPIP = async () => {
    if (!newPIP.pipLevel || !newPIP.startDate || !newPIP.endDate) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please fill all required fields (PIP Level, Start Date, End Date).",
      });
      return;
    }

    const validConcerns = newPIP.concerns.filter((c) => c.trim() !== "");
    if (validConcerns.length === 0) {
      toast({
        variant: "destructive",
        title: "Missing concerns",
        description: "Please add at least one concern or issue.",
      });
      return;
    }

    if (!newPIP.sendEmail || !user?.email) {
      // If email is not to be sent, directly save without preview
      try {
        setSendingPIP(true);
        const response = await axios.post("/api/employee/pip", {
          employeeId: userId,
          pipLevel: newPIP.pipLevel,
          startDate: newPIP.startDate,
          endDate: newPIP.endDate,
          concerns: validConcerns,
          issuedBy: "Admin",
          notes: newPIP.notes,
          sendEmail: false,
        });

        if (response?.data?.success) {
          await getUserDetails();
          resetPIPForm();
          setPipDialogOpen(false);
          toast({
            title: "PIP recorded",
            description: "PIP has been recorded without sending email.",
          });
        }
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error?.response?.data?.error || "Failed to record PIP",
        });
      } finally {
        setSendingPIP(false);
      }
      return;
    }

    // Generate email template and show preview
    try {
      setSendingPIP(true);
      const templateResponse = await axios.post("/api/email/generateTemplate", {
        type: "pip",
        payload: {
          to: user?.email,
          employeeName: user?.name,
          pipLevel: newPIP.pipLevel,
          startDate: newPIP.startDate,
          endDate: newPIP.endDate,
          concerns: (newPIP.pipLevel === "level1" || newPIP.pipLevel === "forTrainees") ? validConcerns : undefined,
          issues: newPIP.pipLevel === "level2" ? validConcerns : undefined,
          criticalIssues: newPIP.pipLevel === "level3" ? validConcerns : undefined,
          companyName: "Zairo International",
        },
      });

      if (templateResponse?.data?.success) {
        setEmailPreviewSubject(templateResponse.data.subject);
        setEmailPreviewHtml(templateResponse.data.html);
        setEmailPreviewType("pip");
        setEmailPreviewPayload({
          employeeId: userId,
          pipLevel: newPIP.pipLevel,
          startDate: newPIP.startDate,
          endDate: newPIP.endDate,
          concerns: validConcerns,
          issuedBy: "Admin",
          notes: newPIP.notes,
          sendEmail: true,
        });
        setPipDialogOpen(false);
        setEmailPreviewOpen(true);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.response?.data?.error || "Failed to generate email template",
      });
    } finally {
      setSendingPIP(false);
    }
  };

  const handleSendPIPWithCustomEmail = async (subject: string, html: string) => {
    try {
      setSendingPIP(true);
      const response = await axios.post("/api/employee/pip", {
        ...emailPreviewPayload,
        customEmailSubject: subject,
        customEmailHtml: html,
      });

      if (response?.data?.success) {
        await getUserDetails();
        resetPIPForm();
        setEmailPreviewOpen(false);
        toast({
          title: response?.data?.emailSent ? "PIP sent successfully" : "PIP recorded",
          description: response?.data?.emailSent
            ? `PIP email has been sent to ${user?.email}`
            : "PIP has been recorded without sending email.",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.response?.data?.error || "Failed to send PIP",
      });
    } finally {
      setSendingPIP(false);
    }
  };

  const handleUpdatePIPStatus = async (pipId: string, status: "active" | "completed" | "failed") => {
    try {
      const response = await axios.put("/api/employee/pip", {
        employeeId: userId,
        pipId,
        status,
      });

      if (response?.data?.success) {
        await getUserDetails();
        toast({
          title: "PIP status updated",
          description: `PIP has been marked as ${status}.`,
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.response?.data?.error || "Failed to update PIP status.",
      });
    }
  };

  const handleDeletePIP = async (pipId: string) => {
    try {
      setDeletingPIPId(pipId);
      const response = await axios.delete("/api/employee/pip", {
        data: { employeeId: userId, pipId },
      });

      if (response?.data?.success) {
        await getUserDetails();
        toast({
          title: "PIP removed",
          description: "The PIP has been removed from the record.",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.response?.data?.error || "Failed to delete PIP.",
      });
    } finally {
      setDeletingPIPId(null);
    }
  };

  // Appreciation Functions
  const resetAppreciationForm = () => {
    setNewAppreciation({
      appreciationType: "",
      notes: "",
      sendEmail: true,
    });
  };

  const handleSendAppreciation = async () => {
    if (!newAppreciation.appreciationType) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please select an appreciation type.",
      });
      return;
    }

    if (!newAppreciation.sendEmail || !user?.email) {
      // If email is not to be sent, directly save without preview
      try {
        setSendingAppreciation(true);
        const response = await axios.post("/api/employee/appreciations", {
          employeeId: userId,
          appreciationType: newAppreciation.appreciationType,
          issuedBy: "Admin",
          notes: newAppreciation.notes,
          sendEmail: false,
        });

        if (response?.data?.success) {
          await getUserDetails();
          resetAppreciationForm();
          setAppreciationDialogOpen(false);
          toast({
            title: "Appreciation recorded",
            description: "Appreciation has been recorded without sending email.",
          });
        }
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error?.response?.data?.error || "Failed to record appreciation",
        });
      } finally {
        setSendingAppreciation(false);
      }
      return;
    }

    // Generate email template and show preview
    try {
      setSendingAppreciation(true);
      const templateResponse = await axios.post("/api/email/generateTemplate", {
        type: "appreciation",
        payload: {
          to: user?.email,
          employeeName: user?.name,
          appreciationType: newAppreciation.appreciationType,
          companyName: "Zairo International",
        },
      });

      if (templateResponse?.data?.success) {
        setEmailPreviewSubject(templateResponse.data.subject);
        setEmailPreviewHtml(templateResponse.data.html);
        setEmailPreviewType("appreciation");
        setEmailPreviewPayload({
          employeeId: userId,
          appreciationType: newAppreciation.appreciationType,
          issuedBy: "Admin",
          notes: newAppreciation.notes,
          sendEmail: true,
        });
        setAppreciationDialogOpen(false);
        setEmailPreviewOpen(true);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.response?.data?.error || "Failed to generate email template",
      });
    } finally {
      setSendingAppreciation(false);
    }
  };

  const handleSendAppreciationWithCustomEmail = async (subject: string, html: string) => {
    try {
      setSendingAppreciation(true);
      const response = await axios.post("/api/employee/appreciations", {
        ...emailPreviewPayload,
        customEmailSubject: subject,
        customEmailHtml: html,
      });

      if (response?.data?.success) {
        await getUserDetails();
        resetAppreciationForm();
        setEmailPreviewOpen(false);
        toast({
          title: response?.data?.emailSent
            ? "Appreciation sent successfully"
            : "Appreciation recorded",
          description: response?.data?.emailSent
            ? `Appreciation email has been sent to ${user?.email}`
            : "Appreciation has been recorded without sending email.",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.response?.data?.error || "Failed to send appreciation",
      });
    } finally {
      setSendingAppreciation(false);
    }
  };

  const handleDeleteAppreciation = async (appreciationId: string) => {
    try {
      setDeletingAppreciationId(appreciationId);
      const response = await axios.delete("/api/employee/appreciations", {
        data: { employeeId: userId, appreciationId },
      });

      if (response?.data?.success) {
        await getUserDetails();
        toast({
          title: "Appreciation removed",
          description: "The appreciation has been removed from the record.",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error?.response?.data?.error || "Failed to delete appreciation.",
      });
    } finally {
      setDeletingAppreciationId(null);
    }
  };

  return (
    <>
      {loadinguserDetails ? (
        <div className="flex items-center justify-center mt-10">
          <Loader />
        </div>
      ) : (
        <div className="m-auto">
          <div className="mb-1">
            <Heading
              heading="Employee Details"
              subheading="You can generate a new password for the employee"
            />
          </div>
          <Card className=" bg-background ">
            <CardHeader className="flex flex-row items-center gap-4">
              <Avatar className="h-14 w-14">
                <AvatarImage src={user?.profilePic} alt={user?.name} />
                <AvatarFallback>{user?.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-3xl font-bold line-clamp-1 ">
                  {user?.name}
                </CardTitle>
                <p className="text-muted-foreground line-clamp-1">
                  {user?.email}
                </p>
                <div className="relative w-full">
                  <div>
                    {newpassword && (
                      <>
                        <div className="w-full">
                          <button
                            className="absolute right-2 top-1/2 transform -translate-y-1/2  rounded px-2 py-1 "
                            onClick={copyToClipboard}
                          >
                            <Copy size={12} />
                          </button>
                          <p className="text-xs text-green-700">
                            {newpassword}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="ml-auto flex flex-col gap-y-2">
                <Badge variant="secondary">{user?.role}</Badge>
                <div
                  className=" h-8 w-20 border rounded-3xl flex items-center cursor-pointer relative"
                  onClick={() => handleStatusChange(!isActive)}
                >
                  <motion.div
                    className={`${
                      isActive ? "bg-green-600" : "bg-red-600"
                    } h-7 w-7 rounded-full flex items-center justify-center font-bold text-lg`}
                    variants={statusVariants}
                    initial={isActive ? "active" : "inactive"}
                    animate={isActive ? "active" : "inactive"}
                  >
                    {isActive ? "A" : "I"}
                  </motion.div>
                </div>
                <div
                  className=" h-8 w-20 border rounded-3xl flex items-center cursor-pointer relative"
                  onClick={() => handleFeaturedChange(!isFeatured)}
                >
                  <motion.div
                    className={`${
                      isFeatured ? "bg-green-600" : "bg-red-600"
                    } h-7 w-7 rounded-full flex items-center justify-center font-bold text-base`}
                    variants={statusVariants}
                    initial={isFeatured ? "active" : "inactive"}
                    animate={isFeatured ? "active" : "inactive"}
                  >
                    {isFeatured ? "F" : "NF"}
                  </motion.div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <InfoItem icon={Flag} label="Name" value={user?.name} />
                <InfoItem icon={User} label="Gender" value={user?.gender} />
                <InfoItem
                  icon={Flag}
                  label="Nationality"
                  value={user?.nationality}
                />
                <InfoItem icon={Flag} label="Country" value={user?.country} />
                <InfoItem icon={Phone} label="Phone" value={user?.phone} />
                <InfoItem icon={Home} label="Address" value={user?.address} />
                <InfoItem
                  icon={Languages}
                  label="Spoken Language"
                  value={user?.spokenLanguage}
                />
                <InfoItem
                  icon={AtSign}
                  label="Account Number"
                  value={user?.accountNo}
                />
                <InfoItem icon={AtSign} label="IFSC Code" value={user?.ifsc} />
                <InfoItem
                  icon={ArrowUp01}
                  label="Experience"
                  value={user?.experience}
                />
                <InfoItem
                  icon={BookUser}
                  label="Adhar Number"
                  value={user?.aadhar}
                />
                <InfoItem
                  icon={ShieldPlus}
                  label="Gender"
                  value={user?.gender}
                />
                <InfoItem
                  icon={Calendar}
                  label="Joining Date"
                  value={
                    user?.dateOfJoining
                      ? format(new Date(user.dateOfJoining), "dd/MMMM/yyyy")
                      : ""
                  }
                />
                <InfoItem icon={AtSign} label="Alias" value={user?.alias} />
                <InfoItem
                  icon={Globe}
                  label="Verified"
                  value={user?.isVerified ? "Yes" : "No"}
                />
              </div>
            </CardContent>
          </Card>

          {/* Warning Section */}
          <Card className="mt-6 bg-background border-orange-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold flex items-center gap-2">
                    Employee Warnings
                    {warnings?.length > 0 && (
                      <Badge
                        variant="secondary"
                        className="bg-orange-500/10 text-orange-600 border-orange-500/30"
                      >
                        {warnings?.length}
                      </Badge>
                    )}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Send formal warnings and view history
                  </p>
                </div>
              </div>
              <Dialog
                open={warningDialogOpen}
                onOpenChange={setWarningDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button className="gap-2 bg-orange-500 hover:bg-orange-600">
                    <Plus className="h-4 w-4" />
                    Send Warning
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      Send Formal Warning
                    </DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="warningType">Warning Type *</Label>
                      <Select
                        value={newWarning.warningType}
                        onValueChange={(value: WarningType) =>
                          setNewWarning({ ...newWarning, warningType: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select warning type" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(WARNING_TYPE_CONFIG).map(
                            ([key, config]) => (
                              <SelectItem key={key} value={key}>
                                <span className="flex items-center gap-2">
                                  <span>{config.icon}</span>
                                  {config.label}
                                </span>
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="department">Department *</Label>
                      <Input
                        id="department"
                        placeholder="e.g., Sales, HR, Development"
                        value={newWarning.department}
                        onChange={(e) =>
                          setNewWarning({
                            ...newWarning,
                            department: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="reportingManager">
                        Reporting Manager *
                      </Label>
                      <Input
                        id="reportingManager"
                        placeholder="Manager name"
                        value={newWarning.reportingManager}
                        onChange={(e) =>
                          setNewWarning({
                            ...newWarning,
                            reportingManager: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="date">
                        Acknowledgement/Meeting Date *
                      </Label>
                      <Input
                        id="date"
                        type="date"
                        value={newWarning.date}
                        onChange={(e) =>
                          setNewWarning({ ...newWarning, date: e.target.value })
                        }
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="notes">Additional Notes</Label>
                      <Textarea
                        id="notes"
                        placeholder="Any additional notes or context..."
                        value={newWarning.notes}
                        onChange={(e) =>
                          setNewWarning({ ...newWarning, notes: e.target.value })
                        }
                        rows={3}
                      />
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                      <Checkbox
                        id="sendEmail"
                        checked={newWarning.sendEmail}
                        onCheckedChange={(checked) =>
                          setNewWarning({
                            ...newWarning,
                            sendEmail: checked as boolean,
                          })
                        }
                      />
                      <label
                        htmlFor="sendEmail"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                      >
                        <Mail className="h-4 w-4" />
                        Send warning email to {user?.email}
                      </label>
                    </div>
                  </div>
                  <DialogFooter className="gap-2 sm:gap-0">
                    <DialogClose asChild>
                      <Button type="button" variant="outline">
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button
                      onClick={handleSendWarning}
                      disabled={sendingWarning}
                      className="bg-orange-500 hover:bg-orange-600"
                    >
                      {sendingWarning ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4 mr-2" />
                          Send Warning
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <AnimatePresence mode="popLayout">
                {warnings?.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-center py-12 text-muted-foreground"
                  >
                    <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                      <AlertTriangle className="h-8 w-8 opacity-40" />
                    </div>
                    <p className="font-medium">No warnings issued</p>
                    <p className="text-sm mt-1">
                      This employee has a clean record
                    </p>
                  </motion.div>
                ) : (
                  <div className="space-y-3">
                    {warnings.map((warning, index) => (
                      <motion.div
                        key={warning._id || index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.05 }}
                        className={`relative p-4 rounded-lg border ${
                          WARNING_TYPE_CONFIG[warning.warningType]?.color ||
                          "bg-gray-500/10"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <Badge
                                variant="outline"
                                className={
                                  WARNING_TYPE_CONFIG[warning.warningType]
                                    ?.color || ""
                                }
                              >
                                <span className="mr-1">
                                  {WARNING_TYPE_CONFIG[warning.warningType]
                                    ?.icon || "⚠️"}
                                </span>
                                {WARNING_TYPE_CONFIG[warning.warningType]
                                  ?.label || warning.warningType}
                              </Badge>
                              {warning.emailSent ? (
                                <Badge
                                  variant="outline"
                                  className="bg-green-500/10 text-green-600 border-green-500/30"
                                >
                                  <MailCheck className="h-3 w-3 mr-1" />
                                  Email Sent
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="bg-gray-500/10 text-gray-600 border-gray-500/30"
                                >
                                  <MailX className="h-3 w-3 mr-1" />
                                  No Email
                                </Badge>
                              )}
                            </div>

                            <p className="font-medium text-sm">
                              {warning.reason}
                            </p>

                            <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {warning.department}
                              </span>
                              <span className="flex items-center gap-1">
                                <UserCheck className="h-3 w-3" />
                                {warning.reportingManager}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {warning.issuedAt
                                  ? format(
                                      new Date(warning.issuedAt),
                                      "MMM dd, yyyy"
                                    )
                                  : "N/A"}
                              </span>
                            </div>

                            {warning.notes && (
                              <p className="text-xs text-muted-foreground mt-2 italic">
                                Note: {warning.notes}
                              </p>
                            )}

                            <p className="text-xs text-muted-foreground mt-2">
                              Issued by: {warning.issuedBy}
                            </p>
                          </div>

                          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-red-500 shrink-0"
                                disabled={deletingWarningId === warning._id}
                              >
                                {deletingWarningId === warning._id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Delete Warning Record
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this warning
                                  record? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleDeleteWarning(warning._id || "")
                                  }
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent> 
                          </AlertDialog>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* PIP Section */}
          <Card className="mt-6 bg-background border-blue-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold flex items-center gap-2">
                    Performance Improvement Plans
                    {pips?.length > 0 && (
                      <Badge
                        variant="secondary"
                        className="bg-blue-500/10 text-blue-600 border-blue-500/30"
                      >
                        {pips?.length}
                      </Badge>
                    )}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Issue PIP notices and track progress
                  </p>
                </div>
              </div>
              <Dialog open={pipDialogOpen} onOpenChange={setPipDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 bg-blue-500 hover:bg-blue-600">
                    <Plus className="h-4 w-4" />
                    Issue PIP
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-500" />
                      Issue Performance Improvement Plan
                    </DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="pipLevel">PIP Level *</Label>
                      <Select
                        value={newPIP.pipLevel}
                        onValueChange={(value: PIPLevel) =>
                          setNewPIP({ ...newPIP, pipLevel: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select PIP level" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(PIP_LEVEL_CONFIG).map(([key, config]) => (
                            <SelectItem key={key} value={key}>
                              <span className="flex items-center gap-2">
                                <span>{config.icon}</span>
                                {config.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="startDate">Start Date *</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={newPIP.startDate}
                          onChange={(e) =>
                            setNewPIP({ ...newPIP, startDate: e.target.value })
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="endDate">End Date *</Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={newPIP.endDate}
                          onChange={(e) =>
                            setNewPIP({ ...newPIP, endDate: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <Label>Concerns / Issues *</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addConcern}
                          className="h-7 text-xs"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add
                        </Button>
                      </div>
                      {newPIP.concerns.map((concern, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            placeholder={`Concern ${index + 1}`}
                            value={concern}
                            onChange={(e) => updateConcern(index, e.target.value)}
                          />
                          {newPIP.concerns.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeConcern(index)}
                              className="shrink-0 h-10 w-10 text-red-500 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="pipNotes">Additional Notes</Label>
                      <Textarea
                        id="pipNotes"
                        placeholder="Any additional notes or context..."
                        value={newPIP.notes}
                        onChange={(e) =>
                          setNewPIP({ ...newPIP, notes: e.target.value })
                        }
                        rows={3}
                      />
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                      <Checkbox
                        id="sendPIPEmail"
                        checked={newPIP.sendEmail}
                        onCheckedChange={(checked) =>
                          setNewPIP({ ...newPIP, sendEmail: checked as boolean })
                        }
                      />
                      <label
                        htmlFor="sendPIPEmail"
                        className="text-sm font-medium leading-none flex items-center gap-2"
                      >
                        <Mail className="h-4 w-4" />
                        Send PIP email to {user?.email}
                      </label>
                    </div>
                  </div>
                  <DialogFooter className="gap-2 sm:gap-0">
                    <DialogClose asChild>
                      <Button type="button" variant="outline">
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button
                      onClick={handleSendPIP}
                      disabled={sendingPIP}
                      className="bg-blue-500 hover:bg-blue-600"
                    >
                      {sendingPIP ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4 mr-2" />
                          Issue PIP
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <AnimatePresence mode="popLayout">
                {pips?.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-center py-12 text-muted-foreground"
                  >
                    <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                      <TrendingUp className="h-8 w-8 opacity-40" />
                    </div>
                    <p className="font-medium">No PIPs issued</p>
                    <p className="text-sm mt-1">
                      No performance improvement plans on record
                    </p>
                  </motion.div>
                ) : (
                  <div className="space-y-3">
                    {pips?.map((pip, index) => (
                      <motion.div
                        key={pip._id || index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.05 }}
                        className={`relative p-4 rounded-lg border ${
                          PIP_LEVEL_CONFIG[pip.pipLevel]?.color || "bg-gray-500/10"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <Badge
                                variant="outline"
                                className={PIP_LEVEL_CONFIG[pip.pipLevel]?.color || ""}
                              >
                                <span className="mr-1">
                                  {PIP_LEVEL_CONFIG[pip.pipLevel]?.icon || "📋"}
                                </span>
                                {PIP_LEVEL_CONFIG[pip.pipLevel]?.shortLabel || pip.pipLevel}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={PIP_STATUS_CONFIG[pip.status]?.color || ""}
                              >
                                {pip.status === "active" && <Target className="h-3 w-3 mr-1" />}
                                {pip.status === "completed" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                                {pip.status === "failed" && <XCircle className="h-3 w-3 mr-1" />}
                                {PIP_STATUS_CONFIG[pip.status]?.label || pip.status}
                              </Badge>
                              {pip.emailSent ? (
                                <Badge
                                  variant="outline"
                                  className="bg-green-500/10 text-green-600 border-green-500/30"
                                >
                                  <MailCheck className="h-3 w-3 mr-1" />
                                  Email Sent
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="bg-gray-500/10 text-gray-600 border-gray-500/30"
                                >
                                  <MailX className="h-3 w-3 mr-1" />
                                  No Email
                                </Badge>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-3">
                              <span className="flex items-center gap-1">
                                <CalendarRange className="h-3 w-3" />
                                {pip.startDate} to {pip.endDate}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Issued: {pip.issuedAt
                                  ? format(new Date(pip.issuedAt), "MMM dd, yyyy")
                                  : "N/A"}
                              </span>
                            </div>

                            <div className="mb-2">
                              <p className="text-xs font-medium text-muted-foreground mb-1">
                                Concerns:
                              </p>
                              <ul className="list-disc list-inside text-sm space-y-1">
                                {pip.concerns?.map((concern, i) => (
                                  <li key={i}>{concern}</li>
                                ))}
                              </ul>
                            </div>

                            {pip.notes && (
                              <p className="text-xs text-muted-foreground mt-2 italic">
                                Note: {pip.notes}
                              </p>
                            )}

                            <p className="text-xs text-muted-foreground mt-2">
                              Issued by: {pip.issuedBy}
                            </p>

                            {/* Status Update Buttons */}
                            {pip.status === "active" && (
                              <div className="flex gap-2 mt-3">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs bg-green-500/10 text-green-600 border-green-500/30 hover:bg-green-500/20"
                                  onClick={() => handleUpdatePIPStatus(pip._id || "", "completed")}
                                >
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Mark Completed
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs bg-red-500/10 text-red-600 border-red-500/30 hover:bg-red-500/20"
                                  onClick={() => handleUpdatePIPStatus(pip._id || "", "failed")}
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Mark Failed
                                </Button>
                              </div>
                            )}
                          </div>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-red-500 shrink-0"
                                disabled={deletingPIPId === pip._id}
                              >
                                {deletingPIPId === pip._id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete PIP Record</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this PIP record? This
                                  action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeletePIP(pip._id || "")}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Appreciation Section */}
          <Card className="mt-6 bg-background border-green-500/20">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Award className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold flex items-center gap-2">
                    Employee Appreciations
                    {appreciations?.length > 0 && (
                      <Badge
                        variant="secondary"
                        className="bg-green-500/10 text-green-600 border-green-500/30"
                      >
                        {appreciations?.length}
                      </Badge>
                    )}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Send appreciation emails and view history
                  </p>
                </div>
              </div>
              <Dialog
                open={appreciationDialogOpen}
                onOpenChange={setAppreciationDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button className="gap-2 bg-green-500 hover:bg-green-600">
                    <Plus className="h-4 w-4" />
                    Send Appreciation
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-green-500" />
                      Send Appreciation
                    </DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="appreciationType">Appreciation Type *</Label>
                      <Select
                        value={newAppreciation.appreciationType}
                        onValueChange={(value: AppreciationType) =>
                          setNewAppreciation({
                            ...newAppreciation,
                            appreciationType: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select appreciation type" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(APPRECIATION_TYPE_CONFIG).map(
                            ([key, config]) => (
                              <SelectItem key={key} value={key}>
                                <span className="flex items-center gap-2">
                                  <span>{config.icon}</span>
                                  {config.label}
                                </span>
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="appreciationNotes">Additional Notes</Label>
                      <Textarea
                        id="appreciationNotes"
                        placeholder="Any additional notes or context..."
                        value={newAppreciation.notes}
                        onChange={(e) =>
                          setNewAppreciation({
                            ...newAppreciation,
                            notes: e.target.value,
                          })
                        }
                        rows={3}
                      />
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                      <Checkbox
                        id="sendAppreciationEmail"
                        checked={newAppreciation.sendEmail}
                        onCheckedChange={(checked) =>
                          setNewAppreciation({
                            ...newAppreciation,
                            sendEmail: checked as boolean,
                          })
                        }
                      />
                      <label
                        htmlFor="sendAppreciationEmail"
                        className="text-sm font-medium leading-none flex items-center gap-2"
                      >
                        <Mail className="h-4 w-4" />
                        Send appreciation email to {user?.email}
                      </label>
                    </div>
                  </div>
                  <DialogFooter className="gap-2 sm:gap-0">
                    <DialogClose asChild>
                      <Button type="button" variant="outline">
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button
                      onClick={handleSendAppreciation}
                      disabled={sendingAppreciation}
                      className="bg-green-500 hover:bg-green-600"
                    >
                      {sendingAppreciation ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="h-4 w-4 mr-2" />
                          Send Appreciation
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <AnimatePresence mode="popLayout">
                {appreciations?.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-center py-12 text-muted-foreground"
                  >
                    <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                      <Award className="h-8 w-8 opacity-40" />
                    </div>
                    <p className="font-medium">No appreciations sent</p>
                    <p className="text-sm mt-1">
                      No appreciation emails on record
                    </p>
                  </motion.div>
                ) : (
                  <div className="space-y-3">
                    {appreciations?.map((appreciation, index) => (
                      <motion.div
                        key={appreciation._id || index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.05 }}
                        className={`relative p-4 rounded-lg border ${
                          APPRECIATION_TYPE_CONFIG[appreciation.appreciationType]
                            ?.color || "bg-gray-500/10"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <Badge
                                variant="outline"
                                className={
                                  APPRECIATION_TYPE_CONFIG[
                                    appreciation.appreciationType
                                  ]?.color || ""
                                }
                              >
                                <span className="mr-1">
                                  {
                                    APPRECIATION_TYPE_CONFIG[
                                      appreciation.appreciationType
                                    ]?.icon || "⭐"
                                  }
                                </span>
                                {
                                  APPRECIATION_TYPE_CONFIG[
                                    appreciation.appreciationType
                                  ]?.label || appreciation.appreciationType
                                }
                              </Badge>
                              {appreciation.emailSent ? (
                                <Badge
                                  variant="outline"
                                  className="bg-green-500/10 text-green-600 border-green-500/30"
                                >
                                  <MailCheck className="h-3 w-3 mr-1" />
                                  Email Sent
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="bg-gray-500/10 text-gray-600 border-gray-500/30"
                                >
                                  <MailX className="h-3 w-3 mr-1" />
                                  No Email
                                </Badge>
                              )}
                            </div>

                            <p className="font-medium text-sm">
                              {appreciation.reason}
                            </p>

                            <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {appreciation.issuedAt
                                  ? format(
                                      new Date(appreciation.issuedAt),
                                      "MMM dd, yyyy"
                                    )
                                  : "N/A"}
                              </span>
                            </div>

                            {appreciation.notes && (
                              <p className="text-xs text-muted-foreground mt-2 italic">
                                Note: {appreciation.notes}
                              </p>
                            )}

                            <p className="text-xs text-muted-foreground mt-2">
                              Issued by: {appreciation.issuedBy}
                            </p>
                          </div>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-red-500 shrink-0"
                                disabled={
                                  deletingAppreciationId === appreciation._id
                                }
                              >
                                {deletingAppreciationId === appreciation._id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Delete Appreciation Record
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this appreciation
                                  record? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleDeleteAppreciation(
                                      appreciation._id || ""
                                    )
                                  }
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
              <Button className="sm:w-2/6 w-full mt-4">
                {generatingPassword ? (
                  <div className="flex items-center gap-x-1">
                    Generating... <Loader2 className="animate-spin" size={18} />
                  </div>
                ) : (
                  "Generate Password"
                )}
              </Button>
            </AlertDialogTrigger>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Password Generation</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to generate a new password?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setOpen(false)}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirm}>
                  Confirm
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* Email Preview Dialog */}
      <EmailPreviewDialog
        open={emailPreviewOpen}
        onOpenChange={setEmailPreviewOpen}
        subject={emailPreviewSubject}
        html={emailPreviewHtml}
        onSend={async (subject: string, html: string) => {
          if (emailPreviewType === "warning") {
            await handleSendWarningWithCustomEmail(subject, html);
          } else if (emailPreviewType === "pip") {
            await handleSendPIPWithCustomEmail(subject, html);
          } else if (emailPreviewType === "appreciation") {
            await handleSendAppreciationWithCustomEmail(subject, html);
          }
        }}
        sending={sendingWarning || sendingPIP || sendingAppreciation}
        recipientEmail={user?.email || ""}
      />
    </>
  );
}

interface InfoItemProps {
  icon: LucideIcon;
  label: string;
  value: string | number | undefined;
}

function InfoItem({ icon: Icon, label, value }: InfoItemProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-4">
      <div className="h-8 w-8 bg-secondary rounded-full flex items-center justify-center flex-shrink-0">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="flex flex-col justify-center">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-semibold">{value}</p>
      </div>
    </div>
  );
}
