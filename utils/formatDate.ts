const getOverdueInfo = (dueDate: Date) => {
  const now = new Date();
  const due = new Date(dueDate);

  if (now <= due) return null;

  const diffMs = now.getTime() - due.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 1) return "less than a day";
  return `${diffDays} day${diffDays === 1 ? "" : "s"}`;
};


export default getOverdueInfo