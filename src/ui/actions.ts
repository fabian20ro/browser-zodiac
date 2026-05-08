export interface ActionButtonOptions {
  icon: string;
  feedbackIcon?: string;
  ariaLabel: string;
  onClick: () => void | Promise<boolean>;
}

export function createActionButton(options: ActionButtonOptions): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'action-btn';
  btn.textContent = options.icon;
  btn.setAttribute('aria-label', options.ariaLabel);
  btn.setAttribute('title', options.ariaLabel);
  btn.addEventListener('click', async () => {
    try {
      const result = await options.onClick();
      if (options.feedbackIcon && result !== false) {
        btn.textContent = options.feedbackIcon;
        btn.classList.add('action-btn--feedback');
        setTimeout(() => {
          btn.textContent = options.icon;
          btn.classList.remove('action-btn--feedback');
        }, 1500);
      }
    } catch {
      // Keep the control stable if the action fails.
    }
  });
  return btn;
}

export function copyToClipboard(text: string): Promise<boolean> {
  return navigator.clipboard.writeText(text).then(
    () => true,
    () => false,
  );
}

export function buildGoogleAIUrl(query: string): string {
  return 'https://www.google.com/search?udm=50&q=' + encodeURIComponent(query);
}
