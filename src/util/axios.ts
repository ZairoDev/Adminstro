import axios from "axios";

axios.defaults.withCredentials = true;

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const code = error?.response?.data?.code;
    const requestUrl = error?.config?.url ?? "";

    // These codes mean the session/token itself is invalid — the user must re-authenticate.
    // NOTE: USER_NOT_FOUND is intentionally excluded here because it is also returned by
    // the OTP verify flow (pre-login) where triggering a forced logout makes no sense.
    const AUTH_FAILURE_CODES = [
      "AUTH_EXPIRED",
      "SESSION_INVALID",
      "NO_TOKEN",
      "AUTH_FAILED",
      "INVALID_TOKEN",
    ];

    // Don't treat "no token" on check-session as a logout trigger —
    // the user simply hasn't logged in yet (e.g. visiting /login).
    const isCheckSessionNoToken =
      (requestUrl.includes("check-session") ||
        requestUrl.includes("/api/employee/check-session")) &&
      code === "NO_TOKEN";

    // 401 always means unauthenticated → logout.
    // 403 means either "wrong role/permission" OR an auth failure.
    //   Only logout on 403 when an explicit auth-failure code is present.
    //   A plain 403 "Insufficient permissions" (no auth code) must NOT log the user out.
    const shouldLogout =
      !isCheckSessionNoToken &&
      (status === 401 ||
        AUTH_FAILURE_CODES.includes(code) ||
        (status === 403 && AUTH_FAILURE_CODES.includes(code)));

    if (shouldLogout && typeof window !== "undefined") {
      console.log("🔐 Logging out due to auth failure:", { status, code });

      // Fire-and-forget: clear the server-side MongoDB session so the user
      // can log in again immediately without hitting a 409 "already logged in".
      // keepalive ensures the request completes even as the page unloads.
      try {
        fetch("/api/employeelogout", { keepalive: true, credentials: "include" });
      } catch {
        // non-critical — proceed with client-side cleanup regardless
      }

      localStorage.clear();

      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

export default axios;
