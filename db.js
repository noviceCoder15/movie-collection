const fs = require('fs');
const path = require('path');

const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data', 'movies.json');

// Sample data used only the first time, when the file does not exist yet.
const SEED = {
  nextId: 4,
  movies: [
    {
      id: 1,
      title: 'Inception',
      director: 'Christopher Nolan',
      year: 2010,
      genre: 'Sci-Fi',
      rating: 8.8,
      review: 'A heist inside a dream. Dense, loud and rewatchable every single time.',
      poster: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQrrFOFA31IxsW8YTci1RxsdapEdUHace1q7tLb43EE0w&s=10',
    },
    {
      id: 2,
      title: 'Parasite',
      director: 'Bong Joon-ho',
      year: 2019,
      genre: 'Thriller',
      rating: 8.5,
      review: 'Funny, then tense, then devastating. The staircase scenes stay with you.',
      poster: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSEWP0EtvEQQKA1CUplqT-LzNuKoTzSUssOxxu_7PMoNA&s=10',
    },
    {
      id: 3,
      title: 'Spirited Away',
      director: 'Hayao Miyazaki',
      year: 2001,
      genre: 'Animation',
      rating: 9.0,
      review: 'Strange, gentle and gorgeous. Every frame looks hand-painted.',
      poster: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR6_ZMTP-AmWnarhhnLqfSARQzpCthiz-qhJly8ptUfwg&s=10',
    },
  ],
};

function save(data) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  const tmp = `${DATA_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, DATA_FILE); // atomic replace
}

function load() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') {
      save(SEED);
      return structuredClone(SEED);
    }
    throw err;
  }
}

module.exports = { load, save, DATA_FILE };
