import toast from 'react-hot-toast';

export function useToast() {
  const showSuccess = (message: string) => {
    toast.success(message, {
      style: {
        background: '#1e293b',
        color: '#f8fafc',
        border: '1px solid #334155',
      },
      iconTheme: {
        primary: '#22c55e',
        secondary: '#f8fafc',
      },
    });
  };

  const showError = (message: string) => {
    toast.error(message, {
      style: {
        background: '#1e293b',
        color: '#f8fafc',
        border: '1px solid #334155',
      },
      iconTheme: {
        primary: '#ef4444',
        secondary: '#f8fafc',
      },
    });
  };

  return { showSuccess, showError };
}
