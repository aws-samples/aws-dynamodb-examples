import React from "react";
import { FaTrash, FaCheck } from "react-icons/fa";
import styles from "../../styles";

function TaskCard({ task, onDelete, onUpdate }) {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case "0":
        return "#4CAF50"; // Green for lowest priority
      case "1":
        return "#FFC107"; // Yellow for low priority
      case "2":
        return "#FF9800"; // Orange for medium priority
      case "3":
        return "#F44336"; // Red for high priority
      default:
        return "#9E9E9E"; // Grey for undefined priority
    }
  };

  const priorityStyle = {
    backgroundColor: getPriorityColor(task.taskPriority),
    color: "white",
    padding: "3px 8px",
    borderRadius: "12px",
    fontSize: "0.8em",
    fontWeight: "bold",
    marginRight: "10px",
  };

  const handleUpdate = () => {
    onUpdate(task.taskId, {
      isComplete: task.isComplete === true ? "false" : "true",
      taskPriority: task.taskPriority,
      taskDate: task.taskDate,
    });
  };

  const completedStyle = {
    textDecoration: task.isComplete === true ? "line-through" : "none",
    color: task.isComplete === true ? "#888" : "inherit",
  };

  return (
    <div style={styles.taskCard}>
      <div style={styles.taskHeader}>
        <h3 style={{ ...styles.taskTitle, ...completedStyle }}>{task.title}</h3>
        <div style={{ display: "flex", alignItems: "center" }}>
          <span style={priorityStyle}>
            Priority: {task.taskPriority || "N/A"}
          </span>
          <button
            style={styles.deleteButton}
            onClick={() =>
              onDelete(task.taskId, task.taskDate, task.taskPriority)
            }
          >
            <FaTrash /> Delete
          </button>
        </div>
      </div>
      <p style={{ ...styles.taskDescription, ...completedStyle }}>
        {task.description}
      </p>
      <button style={styles.completeButton} onClick={handleUpdate}>
        <FaCheck />{" "}
        {task.isComplete === true ? "Mark Incomplete" : "Mark Complete"}
      </button>
    </div>
  );
}

export default TaskCard;
