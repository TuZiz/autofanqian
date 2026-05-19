export type WorkbenchSessionUserDisplay = {
  code?: number | null;
  email?: string | null;
  name?: string | null;
};

export function getWorkbenchUserDisplay(user: WorkbenchSessionUserDisplay | null | undefined) {
  const name = user?.name?.trim();
  if (name) return name;

  if (typeof user?.code === "number" && Number.isFinite(user.code)) {
    return `编号 ${user.code}`;
  }

  const emailPrefix = user?.email?.split("@")[0]?.trim();
  return emailPrefix || "创作者";
}
