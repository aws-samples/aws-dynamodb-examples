import React from "react";
import TaskCard from "./TaskCard.jsx";

function TaskList({ tasks, isLoading, onDeleteTask, onUpdateTask }) {
  if (isLoading) {
    return <p>Loading tasks...</p>;
  }

  return (
    <div>
      {tasks.map((task) => (
        <TaskCard
          key={task.taskId}
          task={task}
          onDelete={onDeleteTask}
          onUpdate={onUpdateTask}
        />
      ))}
    </div>
  );
}

export default TaskList;
