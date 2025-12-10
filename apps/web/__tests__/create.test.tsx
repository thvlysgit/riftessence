import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CreatePostPage from '../pages/create';

describe('CreatePostPage', () => {
  test('shows cooldown note when anonymous toggled', () => {
    render(<CreatePostPage />);
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(screen.getByText(/7-day cooldown/i)).toBeInTheDocument();
  });
});
