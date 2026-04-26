import { toast } from 'sonner';
import { HttpError } from './errors';

export const toastRequestError = (err: unknown, fallback = 'Request failed'): void => {
  if (err instanceof HttpError) {
    if (err.status === 401) {
      toast.error('Please sign in.');
      return;
    }
    if (err.status === 403) {
      toast.error('You do not have access.');
      return;
    }
    if (err.status === 409) {
      toast.error(err.body?.message ?? 'Conflict — operation rejected.');
      return;
    }
    if (err.status === 400) {
      toast.error(err.body?.message ?? 'Validation failed.');
      return;
    }
    if (err.status >= 500) {
      toast.error('Server error. Try again.');
      return;
    }
    toast.error(err.body?.message ?? fallback);
    return;
  }
  if (err instanceof Error) {
    toast.error(err.message || fallback);
    return;
  }
  toast.error(fallback);
};
