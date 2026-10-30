const fs = require('fs');
const os = require('os');
const path = require('path');

// Must be set BEFORE the app is loaded
const testFile = path.join(os.tmpdir(), `movies-test-${process.pid}.json`);
process.env.DATA_FILE = testFile;

const request = require('supertest');
const app = require('../app');

afterAll(() => {
  fs.rmSync(testFile, { force: true });
});

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
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  test('POST /movies adds a movie and saves it to the file', async () => {
    const res = await request(app)
      .post('/movies')
      .send({ title: 'Interstellar', director: 'Christopher Nolan', year: 2014, rating: 8.7 });
    expect(res.statusCode).toBe(201);

    const onDisk = JSON.parse(fs.readFileSync(testFile, 'utf8'));
    expect(onDisk.movies.some((m) => m.title === 'Interstellar')).toBe(true);
  });

  test('POST /movies rejects missing fields', async () => {
    const res = await request(app).post('/movies').send({ year: 2000 });
    expect(res.statusCode).toBe(400);
  });

  test('DELETE /movies/:id removes a movie', async () => {
    const created = await request(app)
      .post('/movies')
      .send({ title: 'Temp Movie', director: 'Someone' });
    const res = await request(app).delete('/movies/' + created.body.id);
    expect(res.statusCode).toBe(204);
    const again = await request(app).get('/movies/' + created.body.id);
    expect(again.statusCode).toBe(404);
  });
});