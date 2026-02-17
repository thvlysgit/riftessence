import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ChatContextType {
  openConversation: (userId: string) => void;
  closeChat: () => void;
  conversationToOpen: { userId: string; timestamp: number } | null;
  clearConversationToOpen: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [conversationToOpen, setConversationToOpen] = useState<{ userId: string; timestamp: number } | null>(null);

  const openConversation = (userId: string) => {
    console.log('[ChatContext] openConversation called with userId:', userId);
    // Always create a new object with timestamp to force re-trigger even for same user
    setConversationToOpen({ userId, timestamp: Date.now() });
  };

  const closeChat = () => {
    setConversationToOpen(null);
  };

  const clearConversationToOpen = () => {
    setConversationToOpen(null);
  };

  return (
    <ChatContext.Provider value={{ openConversation, closeChat, conversationToOpen, clearConversationToOpen }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
