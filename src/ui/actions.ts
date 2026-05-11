export interface ActionButtonOptions {
  icon: string;
  feedbackIcon?: string;
  errorIcon?: string;
  ariaLabel: string;
  onClick: () => void | Promise<boolean>;
}

export function createActionButton(options: ActionButtonOptions): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'action-btn';
  btn.textContent = options.icon;
  btn.setAttribute('aria-label', options.ariaLabel);
  btn.setAttribute('title', options.ariaLabel);

  let revertTimer: ReturnType<typeof setTimeout> | null = null;

  btn.addEventListener('click', async () => {
    if (revertTimer !== null) {
      clearTimeout(revertTimer);
      revertTimer = null;
    }
    btn.textContent = options.icon;
    btn.classList.remove('action-btn--feedback');

    try {
      const result = await options.onClick();
      if (options.feedbackIcon && result !== false) {
        btn.textContent = options.feedbackIcon;
        btn.classList.add('action-btn--feedback');
        revertTimer = setTimeout(() => {
          btn.textContent = options.icon;
          btn.classList.remove('action-btn--feedback');
          revertTimer = null;
        }, 1500);
      }
    } catch {
      if (options.errorIcon) {
        btn.textContent = options.errorIcon;
        revertTimer = setTimeout(() => {
          btn.textContent = options.icon;
          revertTimer = null;
        }, 1500);
      }
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