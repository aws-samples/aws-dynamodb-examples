import React, { useState, useEffect } from "react";
import axios from "axios";
import styles from "./styles";
import TaskForm from "./components/Task/TaskForm.jsx";
import TaskList from "./components/Task/TaskList.jsx";
import { FaRocket } from "react-icons/fa";

const API_URL = "http://localhost:3001/api/";
const userId = "4Rl17WTewD6aa1-k73cBJ"; // Example user ID

function App() {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [priorities, setPriorities] = useState([]);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_URL}user/${userId}`);
      const userData = response.data;
      if (userData.length > 0 && Array.isArray(userData[0].Priorities)) {
        setPriorities(userData[0].Priorities);
      }
      fetchTasks();
    } catch (error) {
      console.error("Error fetching user data:", error);
      setError("Failed to fetch user data. Please try again.");
      setIsLoading(false);
    }
  };

  const fetchTasks = async () => {
    try {
      const response = await axios.get(`${API_URL}user/${userId}/tasks`);
      setTasks(response.data);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      setError("Failed to fetch tasks. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const createTask = async (newTask) => {
    setError(null);
    try {
      await axios.post(`${API_URL}user/${userId}/task`, newTask);
      fetchTasks();
    } catch (error) {
      console.error("Error creating task:", error);
      setError("Failed to create task. Please try again.");
    }
  };

  const deleteTask = async (taskId, taskDate, taskPriority) => {
    setError(null);
    try {
      await axios.delete(`${API_URL}user/${userId}/task/${taskId}`, {
        params: { taskDate, taskPriority },
      });
      fetchTasks();
    } catch (error) {
      console.error("Error deleting task:", error);
      setError("Failed to delete task. Please try again.");
    }
  };

  const updateTask = async (taskId, updatedTaskData) => {
    setError(null);
    try {
      const { isComplete, taskPriority, taskDate } = updatedTaskData;
      console.log("Sending update request with data:", {
        taskId,
        isComplete,
        taskPriority,
        taskDate,
      });
      const response = await axios.patch(
        `${API_URL}user/${userId}/task/${taskId}`,
        {
          isComplete,
          taskPriority,
          taskDate,
        }
      );
      console.log("Update response:", response.data);
      fetchTasks();
    } catch (error) {
      console.error(
        "Error updating task:",
        error.response?.data || error.message
      );
      console.error("Full error object:", error);
      setError("Failed to update task. Please try again.");
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>
        <FaRocket /> <i className="fas fa-tasks"></i> TaskMaster
      </h1>
      <p style={styles.subtitle}>Organize, Prioritize, Accomplish</p>
      <TaskForm onCreateTask={createTask} priorities={priorities} />
      {error && <p style={styles.errorMessage}>{error}</p>}
      <TaskList
        tasks={tasks}
        isLoading={isLoading}
        onDeleteTask={deleteTask}
        onUpdateTask={updateTask}
      />
    </div>
  );
}

export default App;
