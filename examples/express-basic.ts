import express from 'express';
import { withCors, jwtAuth, notFound, errorHandler, signJwt } from '../src';

const app = express();
app.use(express.json());
app.use(withCors());

app.post('/login', (req, res) => {
  const { username } = req.body ?? {};
  if (!username) return res.status(400).json({ success: false, error: { message: 'username required' } });
  const token = signJwt({ sub: username }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '1h' });
  res.json({ success: true, data: { token } });
});

app.use(
  '/api',
  jwtAuth({
    secret: process.env.JWT_SECRET || 'dev-secret',
    algorithms: ['HS256'],
    requestProperty: 'user',
  })
);

app.get('/api/me', (req, res) => {
  res.json({ success: true, data: { user: (req as any).user } });
});

app.use(notFound());
app.use(errorHandler());

app.listen(3000, () => console.log('listening on http://localhost:3000'));

