import Employee from "@/models/employee";
import { WHATSAPP_ACCESS_ROLES } from "./config";
import { canAccessConversationAsync } from "./access";

export type NotificationRecipient = {
  userId: string;
  role: string;
  allotedArea: string[];
};

/**
 * Users who should receive socket/push notifications for a conversation.
 * Same visibility contract as inbox (phone + participantLocationKey + retarget rules).
 */
export async function getEligibleUsersForNotification(
  conversation: Record<string, unknown>
): Promise<NotificationRecipient[]> {
  const eligibleUsers: NotificationRecipient[] = [];

  const whatsAppRoles = [...WHATSAPP_ACCESS_ROLES, "Advert"];
  const employees = await Employee.find({
    role: { $in: whatsAppRoles },
    $or: [{ isActive: { $exists: false } }, { isActive: true }],
  })
    .select("_id role allotedArea rentalType")
    .lean();

  for (const employee of employees) {
    const employeeId =
      (employee._id as { toString?: () => string })?.toString?.() ||
      String(employee._id ?? "");
    if (!employeeId) continue;

    const employeeRole = (employee.role as string) || "";
    const employeeAreas = Array.isArray(employee.allotedArea)
      ? employee.allotedArea.map(String)
      : employee.allotedArea
        ? [String(employee.allotedArea)]
        : [];

    const userToken = {
      id: employeeId,
      _id: employeeId,
      role: employeeRole,
      allotedArea: employeeAreas,
      rentalType: (employee as { rentalType?: unknown }).rentalType,
    };

    if (!(await canAccessConversationAsync(userToken, conversation))) continue;

    eligibleUsers.push({
      userId: employeeId,
      role: employeeRole,
      allotedArea: employeeAreas,
    });
  }

  if (eligibleUsers.length > 10) {
    console.warn(
      `⚠️ [SCALABILITY] ${eligibleUsers.length} eligible users for conversation ${String(conversation._id ?? "")}.`
    );
  }

  return eligibleUsers;
}
