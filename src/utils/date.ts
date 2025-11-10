export const formatIsoDate = (isoDate: string) => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  return date.toLocaleDateString('en-AE', {
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  });
};
