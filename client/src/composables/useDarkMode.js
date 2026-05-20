import { ref, watch } from "vue";

const STORAGE_KEY = "inventory-dark-mode";

// Module-level singleton so all components share the same state
const isDark = ref(localStorage.getItem(STORAGE_KEY) === "true");

// Apply the class immediately on module load (before any component mounts)
// so the page never flashes the wrong theme
if (isDark.value) {
  document.documentElement.classList.add("dark");
}

// Keep the DOM class and localStorage in sync whenever isDark changes
watch(isDark, (val) => {
  if (val) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
  localStorage.setItem(STORAGE_KEY, String(val));
});

export function useDarkMode() {
  const toggle = () => {
    isDark.value = !isDark.value;
  };

  return { isDark, toggle };
}
