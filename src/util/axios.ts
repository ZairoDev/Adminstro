import axios from "axios";

axios.defaults.withCredentials = true;

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const code = error?.response?.data?.code;
    const requestUrl = error?.config?.url ?? "";

    // Don't treat "no token" on check-session as logout — user is just not logged in yet (e.g. on login page)
    const isCheckSessionNoToken =
      (requestUrl.includes("check-session") || requestUrl.includes("/api/employee/check-session")) &&
      code === "NO_TOKEN";

    const shouldLogout =
      !isCheckSessionNoToken &&
      (status === 401 ||
        status === 403 ||
        ["AUTH_EXPIRED", "SESSION_INVALID", "NO_TOKEN", "AUTH_FAILED"].includes(code));

    if (shouldLogout && typeof window !== "undefined") {
      console.log("🔐 Logging out due to auth failure:", { status, code });

      localStorage.clear();

      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

export default axios;
