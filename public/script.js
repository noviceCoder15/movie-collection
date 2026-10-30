const $ = (sel) => document.querySelector(sel);

// Builds an element; text is always set with textContent so user input is never run as HTML
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

let movies = [];
let editingId = null;

// ---------- API ----------
async function request(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Request failed');
  }
  return res.status === 204 ? null : res.json();
}

const json = (method, body) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

// ---------- Helpers ----------
let toastTimer;
function toast(message, isError = false) {
  const t = $('#toast');
  t.textContent = message;
  t.className = 'toast show' + (isError ? ' error' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = 'toast'), 2600);
}

function starsFor(rating) {
  const full = Math.round(rating / 2);
  return '★'.repeat(full) + '☆'.repeat(5 - full);
}

// Gives each title its own colour for the no-poster fallback
function fallbackPoster(title) {
  let hash = 0;
  for (const ch of title) hash = (hash * 31 + ch.charCodeAt(0)) % 360;
  const box = el('div', 'poster-fallback', title.trim().charAt(0).toUpperCase() || '?');
  box.style.background = `linear-gradient(160deg, hsl(${hash} 45% 32%), hsl(${(hash + 50) % 360} 50% 16%))`;
  return box;
}

function posterNode(movie) {
  const wrap = el('div', 'poster');
  if (movie.poster) {
    const img = el('img');
    img.src = movie.poster;
    img.alt = `Poster of ${movie.title}`;
    img.loading = 'lazy';
    img.referrerPolicy = 'no-referrer';
    img.onerror = () => img.replaceWith(fallbackPoster(movie.title));
    wrap.appendChild(img);
  } else {
    wrap.appendChild(fallbackPoster(movie.title));
  }
  if (movie.rating != null) wrap.appendChild(el('span', 'badge', `★ ${Number(movie.rating).toFixed(1)}`));
  return wrap;
}

// ---------- Rendering ----------
function visibleMovies() {
  const q = $('#search').value.trim().toLowerCase();
  const sort = $('#sort').value;

  const list = movies.filter((m) =>
    [m.title, m.director, m.genre].some((v) => (v || '').toLowerCase().includes(q))
  );

  const sorters = {
    newest: (a, b) => b.id - a.id,
    rating: (a, b) => (b.rating ?? -1) - (a.rating ?? -1),
    title: (a, b) => a.title.localeCompare(b.title),
    year: (a, b) => (b.year ?? 0) - (a.year ?? 0),
  };
  return list.sort(sorters[sort]);
}

function cardFor(m) {
  const card = el('article', 'card');
  card.appendChild(posterNode(m));

  const body = el('div', 'body');
  body.appendChild(el('h3', null, m.title));

  const meta = el('div', 'meta');
  if (m.year) meta.appendChild(el('span', 'pill', String(m.year)));
  if (m.genre) meta.appendChild(el('span', 'pill', m.genre));
  body.appendChild(meta);

  body.appendChild(el('p', 'director', `Directed by ${m.director}`));
  if (m.rating != null) body.appendChild(el('div', 'stars', starsFor(m.rating)));

  body.appendChild(m.review ? el('p', 'review', m.review) : el('p', 'review none', 'No review yet.'));

  const actions = el('div', 'card-actions');
  const edit = el('button', 'btn ghost small', 'Edit');
  edit.type = 'button';
  edit.onclick = () => openForm(m);
  const del = el('button', 'btn danger small', 'Delete');
  del.type = 'button';
  del.onclick = () => removeMovie(m);
  actions.append(edit, del);
  body.appendChild(actions);

  card.appendChild(body);
  return card;
}

function render() {
  const list = visibleMovies();
  const grid = $('#grid');
  grid.replaceChildren(...list.map(cardFor));

  $('#empty').hidden = movies.length > 0;

  const rated = movies.filter((m) => m.rating != null);
  const avg = rated.length ? (rated.reduce((s, m) => s + Number(m.rating), 0) / rated.length).toFixed(1) : null;
  $('#stats').textContent = movies.length
    ? `${movies.length} ${movies.length === 1 ? 'movie' : 'movies'} on your shelf` + (avg ? `, average rating ${avg}` : '')
    : 'Your shelf is empty';
}

async function loadMovies() {
  try {
    movies = await request('/movies');
    render();
  } catch (err) {
    toast(err.message, true);
  }
}

// ---------- Add / edit dialog ----------
const dialog = $('#dialog');

function setPreview(url) {
  const box = $('#preview');
  box.replaceChildren();
  if (!url) {
    box.appendChild(el('span', null, 'Poster preview'));
    return;
  }
  const img = el('img');
  img.src = url;
  img.alt = 'Poster preview';
  img.referrerPolicy = 'no-referrer';
  img.onerror = () => {
    box.replaceChildren(el('span', null, "Can't load this image"));
  };
  box.appendChild(img);
}

function openForm(movie) {
  editingId = movie ? movie.id : null;
  $('#dialog-title').textContent = movie ? 'Edit movie' : 'Add movie';
  $('#title').value = movie?.title ?? '';
  $('#director').value = movie?.director ?? '';
  $('#year').value = movie?.year ?? '';
  $('#genre').value = movie?.genre ?? '';
  $('#poster').value = movie?.poster ?? '';
  $('#review').value = movie?.review ?? '';
  $('#rating').value = movie?.rating ?? 7;
  $('#rating-out').textContent = Number($('#rating').value).toFixed(1);
  $('#form-error').textContent = '';
  setPreview(movie?.poster ?? '');
  dialog.showModal();
  $('#title').focus();
}

$('#rating').addEventListener('input', (e) => {
  $('#rating-out').textContent = Number(e.target.value).toFixed(1);
});
$('#poster').addEventListener('change', (e) => setPreview(e.target.value.trim()));

$('#form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    title: $('#title').value,
    director: $('#director').value,
    year: $('#year').value,
    genre: $('#genre').value,
    rating: $('#rating').value,
    review: $('#review').value,
    poster: $('#poster').value,
  };
  try {
    if (editingId) {
      await request('/movies/' + editingId, json('PUT', payload));
      toast('Movie updated');
    } else {
      await request('/movies', json('POST', payload));
      toast('Movie added');
    }
    dialog.close();
    await loadMovies();
  } catch (err) {
    $('#form-error').textContent = err.message;
  }
});

$('#cancel').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (e) => {
  if (e.target === dialog) dialog.close(); // click on the backdrop
});

// ---------- Delete ----------
async function removeMovie(movie) {
  if (!confirm(`Delete "${movie.title}"? This can't be undone.`)) return;
  try {
    await request('/movies/' + movie.id, { method: 'DELETE' });
    toast('Movie deleted');
    await loadMovies();
  } catch (err) {
    toast(err.message, true);
  }
}

// ---------- Wiring ----------
$('#add-btn').addEventListener('click', () => openForm(null));
$('#empty-add').addEventListener('click', () => openForm(null));
$('#search').addEventListener('input', render);
$('#sort').addEventListener('change', render);

loadMovies();
