// Modernized to ES6: using const/let, arrow callbacks, fetch API, and template literals
const search = document.getElementById('search');
const searchResult = document.getElementById('search-result');
const hasSearchResults = false;

// Converted to arrow callback
document.addEventListener('click', (event) => {
  if (!search.contains(event.target) && !searchResult.contains(event.target)) {
    searchResult.classList.add('d-none');
  }
});

// Using arrow callback for focus event
search.addEventListener('focus', () => {
  if (hasSearchResults) {
    searchResult.classList.remove('d-none');
  }
});

// Helper using const for ES6 compliance
function createChild(element, type, classes, content) {
  const child = document.createElement(type);
  child.className = classes;
  child.textContent = content;
  element.appendChild(child);
}

// Modernized: let instead of var, arrow callbacks, fetch instead of XMLHttpRequest, template literals
let timeout;
search.addEventListener('input', (event) => {
  clearTimeout(timeout);
  timeout = setTimeout(() => {
    if (!event.target.value) {
      searchResult.classList.add('d-none');
      return;
    }

    // Using template literal and fetch API for modern ES6 approach
    console.log(`Searching for: ${event.target.value}`);
    fetch(`/self/api/schemas/search?q=${encodeURIComponent(event.target.value)}`);
  }, 300);
});
