import { describe, it, expect, beforeEach } from 'vitest';
import { useUnreadStore } from '@/stores/unreadStore';

beforeEach(() => {
  useUnreadStore.setState({ count: 0, msgCount: 0 });
});

describe('useUnreadStore', () => {
  it('starts with zero counts', () => {
    const state = useUnreadStore.getState();
    expect(state.count).toBe(0);
    expect(state.msgCount).toBe(0);
  });

  it('setCount accepts a number', () => {
    useUnreadStore.getState().setCount(5);
    expect(useUnreadStore.getState().count).toBe(5);
  });

  it('setCount accepts an updater function', () => {
    useUnreadStore.getState().setCount(3);
    useUnreadStore.getState().setCount((prev) => prev + 2);
    expect(useUnreadStore.getState().count).toBe(5);
  });

  it('setMsgCount works with both value and function', () => {
    useUnreadStore.getState().setMsgCount(10);
    expect(useUnreadStore.getState().msgCount).toBe(10);
    useUnreadStore.getState().setMsgCount((prev) => prev - 3);
    expect(useUnreadStore.getState().msgCount).toBe(7);
  });

  it('decrement reduces count but not below 0', () => {
    useUnreadStore.getState().setCount(2);
    useUnreadStore.getState().decrement();
    expect(useUnreadStore.getState().count).toBe(1);
    useUnreadStore.getState().decrement();
    expect(useUnreadStore.getState().count).toBe(0);
    useUnreadStore.getState().decrement();
    expect(useUnreadStore.getState().count).toBe(0);
  });

  it('reset clears all counts', () => {
    useUnreadStore.getState().setCount(7);
    useUnreadStore.getState().setMsgCount(3);
    useUnreadStore.getState().reset();
    expect(useUnreadStore.getState().count).toBe(0);
    expect(useUnreadStore.getState().msgCount).toBe(0);
  });
});
