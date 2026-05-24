export function isMissingCallLogTableApiError(error: unknown) {
  const apiError = error as {
    response?: {
      status?: number;
      data?: {
        message?: unknown;
      };
    };
  };

  const message = String(apiError?.response?.data?.message || '');

  return (
    apiError?.response?.status === 500 &&
    message.includes('CallLog') &&
    message.includes('does not exist')
  );
}
