"use client";

import React, { useState } from 'react';


const keywordResponses = [
  {
    keywords: ['hi', 'hello', 'hey'],
    bot: 'Hello! How can I assist you today? You can ask about face recognition, authentication, or student services.'
  },
  {
    keywords: ['face recognition', 'facial recognition', 'face id'],
    bot: 'Face recognition is a technology that identifies or verifies a person from a digital image or video frame. Would you like to know about its accuracy or how it works in our system?'
  },
  {
    keywords: ['accuracy', 'accurate'],
    bot: 'Modern face recognition systems can be highly accurate, especially with good training data and lighting conditions. Do you want to know more about security or privacy?'
  },
  {
    keywords: ['student number', 'id', '20876916'],
    bot: 'Your student number is used for identification. If you want to verify your identity, you can use face recognition or email authentication.'
  },
  {
    keywords: ['help', 'support', 'assist'],
    bot: 'I am here to help! You can ask about document requests, authentication methods, or face recognition.'
  },
  {
    keywords: ['document', 'request', 'transcript', 'certificate'],
    bot: 'To request a document, please specify the type (e.g., transcript, certificate) and your preferred authentication method.'
  },
];

export default function ChatbotPage() {
  const [messages, setMessages] = useState<{ sender: string; text: string }[]>([]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages([...messages, { sender: 'user', text: input }]);
    const lowerInput = input.toLowerCase();
    let response = "I'm sorry, I didn't understand that. Can you rephrase or ask about face recognition, authentication, or document requests?";
    for (const item of keywordResponses) {
      if (item.keywords.some(keyword => lowerInput.includes(keyword))) {
        response = item.bot;
        break;
      }
    }
    setTimeout(() => {
      setMessages(msgs => [
        ...msgs,
        { sender: 'bot', text: response },
      ]);
    }, 500);
    setInput('');
  };

  return (
    <div id="chatbot-container" style={{ maxWidth: 400, margin: '40px auto', padding: 20, border: '1px solid #eee', borderRadius: 8 }}>
      <h2>Chatbot</h2>
      <form id="chatbot-form" onSubmit={e => { e.preventDefault(); handleSend(); }}>
        <div id="chatbot-messages" style={{ minHeight: 200, marginBottom: 16 }}>
          {messages.map((msg, idx) => (
            <div key={idx} style={{ textAlign: msg.sender === 'user' ? 'right' : 'left', margin: '8px 0' }}>
              <span style={{ background: msg.sender === 'user' ? '#d1e7dd' : '#f8d7da', padding: '6px 12px', borderRadius: 6 }}>
                {msg.text}
              </span>
            </div>
          ))}
        </div>
        <input
          id="chatbot-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Type your message..."
          style={{ width: '80%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
          autoComplete="off"
        />
        <button id="chatbot-send" type="submit" style={{ marginLeft: 8, padding: '8px 16px', borderRadius: 4 }}>Send</button>
      </form>
    </div>
  );
}
