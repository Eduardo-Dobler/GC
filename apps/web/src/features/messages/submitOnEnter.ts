import type { KeyboardEvent } from 'react';

export function submitOnEnter(event: KeyboardEvent<HTMLTextAreaElement>, sendOnEnter: boolean) {
  if (event.key !== 'Enter' || event.shiftKey || event.altKey || event.nativeEvent.isComposing) return;
  if (!sendOnEnter && !event.ctrlKey && !event.metaKey) return;
  event.preventDefault();
  event.currentTarget.form?.requestSubmit();
}
