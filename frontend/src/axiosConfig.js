import axios from "axios";


const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // ✅ Vite ENV variable use
  headers: {
    "Content-Type": "application/json",
  },
});
export default api;
