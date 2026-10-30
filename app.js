const express = require('express');
const path = require('path');
const { load, save } = require('./db');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/version', (req, res) =>
  res.json({ service: 'movie-collection', version: process.env.APP_VERSION || '1.0.0' })
);

app.get('/health', (req, res) => res.json({ status: 'UP' }));

app.get('/movies', (req, res) => res.json(load().movies));

app.get('/movies/:id', (req, res) => {
  const movie = load().movies.find((m) => m.id === Number(req.params.id));
  if (!movie) return res.status(404).json({ error: 'Movie not found' });
  res.json(movie);
});

app.post('/movies', (req, res) => {
  const { title, director, year, rating } = req.body;
  if (!title || !director) {
    return res.status(400).json({ error: 'title and director are required' });
  }
  const data = load();
  const movie = { id: data.nextId++, title, director, year, rating };
  data.movies.push(movie);
  save(data);
  res.status(201).json(movie);
});

app.delete('/movies/:id', (req, res) => {
  const data = load();
  const index = data.movies.findIndex((m) => m.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ error: 'Movie not found' });
  data.movies.splice(index, 1);
  save(data);
  res.status(204).send();
});

module.exports = app;