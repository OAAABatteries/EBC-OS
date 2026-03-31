import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FieldInput } from './FieldInput';
import { FieldSelect } from './FieldSelect';

describe('FieldInput', () => {
  it('renders an input with className containing "form-input field-input focus-visible"', () => {
    const { container } = render(<FieldInput />);
    const input = container.querySelector('input');
    expect(input.className).toContain('form-input');
    expect(input.className).toContain('field-input');
    expect(input.className).toContain('focus-visible');
  });

  it('renders a label with className "form-label" when label prop is provided', () => {
    const { container } = render(<FieldInput label="Quantity" />);
    const label = container.querySelector('label');
    expect(label).not.toBeNull();
    expect(label.className).toContain('form-label');
    expect(label.textContent).toBe('Quantity');
  });

  it('passes inputMode prop through to the input element inputMode attribute', () => {
    const { container } = render(<FieldInput inputMode="numeric" />);
    const input = container.querySelector('input');
    expect(input).toHaveAttribute('inputMode', 'numeric');
  });

  it('with error=true adds "field-input-error" class to the input', () => {
    const { container } = render(<FieldInput error={true} />);
    const input = container.querySelector('input');
    expect(input.className).toContain('field-input-error');
  });

  it('with errorMessage renders a div with class "field-input-error-msg" and the error text', () => {
    const { container } = render(<FieldInput error={true} errorMessage="Required field" />);
    const errDiv = container.querySelector('.field-input-error-msg');
    expect(errDiv).not.toBeNull();
    expect(errDiv.textContent).toBe('Required field');
  });

  it('passes placeholder, value, onChange to underlying input', () => {
    const handleChange = vi.fn();
    const { container } = render(
      <FieldInput placeholder="Enter value" value="test" onChange={handleChange} />
    );
    const input = container.querySelector('input');
    expect(input).toHaveAttribute('placeholder', 'Enter value');
    expect(input).toHaveValue('test');
  });

  it('with disabled=true renders a disabled input with opacity style', () => {
    const { container } = render(<FieldInput disabled={true} />);
    const input = container.querySelector('input');
    expect(input).toBeDisabled();
    expect(input.style.opacity).toBe('0.45');
  });
});

describe('FieldSelect', () => {
  it('renders a select element with className containing "form-select field-select focus-visible"', () => {
    const { container } = render(<FieldSelect />);
    const select = container.querySelector('select');
    expect(select.className).toContain('form-select');
    expect(select.className).toContain('field-select');
    expect(select.className).toContain('focus-visible');
  });

  it('renders children (option elements) inside select', () => {
    const { container } = render(
      <FieldSelect>
        <option value="a">Option A</option>
        <option value="b">Option B</option>
      </FieldSelect>
    );
    const options = container.querySelectorAll('option');
    expect(options).toHaveLength(2);
    expect(options[0].textContent).toBe('Option A');
  });

  it('renders a label when label prop is provided', () => {
    const { container } = render(<FieldSelect label="Category"><option value="">All</option></FieldSelect>);
    const label = container.querySelector('label');
    expect(label).not.toBeNull();
    expect(label.className).toContain('form-label');
    expect(label.textContent).toBe('Category');
  });
});
