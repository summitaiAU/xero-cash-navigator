/**
 * Format currency for mobile display
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Copy text to clipboard with toast feedback
 */
export const copyToClipboard = async (text: string, toast: any) => {
  try {
    await navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: `"${text}" copied to clipboard`,
      duration: 2000,
    });
  } catch (err) {
    toast({
      title: 'Copy Failed',
      description: 'Could not copy to clipboard',
      variant: 'destructive',
      duration: 2000,
    });
  }
};
