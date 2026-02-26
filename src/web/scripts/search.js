const search = document.getElementById('search');
const searchResult = document.getElementById('search-result');
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

const createChild = (element, type, classes, content) => {
  const child = document.createElement(type);
  child.className = classes;
  child.textContent = content;
  element.appendChild(child);
};

let timeout;
search.addEventListener('input', (event) => {
  clearTimeout(timeout);
  timeout = setTimeout(() => {
    const query = event.target.value;

    if (!query) {
      searchResult.classList.add('d-none');
      return;
    }

    console.log('Searching for:', query);
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `/self/api/schemas/search?q=${encodeURIComponent(query)}`);
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4 && xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        searchResult.innerHTML = '';
        searchResult.classList.remove('d-none');
        if (response.length === 0) {
          hasSearchResults = false;
          const anchor = document.createElement('a');
          anchor.href = '#';
          anchor.className = 'list-group-item list-group-item-action disabled';
          anchor.setAttribute('aria-disabled', 'true');
          anchor.textContent = 'No results';
          searchResult.appendChild(anchor);
        } else {
          hasSearchResults = true;
          response.forEach((entry) => {
            const anchor = document.createElement('a');
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
          });
        }
        console.log(response);
      }
    };
    xhr.send();
  }, 300);
});
