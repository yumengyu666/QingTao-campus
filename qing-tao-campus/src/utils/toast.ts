import toast from 'react-hot-toast';

export const showSuccess = (msg: string) => toast.success(msg, { duration: 2000 });
export const showError = (msg: string) => toast.error(msg, { duration: 3000 });
export const showLoading = (msg: string) => toast.loading(msg);
export const dismissToast = (id?: string) => toast.dismiss(id);
