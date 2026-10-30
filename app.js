const express = require('express');
const path = require('path');
const { load, save } = require('./db');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Validates and normalises a movie payload. Returns { value } or { error }.
function clean(body) {
  const { title, director, year, genre, rating, review, poster } = body || {};

  if (!title || !String(title).trim() || !director || !String(director).trim()) {
    return { error: 'title and director are required' };
  }

  const r = rating === '' || rating == null ? null : Number(rating);
  if (r !== null && (Number.isNaN(r) || r < 0 || r > 10)) {
    return { error: 'rating must be a number between 0 and 10' };
  }

  const y = year === '' || year == null ? null : Number(year);
  if (y !== null && (!Number.isInteger(y) || y < 1888 || y > 2100)) {
    return { error: 'year must be a whole number between 1888 and 2100' };
  }

  const p = poster ? String(poster).trim() : '';
  if (p && !/^https?:\/\//i.test(p)) {
    return { error: 'poster must be an image URL starting with http:// or https://' };
  }

  return {
    value: {
      title: String(title).trim(),
      director: String(director).trim(),
      year: y,
      genre: genre ? String(genre).trim() : '',
      rating: r,
      review: review ? String(review).trim().slice(0, 1000) : '',
      poster: p,
    },
  };
}

app.get('/version', (req, res) =>
  res.json({ service: 'movie-collection', version: process.env.APP_VERSION || '1.0.0' })
);

app.get('/health', (req, res) => res.json({ status: 'UP' }));

// READ (all)
app.get('/movies', (req, res) => res.json(load().movies));

// READ (one)
app.get('/movies/:id', (req, res) => {
  const movie = load().movies.find((m) => m.id === Number(req.params.id));
  if (!movie) return res.status(404).json({ error: 'Movie not found' });
  res.json(movie);
});

// CREATE
app.post('/movies', (req, res) => {
  const { value, error } = clean(req.body);
  if (error) return res.status(400).json({ error });

  const data = load();
  const movie = { id: data.nextId++, ...value };
  data.movies.push(movie);
  save(data);
  res.status(201).json(movie);
});

// UPDATE
app.put('/movies/:id', (req, res) => {
  const { value, error } = clean(req.body);
  if (error) return res.status(400).json({ error });

  const data = load();
  const index = data.movies.findIndex((m) => m.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ error: 'Movie not found' });

  data.movies[index] = {
    id: data.movies[index].id,
    favorite: data.movies[index].favorite || false,
    ...value,
  };
  save(data);
  res.json(data.movies[index]);
});

// TOGGLE FAVORITE
app.patch('/movies/:id/favorite', (req, res) => {
  const data = load();
  const movie = data.movies.find((m) => m.id === Number(req.params.id));
  if (!movie) return res.status(404).json({ error: 'Movie not found' });

  movie.favorite = !movie.favorite;
  save(data);
  res.json(movie);
});

// DELETE
app.delete('/movies/:id', (req, res) => {
  const data = load();
  const index = data.movies.findIndex((m) => m.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ error: 'Movie not found' });

  data.movies.splice(index, 1);
  save(data);
  res.status(204).send();
});

module.exports = app;
