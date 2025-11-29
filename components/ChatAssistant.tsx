import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User as UserIcon, Loader2, Sparkles, X } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { User, ChatMessage, Resident } from '../types';
import { MASTER_PROMPT } from '../constants';

interface ChatAssistantProps {
  user: User;
  mockResidents: Resident[];
  onClose: () => void;
}

const ChatAssistant: React.FC<ChatAssistantProps> = ({ user, mockResidents, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: `Hola ${user.name}. Soy tu asistente de seguridad. Estoy configurado para el tenant ${user.tenantId} con permisos de Rol ${user.role}. ¿En qué puedo ayudarte hoy?`,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !process.env.API_KEY) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Inject context about current state
      const contextPrompt = `
        CONTEXTO ACTUAL DEL SISTEMA:
        - Tenant ID: ${user.tenantId}
        - Usuario Actual: ${user.name} (Rol: ${user.role})
        - Datos de Residentes (JSON simplificado): ${JSON.stringify(mockResidents)}
        
        INSTRUCCIÓN DEL USUARIO:
        ${input}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contextPrompt,
        config: {
          systemInstruction: MASTER_PROMPT,
        }
      });

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text || "Lo siento, no pude procesar tu solicitud.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error("Error generating content:", error);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "Error de conexión con el sistema de IA. Por favor verifica tu API Key.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={20} className="text-yellow-300" />
          <h3 className="font-semibold">Asistente IA</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-white/20 px-2 py-1 rounded hidden sm:block">Gemini 2.5 Flash</span>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-md transition-colors text-white"
            title="Cerrar asistente"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center shrink-0
              ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-purple-600 text-white'}
            `}>
              {msg.role === 'user' ? <UserIcon size={14} /> : <Bot size={14} />}
            </div>
            <div className={`
              max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
              ${msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm'}
            `}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-gray-500 text-xs ml-10">
            <Loader2 className="animate-spin" size={14} />
            <span>Analizando solicitud...</span>
          </div>
        )}
      </div>

      <div className="p-4 bg-white border-t border-gray-100">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Escribe una instrucción..."
            className="flex-1 px-4 py-2 bg-gray-100 rounded-full border-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all text-sm outline-none"
            disabled={!process.env.API_KEY}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim() || !process.env.API_KEY}
            className="p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
        {!process.env.API_KEY && (
           <p className="text-xs text-red-500 mt-2 text-center">API Key no configurada.</p>
        )}
      </div>
    </div>
  );
};

export default ChatAssistant;