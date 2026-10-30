const fs = require('fs');
const path = require('path');

const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data', 'movies.json');

const SEED = {
  nextId: 3,
  movies: [
    { id: 1, title: 'Inception', director: 'Christopher Nolan', year: 2010, rating: 8.8 },
    { id: 2, title: 'Parasite', director: 'Bong Joon-ho', year: 2019, rating: 8.5 },
  ],
};

function save(data) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  const tmp = `${DATA_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, DATA_FILE);              // atomic replace
}

function load() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') {              // first run: create the file with sample data
      save(SEED);
      return structuredClone(SEED);
    }
    throw err;
  }
}

module.exports = { load, save, DATA_FILE };