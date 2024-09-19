import React, { useState, useEffect } from "react";
import styles from "./styles";
import TaskForm from "./components/Task/TaskForm";
import TaskList from "./components/Task/TaskList";
import { FaRocket } from "react-icons/fa";

const API_URL = "http://localhost:3001/api/";

function App() {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(API_URL + "tasks");
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const data = await response.json();
      setTasks(data);
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
      const response = await fetch(API_URL + "task", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newTask),
      });
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      fetchTasks();
    } catch (error) {
      console.error("Error creating task:", error);
      setError("Failed to create task. Please try again.");
    }
  };

  const deleteTask = async (taskId) => {
    setError(null);
    try {
      const response = await fetch(API_URL + `task/${taskId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      fetchTasks();
    } catch (error) {
      console.error("Error deleting task:", error);
      setError("Failed to delete task. Please try again.");
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>
        <FaRocket /> <i className="fas fa-tasks"></i> TaskMaster
      </h1>
      <p style={styles.subtitle}>Organize, Prioritize, Accomplish</p>
      <TaskForm onCreateTask={createTask} />
      {error && <p style={styles.errorMessage}>{error}</p>}
      <TaskList tasks={tasks} isLoading={isLoading} onDeleteTask={deleteTask} />
    </div>
  );
}

export default App;
