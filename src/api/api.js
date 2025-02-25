import axios from 'axios';

// Set the base API URL from environment variables
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

// Create an Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Function to fetch group standings
export const fetchGroupStandings = async (groupId) => {
  try {
    const response = await api.get(`/api/group-standings/${groupId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching group standings:", error);
    return null;
  }
};

// Function to fetch "Who Picked Whom" data
export const fetchWhoPickedWhom = async (groupId) => {
  try {
    const response = await api.get(`/api/who-picked-whom/${groupId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching who picked whom:", error);
    return null;
  }
};

export default api;
