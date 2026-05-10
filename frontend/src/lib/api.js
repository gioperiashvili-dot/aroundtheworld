import axios from "axios";

const LOCAL_API_BASE_URL = "http://localhost:5000";
const PRODUCTION_API_BASE_URL = "https://api.aroundworld.ge";

function normalizeApiBaseUrl(value) {
  return String(value || "").replace(/\/+$/, "").replace(/\/api$/i, "");
}

const API_BASE_URL =
  normalizeApiBaseUrl(process.env.REACT_APP_API_BASE_URL) ||
  (process.env.NODE_ENV === "development"
    ? LOCAL_API_BASE_URL
    : PRODUCTION_API_BASE_URL);

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

export function resolveApiUrl(value) {
  const source = String(value || "").trim();

  if (/^https?:\/\//i.test(source)) {
    return source;
  }

  if (source.startsWith("/")) {
    return `${API_BASE_URL}${source}`;
  }

  return `${API_BASE_URL}/${source}`;
}

export function resolvePublicAssetUrl(value) {
  const source = String(value || "").trim();

  if (!source.startsWith("/uploads/")) {
    return source;
  }

  return resolveApiUrl(source);
}

function getAdminConfig(token) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
}

function getFirebaseUserConfig(idToken) {
  return {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  };
}

function getFilenameFromContentDisposition(value) {
  const header = String(value || "");
  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);

  if (utf8Match) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch (_error) {
      return utf8Match[1];
    }
  }

  const asciiMatch = header.match(/filename="?([^";]+)"?/i);
  return asciiMatch ? asciiMatch[1] : "";
}

export async function fetchFlights(params) {
  const response = await apiClient.get("/api/flights/search", {
    params,
  });

  return response.data;
}

export async function submitFlightBookingRequest(payload) {
  const response = await apiClient.post("/api/flights/booking-request", payload);
  return response.data;
}

export async function fetchHotels(params) {
  const response = await apiClient.get("/api/hotels/search", {
    params,
  });

  return response.data;
}

export async function fetchRestaurants(params) {
  const response = await apiClient.get("/api/restaurants/search", {
    params,
  });

  return response.data;
}

export async function fetchTours() {
  const response = await apiClient.get("/api/tours");
  return response.data;
}

export async function fetchTourById(id) {
  const response = await apiClient.get(`/api/tours/${id}`);
  return response.data;
}

export async function submitTourBookingRequest(payload) {
  const response = await apiClient.post("/api/tours/booking-request", payload);
  return response.data;
}

export async function fetchReviews(params = {}) {
  const response = await apiClient.get("/api/reviews", {
    params,
  });

  return response.data;
}

export async function fetchBlogs() {
  const response = await apiClient.get("/api/blogs");
  return response.data;
}

export async function fetchBlogBySlug(slug) {
  const response = await apiClient.get(`/api/blogs/${encodeURIComponent(slug)}`);
  return response.data;
}

export async function submitReview(idToken, payload) {
  const response = await apiClient.post(
    "/api/reviews",
    payload,
    getFirebaseUserConfig(idToken)
  );

  return response.data;
}

export async function createAdminSession(password) {
  const response = await apiClient.post("/api/admin/session", {
    password,
  });

  return response.data;
}

export async function fetchAdminTours(token) {
  const response = await apiClient.get("/api/admin/tours", getAdminConfig(token));
  return response.data;
}

export async function fetchAdminReviews(token) {
  const response = await apiClient.get("/api/admin/reviews", getAdminConfig(token));
  return response.data;
}

export async function fetchAdminBookingRequests(token) {
  const response = await apiClient.get(
    "/api/admin/booking-requests",
    getAdminConfig(token)
  );
  return response.data;
}

export async function fetchAdminBookings(token) {
  const response = await apiClient.get(
    "/api/admin/bookings",
    getAdminConfig(token)
  );
  return response.data;
}

export async function fetchAdminBlogs(token) {
  const response = await apiClient.get("/api/admin/blogs", getAdminConfig(token));
  return response.data;
}

export async function createAdminTour(token, payload) {
  const response = await apiClient.post("/api/admin/tours", payload, getAdminConfig(token));
  return response.data;
}

export async function createAdminBlog(token, payload) {
  const response = await apiClient.post("/api/admin/blogs", payload, getAdminConfig(token));
  return response.data;
}

export async function updateAdminTour(token, id, payload) {
  const response = await apiClient.put(
    `/api/admin/tours/${id}`,
    payload,
    getAdminConfig(token)
  );
  return response.data;
}

export async function updateAdminBlog(token, id, payload) {
  const response = await apiClient.put(
    `/api/admin/blogs/${id}`,
    payload,
    getAdminConfig(token)
  );
  return response.data;
}

export async function deleteAdminTour(token, id) {
  const response = await apiClient.delete(`/api/admin/tours/${id}`, getAdminConfig(token));
  return response.data;
}

export async function deleteAdminBlog(token, id) {
  const response = await apiClient.delete(`/api/admin/blogs/${id}`, getAdminConfig(token));
  return response.data;
}

export async function approveAdminReview(token, id) {
  const response = await apiClient.patch(
    `/api/admin/reviews/${id}/approve`,
    null,
    getAdminConfig(token)
  );

  return response.data;
}

export async function deleteAdminReview(token, id) {
  const response = await apiClient.delete(
    `/api/admin/reviews/${id}`,
    getAdminConfig(token)
  );

  return response.data;
}

export async function updateAdminBookingRequest(token, id, payload) {
  const response = await apiClient.patch(
    `/api/admin/booking-requests/${id}`,
    payload,
    getAdminConfig(token)
  );

  return response.data;
}

export async function convertAdminBookingRequest(token, id, payload) {
  const response = await apiClient.post(
    `/api/admin/booking-requests/${id}/convert`,
    payload,
    getAdminConfig(token)
  );

  return response.data;
}

export async function updateAdminBooking(token, id, payload) {
  const response = await apiClient.patch(
    `/api/admin/bookings/${id}`,
    payload,
    getAdminConfig(token)
  );

  return response.data;
}

export async function uploadAdminBookingFile(token, bookingId, file, name = "") {
  const formData = new FormData();
  formData.append("file", file);

  if (name) {
    formData.append("name", name);
  }

  const response = await apiClient.post(
    `/api/admin/bookings/${bookingId}/files`,
    formData,
    getAdminConfig(token)
  );

  return response.data;
}

export async function deleteAdminBookingFile(token, bookingId, fileId) {
  const response = await apiClient.delete(
    `/api/admin/bookings/${bookingId}/files/${fileId}`,
    getAdminConfig(token)
  );

  return response.data;
}

export async function downloadAdminBookingFile(token, bookingId, fileId) {
  const response = await apiClient.get(
    `/api/admin/bookings/${bookingId}/files/${fileId}`,
    {
      ...getAdminConfig(token),
      responseType: "blob",
    }
  );

  return {
    blob: response.data,
    filename: getFilenameFromContentDisposition(
      response.headers?.["content-disposition"]
    ),
  };
}

export async function downloadUserBookingFile(idToken, bookingId, fileId) {
  const response = await apiClient.get(`/api/bookings/${bookingId}/files/${fileId}`, {
    ...getFirebaseUserConfig(idToken),
    responseType: "blob",
  });

  return {
    blob: response.data,
    filename: getFilenameFromContentDisposition(
      response.headers?.["content-disposition"]
    ),
  };
}

export async function uploadAdminTourImage(token, imageFile) {
  const formData = new FormData();
  formData.append("images", imageFile);

  const response = await apiClient.post(
    "/api/admin/uploads/tours",
    formData,
    getAdminConfig(token)
  );

  return response.data;
}

export async function uploadAdminTourImages(token, imageFiles = []) {
  const formData = new FormData();

  imageFiles.forEach((imageFile) => {
    formData.append("images", imageFile);
  });

  const response = await apiClient.post(
    "/api/admin/uploads/tours",
    formData,
    getAdminConfig(token)
  );

  return response.data;
}

export async function uploadAdminBlogImage(token, imageFile) {
  const formData = new FormData();
  formData.append("image", imageFile);

  const response = await apiClient.post(
    "/api/admin/uploads/blogs",
    formData,
    getAdminConfig(token)
  );

  return response.data;
}
