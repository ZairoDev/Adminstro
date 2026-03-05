import axios from "axios";

axios.defaults.withCredentials = true;

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const code = error?.response?.data?.code;

    const shouldLogout =
      status === 401 ||
      status === 403 ||
      ["AUTH_EXPIRED", "SESSION_INVALID", "NO_TOKEN", "AUTH_FAILED"].includes(code);

    if (shouldLogout && typeof window !== "undefined") {
      console.log("🔐 Logging out due to auth failure:", { status, code });

      localStorage.clear();

      // Optional: prevent redirect loop
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

export default axios;
