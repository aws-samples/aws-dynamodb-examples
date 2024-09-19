import React, { useState } from "react";
import { FaPlus } from "react-icons/fa";
import styles from "../../styles";

function TaskForm({ onCreateTask }) {
  const [newTask, setNewTask] = useState({ title: "", description: "" });

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreateTask(newTask);
    setNewTask({ title: "", description: "" });
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
        <button style={styles.button} type="submit">
          <FaPlus /> Add Task
        </button>
      </form>
    </div>
  );
}

export default TaskForm;
