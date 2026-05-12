export const clearActiveElementFocus = () => {
  if (typeof document === "undefined") return;

  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLElement && activeElement !== document.body) {
    activeElement.blur();
  }
};
