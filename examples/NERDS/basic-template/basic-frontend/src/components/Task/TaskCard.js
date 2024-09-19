import React from "react";
import { FaTrash } from "react-icons/fa";
import styles from "../../styles";

function TaskCard({ task, onDelete }) {
  return (
    <div style={styles.taskCard}>
      <div style={styles.taskHeader}>
        <h3 style={styles.taskTitle}>{task.title}</h3>
        <button style={styles.deleteButton} onClick={() => onDelete(task.PK)}>
          <FaTrash /> Delete
        </button>
      </div>
      <p style={styles.taskDescription}>{task.description}</p>
    </div>
  );
}

export default TaskCard;
