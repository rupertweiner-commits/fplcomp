import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Card from '../../../components/ui/Card';

describe('Card Component', () => {
  it('renders with children', () => {
    render(<Card>Test content</Card>);
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('applies default classes', () => {
    render(<Card>Test</Card>);
    const card = screen.getByText('Test').parentElement;

    expect(card).toHaveClass('bg-white', 'border', 'border-gray-200', 'p-6', 'rounded-lg');
  });

  it('applies custom padding classes', () => {
    render(<Card padding="large">Test</Card>);
    const card = screen.getByText('Test').parentElement;

    expect(card).toHaveClass('p-8');
  });

  it('applies custom shadow classes', () => {
    render(<Card shadow="large">Test</Card>);
    const card = screen.getByText('Test').parentElement;

    expect(card).toHaveClass('shadow-lg');
  });

  it('applies custom rounded classes', () => {
    render(<Card rounded="xl">Test</Card>);
    const card = screen.getByText('Test').parentElement;

    expect(card).toHaveClass('rounded-xl');
  });

  it('applies hover classes when specified', () => {
    render(<Card hover>Test</Card>);
    const card = screen.getByText('Test').parentElement;

    expect(card).toHaveClass('hover:shadow-lg', 'transition-shadow', 'duration-200');
  });

  it('applies clickable classes when onClick is provided', () => {
    const handleClick = jest.fn();

    render(<Card onClick={handleClick}>Test</Card>);
    const card = screen.getByText('Test').parentElement;

    expect(card).toHaveClass('cursor-pointer');
  });

  it('applies custom className', () => {
    render(<Card className="custom-class">Test</Card>);
    const card = screen.getByText('Test').parentElement;

    expect(card).toHaveClass('custom-class');
  });

  it('handles click events', () => {
    const handleClick = jest.fn();

    render(<Card onClick={handleClick}>Test</Card>);

    screen.getByText('Test').parentElement.click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders with no padding when specified', () => {
    render(<Card padding="none">Test</Card>);
    const card = screen.getByText('Test').parentElement;

    expect(card).not.toHaveClass('p-3', 'p-6', 'p-8', 'p-10');
  });

  it('renders with no shadow when specified', () => {
    render(<Card shadow="none">Test</Card>);
    const card = screen.getByText('Test').parentElement;

    expect(card).not.toHaveClass('shadow-sm', 'shadow-md', 'shadow-lg', 'shadow-xl');
  });
});
