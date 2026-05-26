const CHAT_TABLES = ['ChatRoom', 'ChatParticipant', 'ChatMessage'];

export function isMissingChatTableApiError(error: unknown) {
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
    message.includes('does not exist') &&
    CHAT_TABLES.some((table) => message.includes(table))
  );
}
