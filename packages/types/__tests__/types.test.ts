import { User, Post } from '../src';

test('User schema validation', () => {
  const u = { id: '1', username: 'alice' };
  expect(() => User.parse(u)).not.toThrow();
});

test('Post requires author and content', () => {
  const p = { id: 'p1', author: { id: '1', username: 'bob' }, content: 'hi', createdAt: new Date().toISOString() };
  expect(() => Post.parse(p)).not.toThrow();
});
