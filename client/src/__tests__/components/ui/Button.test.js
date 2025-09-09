import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Button from '../../../components/ui/Button';

describe('Button Component', () => {
  it('renders with children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('applies default variant and size classes', () => {
    render(<Button>Test</Button>);
    const button = screen.getByRole('button');

    expect(button).toHaveClass('bg-blue-600', 'text-white', 'px-4', 'py-2');
  });

  it('applies custom variant classes', () => {
    render(<Button variant="danger">Delete</Button>);
    const button = screen.getByRole('button');

    expect(button).toHaveClass('bg-red-600', 'text-white');
  });

  it('applies custom size classes', () => {
    render(<Button size="large">Large Button</Button>);
    const button = screen.getByRole('button');

    expect(button).toHaveClass('px-6', 'py-3', 'text-base');
  });

  it('handles disabled state', () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole('button');

    expect(button).toBeDisabled();
    expect(button).toHaveClass('opacity-50', 'cursor-not-allowed');
  });

  it('handles loading state', () => {
    render(<Button loading>Loading</Button>);
    const button = screen.getByRole('button');

    expect(button).toBeDisabled();
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();

    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', () => {
    const handleClick = jest.fn();

    render(<Button disabled onClick={handleClick}>Disabled</Button>);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('applies custom className', () => {
    render(<Button className="custom-class">Test</Button>);
    const button = screen.getByRole('button');

    expect(button).toHaveClass('custom-class');
  });

  it('renders as full width when specified', () => {
    render(<Button fullWidth>Full Width</Button>);
    const button = screen.getByRole('button');

    expect(button).toHaveClass('w-full');
  });

  it('renders different button types', () => {
    render(<Button type="submit">Submit</Button>);
    const button = screen.getByRole('button');

    expect(button).toHaveAttribute('type', 'submit');
  });
});
