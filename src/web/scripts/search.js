let search = document.getElementById('search');
let searchResult = document.getElementById('search-result');
let hasSearchResults = false;

document.addEventListener('click', (event) => {
  if (!search.contains(event.target) && !searchResult.contains(event.target)) {
    searchResult.classList.add('d-none');
  }
});

search.addEventListener('focus', () => {
  if (hasSearchResults) {
    searchResult.classList.remove('d-none');
  }
});

function createChild(element, type, classes, content) {
  let child = document.createElement(type);
  child.className = classes;
  child.textContent = content;
  element.appendChild(child);
}

let timeout;
search.addEventListener('input', (event) => {
  clearTimeout(timeout);
  timeout = setTimeout(async () => {
    if (!event.target.value) {
      searchResult.classList.add('d-none');
      return;
    }

    console.log('Searching for:', event.target.value);
    let response = await fetch(`/self/api/schemas/search?q=${encodeURIComponent(event.target.value)}`);
    if (!response.ok) {
      return;
    }

    let results = await response.json();
    searchResult.innerHTML = '';
    searchResult.classList.remove('d-none');
    if (results.length === 0) {
      hasSearchResults = false;
      let anchor = document.createElement('a');
      anchor.href = '#';
      anchor.className = 'list-group-item list-group-item-action disabled';
      anchor.setAttribute('aria-disabled', 'true');
      anchor.textContent = 'No results';
      searchResult.appendChild(anchor);
    } else {
      hasSearchResults = true;
      for (let entry of results) {
        let anchor = document.createElement('a');
        anchor.href = entry.path;
        anchor.className = 'list-group-item list-group-item-action';
        createChild(anchor, 'small', 'font-monospace', entry.path);
        if (entry.title) {
          createChild(anchor, 'span', 'fw-bold d-block', entry.title);
        }
        if (entry.description) {
          createChild(anchor, 'small', 'text-secondary d-block', entry.description);
        }
        searchResult.appendChild(anchor);
      }
    }
    console.log(results);
  }, 300);
});
