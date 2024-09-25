// src/components/Task/TaskForm.jsx
import React, { useState } from "react";
import { FaPlus } from "react-icons/fa";
import styles from "../../styles";

function TaskForm({ onCreateTask, priorities }) {
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    taskPriority: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreateTask(newTask);
    setNewTask({ title: "", description: "", taskPriority: "" });
  };

  return (
    <div style={styles.createTaskCard}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          style={styles.input}
          type="text"
          placeholder="Task Title"
          value={newTask.title}
          onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
        />
        <textarea
          style={{ ...styles.input, minHeight: "60px" }}
          placeholder="Task Description"
          value={newTask.description}
          onChange={(e) =>
            setNewTask({ ...newTask, description: e.target.value })
          }
        />
        <select
          style={styles.input}
          value={newTask.taskPriority}
          onChange={(e) =>
            setNewTask({ ...newTask, taskPriority: e.target.value })
          }
        >
          <option value="">Select Priority</option>
          {priorities.map((priority) => (
            <option key={priority} value={priority.toString()}>
              {priority}
            </option>
          ))}
        </select>
        <button style={styles.button} type="submit">
          <FaPlus /> Add Task
        </button>
      </form>
    </div>
  );
}

export default TaskForm;
