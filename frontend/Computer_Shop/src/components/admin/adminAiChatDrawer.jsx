import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Database, Terminal, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { executeAgentQuery } from '../../services/aiService';
import LoadingSpinner from '../common/LoadingSpinner/LoadingSpinner';


const AdminAiChatDrawer = ({ isOpen, onClose }) => {
  const { theme } = useTheme();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello Admin! I am your Rugenx SQL Data Assistant. Ask me anything about today's sales, inventory records, or user analytics metrics, and I'll query the live database for you.",
    }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  if (!isOpen) return null;

  const apiKey = import.meta.env.REACT_APP_GOOGLE_GEMINI_API_KEY; 
  const targetUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  // Step 1: Tell the LLM to think about the question and generate clean SQL
  const generateSqlWithLLM = async (userPrompt) => {
    const schemaContextInstructions = `
      You are an absolute expert data science assistant attached to an e-commerce platform.
      Your sole task is to translate user natural language queries into executable MySQL select statements.
      
      Database Schema Reference Layout maps:
      1. Table: "orders" -> Columns: [order_id (UUID), total_amount (DECIMAL), discount_amount, final_amount, status (STRING: 'PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'), payment_method, created_at (DATETIME)]
      2. Table: "products" -> Columns: [product_id, name, sku, stock_quantity (INT), price, low_stock_threshold (INT)]
      3. Table: "users" -> Columns: [user_id, email, role (STRING: 'CUSTOMER', 'ADMIN')]
      
      Operational Rules:
      - Output ONLY the clean, raw SQL text code inside your response message.
      - Never include markdown ticks (\`\`\`) or words like "sql" inside the response content block.
      - Only output read-only SELECT statement blocks.
    `;

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: `${schemaContextInstructions}\n\nUser request: ${userPrompt}` }] }]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData?.error?.message || `HTTP error! Status: ${response.status}`);
    }

    const jsonPayload = await response.json();
    console.log("Raw Gemini API SQL Gen Response:", jsonPayload);

    const rawAiTextResponse = jsonPayload?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawAiTextResponse) throw new Error("LLM failed to yield clean query statement tokens.");
    
    return rawAiTextResponse.trim();
  };

  // Step 2: Take the raw DB numbers and have the LLM explain them like a human conversation
  const generateFinalMessage = async (userOriginalPrompt, sqlQueryUsed, rawDatabaseData) => {
    const synthesisInstructions = `
      You are an executive business analyst assistant. Take the raw JSON database results provided below and use them to directly answer the user's original question in a polite, professional, conversational sentence.
      
      Context Guidelines:
      - Present money values formatted clearly as "Rs. X".
      - Be direct and concise. Do not mention table names, columns, or technical database jargon.
    `;

    const dynamicPrompt = `
      User Original Question: "${userOriginalPrompt}"
      SQL Query Executed: "${sqlQueryUsed}"
      Raw Database Output Data Payload: ${JSON.stringify(rawDatabaseData)}
    `;

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: `${synthesisInstructions}\n\n${dynamicPrompt}` }] }]
      })
    });

    if (!response.ok) return "Here is the raw data loaded from your system metrics logs:";
    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Query completed successfully.";
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userMessage = input.trim();
    setInput('');
    
    setMessages(prev => [...prev, { id: Math.random().toString(), role: 'user', content: userMessage }]);
    setIsProcessing(true);

    try {
      // 1. Convert words into SQL
      setProcessingStatus('Analyzing metrics criteria...');
      const generatedQuery = await generateSqlWithLLM(userMessage);

      // 2. Query the live database
      setProcessingStatus('Running database calculations...');
      const rawDatabaseData = await executeAgentQuery(generatedQuery);
      const formattedResultString = Array.isArray(rawDatabaseData) && rawDatabaseData.length > 0
        ? JSON.stringify(rawDatabaseData, null, 2)
        : "[]";

      // 3. Translate raw database vectors back into a beautiful conversational sentence
      setProcessingStatus('Structuring natural response...');
      const conversationalAnswer = await generateFinalMessage(userMessage, generatedQuery, rawDatabaseData);

      // 4. Update the chat window interface
      setMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          role: 'assistant',
          content: conversationalAnswer, 
        }
      ]);

    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: Math.random().toString(),
          role: 'assistant',
          content: `I encountered an issue processing that dashboard metric request.`,
          isError: true,
          errorTrace: err.message
        }
      ]);
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200 animate-slide-in">
      
      {/* Header Panel Grid Nodes */}
      <div className="p-4 bg-gray-900 text-white flex items-center justify-between shadow-md border-b border-gray-800">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-blue-600 rounded-lg text-white">
            <Sparkles size={18} className="animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-wide">Rugenx Autonomous AI Agent</h2>
            <p className="text-[10px] text-gray-400 font-mono flex items-center">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block mr-1 animate-ping"></span>
              Conversational Engine Online
            </p>
          </div>
        </div>
        
        {/* Close Drawer Interaction Trigger */}
        <button 
          onClick={onClose} 
          className="p-1.5 bg-gray-800 hover:bg-red-600 text-gray-200 hover:text-white rounded-lg border border-gray-700 transition-all shadow-sm flex items-center justify-center gap-1 group"
          title="Close AI Assistant Panel"
          aria-label="Close Assistant Drawer"
        >
          <X size={16} className="transition-transform group-hover:rotate-90" />
          <span className="text-[10px] font-bold tracking-wider uppercase pr-0.5">Close</span>
        </button>
      </div>

      {/* Message Output View Streaming Feed Terminal */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] rounded-lg p-3 text-xs leading-relaxed shadow-sm ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white font-medium rounded-br-none' 
                : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
            }`}>
              {msg.content}
            </div>

            {/* Collapsible/Secondary Developer diagnostics block */}
            {msg.sql && (
              <div className="w-[90%] mt-2 bg-gray-900 rounded-md overflow-hidden border border-gray-800 shadow-inner opacity-75 hover:opacity-100 transition-opacity">
                <div className="bg-gray-800 px-3 py-1 flex items-center justify-between text-[10px] font-mono text-gray-400 border-b border-gray-700">
                  <span className="flex items-center gap-1"><Terminal size={12} className="text-yellow-500" /> Inspected Query</span>
                  <span className="text-green-400 flex items-center gap-0.5"><CheckCircle2 size={10} /> Live Synced</span>
                </div>
                <pre className="p-2.5 text-[10px] font-mono text-yellow-400 overflow-x-auto whitespace-pre-wrap leading-normal">
                  {msg.sql}
                </pre>
              </div>
            )}

            {msg.dataPayload && (
              <div className="w-[90%] mt-1 bg-gray-950 rounded-md overflow-hidden border border-gray-800 opacity-60 hover:opacity-100 transition-opacity">
                <pre className="p-2.5 text-[9px] font-mono text-green-400 overflow-x-auto whitespace-pre max-h-32 overflow-y-auto">
                  {msg.dataPayload}
                </pre>
              </div>
            )}

            {msg.isError && (
              <div className="w-[90%] mt-2 bg-red-50 border border-red-200 rounded-md p-3 flex items-start gap-2">
                <ShieldAlert size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-[11px] text-red-800">
                  <span className="font-bold block mb-0.5">Pipeline Boundary Error</span>
                  <p className="font-mono break-all leading-normal">{msg.errorTrace}</p>
                </div>
              </div>
            )}
          </div>
        ))}

        {isProcessing && (
          <div className="flex items-center space-x-2 text-xs text-gray-500 bg-white p-3 rounded-lg border border-gray-100 max-w-[220px] shadow-sm">
            <LoadingSpinner size="small" />
            <span className="font-medium font-mono animate-pulse text-[11px]">{processingStatus}</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Action Form Input Panel Node */}
      <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-200 flex items-center gap-2 shadow-inner">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask database assistant... (e.g. 'How many users are registered?')"
          className="flex-1 border rounded-lg px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-600 font-medium"
          disabled={isProcessing}
        />
        <button
          type="submit"
          disabled={!input.trim() || isProcessing}
          className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow disabled:bg-gray-300"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};

export default AdminAiChatDrawer;