import React, { useEffect, useState, useRef } from 'react';
import provider from '../../core/provider';
import { MessageThread, Message, Student } from '../../core/types';
import { Send, User } from 'lucide-react';

const AppMessages: React.FC = () => {
  const [student, setStudent] = useState<Student | null>(null);
  const [thread, setThread] = useState<MessageThread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      const students = await provider.getStudents();
      const currentStudent = students[0];
      setStudent(currentStudent);

      if (currentStudent) {
        // Automatically find or create thread with teacher
        const myThread = await provider.getThreadByStudent(currentStudent.id);
        setThread(myThread);
        loadMessages(myThread.id);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (thread) {
       const interval = setInterval(() => loadMessages(thread.id), 3000);
       return () => clearInterval(interval);
    }
  }, [thread]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async (threadId: string) => {
    const list = await provider.getMessages(threadId);
    setMessages(list);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !thread) return;
    
    // Defaulting to PARENT role for simpler UX in this demo
    await provider.sendMessage(thread.id, 'PARENT', input);
    setInput('');
    loadMessages(thread.id);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (!student) return <div className="p-6 text-center">Đang tải...</div>;

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-140px)] flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center bg-blue-600 text-white">
        <div className="bg-white bg-opacity-20 p-2 rounded-full mr-3">
          <User size={20} />
        </div>
        <div>
          <h3 className="font-bold text-lg">GVCN: {JSON.parse(thread?.participantsJson || '{}').teacherName}</h3>
          <p className="text-xs opacity-80">Trao đổi thông tin về em {student.fullName}</p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-10">
            Hãy gửi tin nhắn đầu tiên cho giáo viên chủ nhiệm.
          </div>
        )}
        {messages.map(msg => {
          const isMe = msg.fromRole === 'PARENT' || msg.fromRole === 'STUDENT';
          const label = msg.fromRole === 'TEACHER' ? 'GVCN' : (msg.fromRole === 'PARENT' ? 'PH' : 'HS');
          
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-lg px-4 py-2 shadow-sm ${isMe ? 'bg-indigo-600 text-white' : 'bg-white text-gray-800 border border-gray-200'}`}>
                {!isMe && <p className="text-[10px] font-bold text-blue-600 mb-0.5">{label}</p>}
                <p className="text-sm">{msg.content}</p>
                <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-indigo-200' : 'text-gray-400'}`}>
                  {new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <form onSubmit={handleSend} className="flex gap-2">
          <input 
            type="text" 
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Nhập tin nhắn..."
            className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:border-indigo-500"
          />
          <button 
            type="submit" 
            disabled={!input.trim()}
            className="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 disabled:opacity-50"
          >
            <Send size={20} className="ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AppMessages;