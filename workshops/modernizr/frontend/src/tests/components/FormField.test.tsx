import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import FormField from '../../components/FormField';

describe('FormField', () => {
  const defaultProps = {
    label: 'Test Field',
    name: 'testField',
    value: '',
    onChange: jest.fn(),
    onBlur: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render input field with label', () => {
    render(<FormField {...defaultProps} />);

    expect(screen.getByLabelText('Test Field')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  test('should render with placeholder', () => {
    render(<FormField {...defaultProps} placeholder="Enter value" />);

    expect(screen.getByPlaceholderText('Enter value')).toBeInTheDocument();
  });

  test('should render as required field', () => {
    render(<FormField {...defaultProps} required />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('required');
  });

  test('should render different input types', () => {
    const { rerender } = render(<FormField {...defaultProps} type="password" />);
    expect(screen.getByLabelText('Test Field')).toHaveAttribute('type', 'password');

    rerender(<FormField {...defaultProps} type="email" />);
    expect(screen.getByLabelText('Test Field')).toHaveAttribute('type', 'email');

    rerender(<FormField {...defaultProps} type="number" />);
    expect(screen.getByLabelText('Test Field')).toHaveAttribute('type', 'number');
  });

  test('should call onChange when input value changes', () => {
    const onChange = jest.fn();
    render(<FormField {...defaultProps} onChange={onChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'new value' } });

    expect(onChange).toHaveBeenCalledWith('testField', 'new value');
  });

  test('should call onBlur when input loses focus', () => {
    const onBlur = jest.fn();
    render(<FormField {...defaultProps} onBlur={onBlur} />);

    const input = screen.getByRole('textbox');
    fireEvent.blur(input);

    expect(onBlur).toHaveBeenCalledWith('testField');
  });

  test('should be disabled when disabled prop is true', () => {
    render(<FormField {...defaultProps} disabled />);

    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  test('should handle number input type correctly', () => {
    const onChange = jest.fn();
    render(<FormField {...defaultProps} type="number" onChange={onChange} />);

    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '123' } });

    expect(onChange).toHaveBeenCalledWith('testField', 123);
  });

  test('should handle autoComplete attribute', () => {
    render(<FormField {...defaultProps} autoComplete="email" />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('autocomplete', 'email');
  });

  test('should render help text when provided', () => {
    render(<FormField {...defaultProps} helpText="This is help text" />);

    expect(screen.getByText('This is help text')).toBeInTheDocument();
  });
});