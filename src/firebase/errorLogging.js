export const logFirebaseError = (label, error) => {
  console.error(label, {
    code: error?.code,
    message: error?.message,
    name: error?.name,
    stack: error?.stack,
    error,
  });
};
