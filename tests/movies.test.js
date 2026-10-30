const fs = require('fs');
const os = require('os');
const path = require('path');

// Must be set BEFORE the app is loaded so tests never touch real data
const testFile = path.join(os.tmpdir(), `movies-test-${process.pid}.json`);
process.env.DATA_FILE = testFile;

const request = require('supertest');
const app = require('../app');

afterAll(() => {
  fs.rmSync(testFile, { force: true });
});

const sample = {
  title: 'Interstellar',
  director: 'Christopher Nolan',
  year: 2014,
  genre: 'Sci-Fi',
  rating: 8.7,
  review: 'Big ideas, bigger organ music.',
  poster: 'https://example.com/interstellar.jpg',
};

describe('Movie API', () => {
  test('GET /health returns UP', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('UP');
  });

  test('GET / serves the HTML page', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
  });

  test('GET /movies returns the seeded list', async () => {
    const res = await request(app).get('/movies');
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(3);
  });

  test('POST /movies creates a movie with review and poster, saved to file', async () => {
    const res = await request(app).post('/movies').send(sample);
    expect(res.statusCode).toBe(201);
    expect(res.body.review).toBe(sample.review);
    expect(res.body.poster).toBe(sample.poster);

    const onDisk = JSON.parse(fs.readFileSync(testFile, 'utf8'));
    expect(onDisk.movies.some((m) => m.title === 'Interstellar')).toBe(true);
  });

  test('POST /movies rejects missing fields', async () => {
    const res = await request(app).post('/movies').send({ year: 2000 });
    expect(res.statusCode).toBe(400);
  });

  test('POST /movies rejects an out-of-range rating', async () => {
    const res = await request(app).post('/movies').send({ ...sample, rating: 11 });
    expect(res.statusCode).toBe(400);
  });

  test('POST /movies rejects an invalid poster URL', async () => {
    const res = await request(app).post('/movies').send({ ...sample, poster: 'not-a-url' });
    expect(res.statusCode).toBe(400);
  });

  test('GET /movies/:id returns one movie', async () => {
    const created = await request(app).post('/movies').send(sample);
    const res = await request(app).get('/movies/' + created.body.id);
    expect(res.statusCode).toBe(200);
    expect(res.body.title).toBe('Interstellar');
  });

  test('PUT /movies/:id updates a movie and saves it', async () => {
    const created = await request(app).post('/movies').send(sample);
    const res = await request(app)
      .put('/movies/' + created.body.id)
      .send({ ...sample, title: 'Interstellar (Rewatched)', rating: 9.1 });
    expect(res.statusCode).toBe(200);
    expect(res.body.title).toBe('Interstellar (Rewatched)');
    expect(res.body.rating).toBe(9.1);

    const onDisk = JSON.parse(fs.readFileSync(testFile, 'utf8'));
    expect(onDisk.movies.find((m) => m.id === created.body.id).rating).toBe(9.1);
  });

  test('PUT /movies/:id returns 404 for an unknown id', async () => {
    const res = await request(app).put('/movies/99999').send(sample);
    expect(res.statusCode).toBe(404);
  });

  test('DELETE /movies/:id removes a movie', async () => {
    const created = await request(app).post('/movies').send(sample);
    const res = await request(app).delete('/movies/' + created.body.id);
    expect(res.statusCode).toBe(204);
    const again = await request(app).get('/movies/' + created.body.id);
    expect(again.statusCode).toBe(404);
  });
});
