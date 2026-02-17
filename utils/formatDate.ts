const getOverdueInfo = (dueDate: Date) => {
  const now = new Date();
  const due = new Date(dueDate);

  if (now <= due) return null;

  const diffMs = now.getTime() - due.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return diffDays === 0 ? "TODAY" : `${diffDays} DAY${diffDays > 1 ? "S" : ""}`;
};


export default getOverdueInfo