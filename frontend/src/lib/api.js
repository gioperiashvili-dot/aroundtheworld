import axios from "axios";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

function getAdminConfig(token) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
}

export async function fetchFlights(params) {
  const response = await apiClient.get("/api/flights/search", {
    params,
  });

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

export async function createAdminTour(token, payload) {
  const response = await apiClient.post("/api/admin/tours", payload, getAdminConfig(token));
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

export async function deleteAdminTour(token, id) {
  const response = await apiClient.delete(`/api/admin/tours/${id}`, getAdminConfig(token));
  return response.data;
}
