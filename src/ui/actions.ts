export interface ActionButtonOptions {
  icon: string;
  feedbackIcon?: string;
  errorIcon?: string;
  ariaLabel: string;
  durationMs?: number;
  onClick: () => void | Promise<boolean>;
}

export function createActionButton(options: ActionButtonOptions): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'action-btn';
  btn.type = 'button';
  btn.textContent = options.icon;
  btn.setAttribute('aria-label', options.ariaLabel);
  btn.setAttribute('title', options.ariaLabel);

  let revertTimer: ReturnType<typeof setTimeout> | null = null;
  let isRunning = false;

  function resetState(): void {
    if (revertTimer !== null) {
      clearTimeout(revertTimer);
      revertTimer = null;
    }
    btn.textContent = options.icon;
    btn.classList.remove('action-btn--feedback');
  }

  function showIcon(icon: string, addFeedbackClass?: boolean): void {
    if (icon !== options.icon) {
      btn.textContent = icon;
      if (addFeedbackClass) {
        btn.classList.add('action-btn--feedback');
      }
      revertTimer = setTimeout(() => {
        btn.textContent = options.icon;
        btn.classList.remove('action-btn--feedback');
        revertTimer = null;
      }, options.durationMs ?? 1500);
    } else if (!addFeedbackClass) {
      btn.classList.remove('action-btn--feedback');
    }
  }

  function handleResult(result: unknown): void {
    if (typeof result === 'boolean' && !result) {
      showIcon(options.errorIcon ?? options.icon, false);
    } else if (options.feedbackIcon) {
      showIcon(options.feedbackIcon, true);
    }
  }

  btn.addEventListener('click', async () => {
    if (isRunning) return;
    isRunning = true;
    resetState();

    try {
      const result = await options.onClick();
      handleResult(result);
    } catch {
      showIcon(options.errorIcon ?? options.icon, false);
    } finally {
      isRunning = false;
    }
  });
  return btn;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function buildGoogleAIUrl(query: string): string {
  return 'https://www.google.com/search?udm=50&q=' + encodeURIComponent(query);
}
