import React from "react";
import TaskCard from "./TaskCard";

function TaskList({ tasks, isLoading, onDeleteTask }) {
  if (isLoading) {
    return <p>Loading tasks...</p>;
  }

  return (
    <div>
      {tasks.map((task) => (
        <TaskCard key={task.PK} task={task} onDelete={onDeleteTask} />
      ))}
    </div>
  );
}

export default TaskList;
