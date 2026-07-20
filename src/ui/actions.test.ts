// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { createActionButton, copyToClipboard, buildGoogleAIUrl } from './actions.ts';

describe('buildGoogleAIUrl', () => {
  it('returns a Google search URL with udm=50', () => {
    const url = buildGoogleAIUrl('hello world');
    expect(url).toBe('https://www.google.com/search?udm=50&q=hello%20world');
  });

  it('encodes special characters', () => {
    const url = buildGoogleAIUrl('what is 2+2?');
    expect(url).toBe('https://www.google.com/search?udm=50&q=what%20is%202%2B2%3F');
  });

  it('handles empty string', () => {
    const url = buildGoogleAIUrl('');
    expect(url).toBe('https://www.google.com/search?udm=50&q=');
  });
});

describe('copyToClipboard', () => {
  it('returns true on success', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    const result = await copyToClipboard('test');
    expect(result).toBe(true);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test');
  });

  it('returns false when the clipboard API is unavailable', async () => {
    const original = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });

    try {
      const result = await copyToClipboard('test');
      expect(result).toBe(false);
    } finally {
      if (original) {
        Object.defineProperty(navigator, 'clipboard', original);
      }
    }
  });

  it('returns false on failure', async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    const result = await copyToClipboard('test');
    expect(result).toBe(false);
  });
});

describe('createActionButton', () => {
  it('returns a button element', () => {
    const btn = createActionButton({
      icon: '⧉',
      ariaLabel: 'Copy',
      onClick: () => {},
    });
    expect(btn.tagName).toBe('BUTTON');
  });

  it('has the action-btn CSS class', () => {
    const btn = createActionButton({
      icon: '⧉',
      ariaLabel: 'Copy',
      onClick: () => {},
    });
    expect(btn.className).toBe('action-btn');
  });

  it('defaults to type button', () => {
    const btn = createActionButton({
      icon: '⧉',
      ariaLabel: 'Copy',
      onClick: () => {},
    });
    expect(btn.type).toBe('button');
  });

  it('displays the icon', () => {
    const btn = createActionButton({
      icon: '→',
      ariaLabel: 'Go',
      onClick: () => {},
    });
    expect(btn.textContent).toBe('→');
  });

  it('has aria-label and title', () => {
    const btn = createActionButton({
      icon: '⧉',
      ariaLabel: 'Copy text',
      onClick: () => {},
    });
    expect(btn.getAttribute('aria-label')).toBe('Copy text');
    expect(btn.getAttribute('title')).toBe('Copy text');
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    const btn = createActionButton({
      icon: '⧉',
      ariaLabel: 'Copy',
      onClick,
    });
    btn.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('shows feedback icon after click when feedbackIcon is set', async () => {
    vi.useFakeTimers();
    const btn = createActionButton({
      icon: '⧉',
      feedbackIcon: '✓',
      ariaLabel: 'Copy',
      onClick: () => {},
    });
    btn.click();
    await Promise.resolve();
    expect(btn.textContent).toBe('✓');
    expect(btn.classList.contains('action-btn--feedback')).toBe(true);
    vi.useRealTimers();
  });

  it('reverts feedback icon after timeout', async () => {
    vi.useFakeTimers();
    const btn = createActionButton({
      icon: '⧉',
      feedbackIcon: '✓',
      ariaLabel: 'Copy',
      onClick: () => {},
    });
    btn.click();
    await Promise.resolve();
    expect(btn.textContent).toBe('✓');
    vi.advanceTimersByTime(1500);
    expect(btn.textContent).toBe('⧉');
    expect(btn.classList.contains('action-btn--feedback')).toBe(false);
    vi.useRealTimers();
  });

  it('resets the revert timer when clicked again before timeout', async () => {
    vi.useFakeTimers();
    const btn = createActionButton({
      icon: '⧉',
      feedbackIcon: '✓',
      ariaLabel: 'Copy',
      onClick: () => {},
    });

    btn.click();
    await Promise.resolve();
    expect(btn.textContent).toBe('✓');

    vi.advanceTimersByTime(1000);
    btn.click();
    await Promise.resolve();
    expect(btn.textContent).toBe('✓');

    vi.advanceTimersByTime(1499);
    expect(btn.textContent).toBe('✓');

    vi.advanceTimersByTime(1);
    expect(btn.textContent).toBe('⧉');
    expect(btn.classList.contains('action-btn--feedback')).toBe(false);
    vi.useRealTimers();
  });

  it('does not show feedback when feedbackIcon is not set', () => {
    const btn = createActionButton({
      icon: '→',
      ariaLabel: 'Go',
      onClick: () => {},
    });
    btn.click();
    expect(btn.textContent).toBe('→');
  });

  it('does not show success feedback when async click returns false', async () => {
    const btn = createActionButton({
      icon: '⧉',
      feedbackIcon: '✓',
      ariaLabel: 'Copy',
      onClick: () => Promise.resolve(false),
    });

    btn.click();
    await Promise.resolve();

    expect(btn.textContent).toBe('⧉');
    expect(btn.classList.contains('action-btn--feedback')).toBe(false);
  });

  it('shows error icon when async click returns false and errorIcon is set', async () => {
    vi.useFakeTimers();
    const btn = createActionButton({
      icon: '⧉',
      feedbackIcon: '✓',
      errorIcon: '✕',
      ariaLabel: 'Copy',
      onClick: () => Promise.resolve(false),
    });

    btn.click();
    await Promise.resolve();

    expect(btn.textContent).toBe('✕');
    expect(btn.classList.contains('action-btn--feedback')).toBe(false);

    vi.advanceTimersByTime(1500);
    expect(btn.textContent).toBe('⧉');
    vi.useRealTimers();
  });

  it('does not show feedback when async click rejects and errorIcon is not set', async () => {
    const btn = createActionButton({
      icon: '⧉',
      feedbackIcon: '✓',
      ariaLabel: 'Copy',
      onClick: () => Promise.reject(new Error('boom')),
    });

    btn.click();
    await Promise.resolve();

    expect(btn.textContent).toBe('⧉');
    expect(btn.classList.contains('action-btn--feedback')).toBe(false);
  });

  it('leaves button unchanged when async result is non-boolean and no feedbackIcon', async () => {
    const btn = createActionButton({
      icon: '⧉',
      errorIcon: '✕',
      ariaLabel: 'Copy',
      onClick: () => Promise.resolve('done'),
    });

    btn.click();
    await Promise.resolve();

    expect(btn.textContent).toBe('⧉');
    expect(btn.classList.contains('action-btn--feedback')).toBe(false);
  });

  it('shows feedback icon when async result is falsy non-boolean and feedbackIcon is set', async () => {
    vi.useFakeTimers();
    const btn = createActionButton({
      icon: '⧉',
      feedbackIcon: '✓',
      ariaLabel: 'Copy',
      onClick: () => Promise.resolve(null),
    });

    btn.click();
    await Promise.resolve();

    expect(btn.textContent).toBe('✓');
    expect(btn.classList.contains('action-btn--feedback')).toBe(true);

    vi.advanceTimersByTime(1500);
    expect(btn.textContent).toBe('⧉');
    expect(btn.classList.contains('action-btn--feedback')).toBe(false);
    vi.useRealTimers();
  });

  it('shows feedback when async result is non-boolean truthy and feedbackIcon is set', async () => {
    vi.useFakeTimers();
    const btn = createActionButton({
      icon: '⧉',
      feedbackIcon: '✓',
      ariaLabel: 'Copy',
      onClick: () => Promise.resolve('done'),
    });

    btn.click();
    await Promise.resolve();

    expect(btn.textContent).toBe('✓');
    expect(btn.classList.contains('action-btn--feedback')).toBe(true);

    vi.advanceTimersByTime(1500);
    expect(btn.textContent).toBe('⧉');
    expect(btn.classList.contains('action-btn--feedback')).toBe(false);
    vi.useRealTimers();
  });

  it('prevents concurrent executions of onClick', async () => {
    const onClick = vi.fn().mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 50));
    });
    const btn = createActionButton({
      icon: '⧉',
      ariaLabel: 'Copy',
      onClick,
    });

    btn.click();
    btn.click();
    btn.click();

    await Promise.resolve(); 
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('shows feedback icon when async result is undefined and feedbackIcon is set', async () => {
    vi.useFakeTimers();
    const btn = createActionButton({
      icon: '⧉',
      feedbackIcon: '✓',
      ariaLabel: 'Copy',
      onClick: () => {}, // returns undefined (void)
    });

    btn.click();
    await Promise.resolve();

    expect(btn.textContent).toBe('✓');
    expect(btn.classList.contains('action-btn--feedback')).toBe(true);

    vi.advanceTimersByTime(1500);
    expect(btn.textContent).toBe('⧉');
    expect(btn.classList.contains('action-btn--feedback')).toBe(false);
    vi.useRealTimers();
  });

  it('does not show feedback when async result is undefined and no feedbackIcon', () => {
    const btn = createActionButton({
      icon: '→',
      ariaLabel: 'Go',
      onClick: () => {}, // returns undefined (void)
    });

    btn.click();
    expect(btn.textContent).toBe('→');
  });

  it('does not show feedback on second click while first is still pending', async () => {
    vi.useFakeTimers();
    let resolveFirst!: (value: boolean) => void;
    const pending = new Promise<boolean>(resolve => { resolveFirst = resolve; });

    const btn = createActionButton({
      icon: '⧉',
      feedbackIcon: '✓',
      errorIcon: '✕',
      ariaLabel: 'Copy',
      onClick: () => pending,
    });

    btn.click();
    await Promise.resolve();

    resolveFirst!(true);
    await Promise.resolve();
    expect(btn.textContent).toBe('✓');
    expect(btn.classList.contains('action-btn--feedback')).toBe(true);

    vi.advanceTimersByTime(1501);
    expect(btn.textContent).toBe('⧉');
    expect(btn.classList.contains('action-btn--feedback')).toBe(false);

    btn.click();
    await Promise.resolve();
    expect(btn.textContent).toBe('✓');
    expect(btn.classList.contains('action-btn--feedback')).toBe(true);

    vi.useRealTimers();
  });

  it('does not show success feedback when the click action rejects', async () => {
    const btn = createActionButton({
      icon: '⧉',
      feedbackIcon: '✓',
      ariaLabel: 'Copy',
      onClick: () => Promise.reject(new Error('boom')),
    });

    btn.click();
    await Promise.resolve();

    expect(btn.textContent).toBe('⧉');
    expect(btn.classList.contains('action-btn--feedback')).toBe(false);
  });

  it('shows error icon when click action rejects', async () => {
    const btn = createActionButton({
      icon: '⧉',
      errorIcon: '✕',
      ariaLabel: 'Copy',
      onClick: () => Promise.reject(new Error('boom')),
    });

    btn.click();
    await Promise.resolve();

    expect(btn.textContent).toBe('✕');
  });

  it('reverts error icon after timeout', async () => {
    vi.useFakeTimers();
    const btn = createActionButton({
      icon: '⧉',
      errorIcon: '✕',
      ariaLabel: 'Copy',
      onClick: () => Promise.reject(new Error('boom')),
    });

    btn.click();
    await Promise.resolve();
    expect(btn.textContent).toBe('✕');

    vi.advanceTimersByTime(1500);
    expect(btn.textContent).toBe('⧉');
    vi.useRealTimers();
  });

  it('does not add feedback class when error icon is shown', async () => {
    const btn = createActionButton({
      icon: '⧉',
      errorIcon: '✕',
      ariaLabel: 'Copy',
      onClick: () => Promise.reject(new Error('boom')),
    });

    btn.click();
    await Promise.resolve();

    expect(btn.textContent).toBe('✕');
    expect(btn.classList.contains('action-btn--feedback')).toBe(false);
  });

  it('shows error icon (not feedback) when both are set and action rejects', async () => {
    vi.useFakeTimers();
    const btn = createActionButton({
      icon: '⧉',
      feedbackIcon: '✓',
      errorIcon: '✕',
      ariaLabel: 'Copy',
      onClick: () => Promise.reject(new Error('boom')),
    });

    btn.click();
    await Promise.resolve();

    expect(btn.textContent).toBe('✕');
    expect(btn.classList.contains('action-btn--feedback')).toBe(false);

    vi.advanceTimersByTime(1500);
    expect(btn.textContent).toBe('⧉');
    expect(btn.classList.contains('action-btn--feedback')).toBe(false);

    vi.useRealTimers();
  });
});
