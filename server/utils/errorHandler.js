export const handleControllerError = (res, error, defaultMessage = "Error interno del servidor") => {
  console.error(error);
  const status = error.status || 500;
  const message = status < 500 ? error.message : defaultMessage;
  res.status(status).json({ error: message });
};
