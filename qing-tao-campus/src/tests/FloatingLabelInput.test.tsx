import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { FloatingLabelInput } from '@/components/ui/FloatingLabelInput';

describe('FloatingLabelInput', () => {
  it('renders with label text', () => {
    render(
      <FloatingLabelInput label="用户名" value="" onChange={() => {}} />,
    );
    expect(screen.getByText(/用户名/)).toBeInTheDocument();
  });

  it('shows required indicator when required=true', () => {
    render(
      <FloatingLabelInput label="用户名" value="" onChange={() => {}} required />,
    );
    expect(screen.getByText(/\*/)).toBeInTheDocument();
  });

  it('displays the current input value', () => {
    render(
      <FloatingLabelInput label="用户名" value="test123" onChange={() => {}} />,
    );
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('test123');
  });

  it('calls onChange when user types', async () => {
    const user = userEvent.setup();
    function Wrapper() {
      const [val, setVal] = useState('');
      return <FloatingLabelInput label="用户名" value={val} onChange={setVal} />;
    }
    const { getByRole } = render(<Wrapper />);
    const input = getByRole('textbox') as HTMLInputElement;
    await user.type(input, 'hello');
    expect(input.value).toBe('hello');
  });

  it('shows error message when error prop is set', () => {
    render(
      <FloatingLabelInput label="邮箱" value="" onChange={() => {}} error="请输入有效邮箱" />,
    );
    expect(screen.getByText('请输入有效邮箱')).toBeInTheDocument();
  });

  it('applies error styling when error is set', () => {
    render(
      <FloatingLabelInput label="邮箱" value="" onChange={() => {}} error="错误" />,
    );
    const input = screen.getByRole('textbox');
    expect(input.className).toContain('border-red-400');
    const label = screen.getByText(/邮箱/);
    expect(label.className).toContain('text-red-500');
  });

  it('supports password type', () => {
    render(
      <FloatingLabelInput label="密码" value="" onChange={() => {}} type="password" />,
    );
    const passwordInput = document.querySelector('input[type="password"]') as HTMLInputElement;
    expect(passwordInput).toBeTruthy();
  });

  it('enforces maxLength', () => {
    render(
      <FloatingLabelInput label="昵称" value="" onChange={() => {}} maxLength={20} />,
    );
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.maxLength).toBe(20);
  });
});
