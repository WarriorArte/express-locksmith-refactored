/**
 * Ripple estilo Android (M3 state layer + onda).
 * Se dispara en pointerdown: crea un <span class="m3-ripple"> centrado en el
 * punto de contacto que se expande y desvanece. El elemento host necesita
 * `position: relative` y `overflow: hidden` (las clases lo garantizan).
 */
export function spawnRipple(event: React.PointerEvent<HTMLElement>) {
  const host = event.currentTarget;
  if (event.button !== 0 || host.hasAttribute("disabled")) return;

  const rect = host.getBoundingClientRect();
  const size = Math.hypot(rect.width, rect.height) * 2;
  const ripple = document.createElement("span");
  ripple.className = "m3-ripple";
  ripple.style.width = ripple.style.height = `${size}px`;
  ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
  ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
  host.appendChild(ripple);
  ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
}
